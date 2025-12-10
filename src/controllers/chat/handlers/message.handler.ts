import { Server } from 'socket.io';
import { Types } from 'mongoose';
import chatService from '../../../services/chat.service.js';
import userSyncService from '../../../services/userSync.service.js';
import conversationService from '../../../services/conversation.service.js';
import messageService from '../../../services/message.service.js';
import floodProtectionService from '../../../services/floodProtection.service.js';
import { actionsService } from '../../../services/actions.service.js';
import Ticket from '../../../models/Ticket.js';
import Conversation from '../../../models/Conversation.js';
import {
  IAuthenticatedSocket,
  ISupportContext,
} from '../../../../@types/controllers/chat.controller.d.js';

export async function handleMessage(
  io: Server,
  socket: IAuthenticatedSocket,
  content: string,
  supportContext?: ISupportContext,
  imageUrl?: string,
  messageType?: 'text' | 'image',
  metadata?: any,
) {
  if (!socket.userId || !socket.livechatUserId) {
    socket.emit('error', { message: 'Usuário não autenticado' });
    return;
  }

  if (supportContext) {
    socket.supportContext = supportContext;
  }

  try {
    const currentUser = await userSyncService.findUserByExternalId(
      socket.userId,
    );
    if (!currentUser) {
      socket.emit('error', { message: 'Usuário não encontrado' });
      return;
    }

    // Admins não podem ser banidos
    if (currentUser.isBanned && socket.userRole !== 'admin') {
      socket.emit('error', {
        message: 'user_banned',
        details: 'Você foi temporariamente banido. O time humano foi acionado.',
        bannedUntil: currentUser.bannedUntil,
      });
      return;
    }

    // Criar ou buscar conversa existente
    // Se não houver conversationId no socket, criar uma nova conversa
    let conversationObjectId: Types.ObjectId | undefined;
    const hadConversationId =
      socket.conversationId && Types.ObjectId.isValid(socket.conversationId);

    if (hadConversationId) {
      conversationObjectId = new Types.ObjectId(socket.conversationId);
    }

    const conversation = await conversationService.findOrCreateConversation(
      conversationObjectId,
      socket.livechatUserId,
    );

    // Atualizar conversationId no socket se foi criada uma nova conversa
    const wasNewConversation = !hadConversationId;
    if (
      !socket.conversationId ||
      socket.conversationId !== conversation._id.toString()
    ) {
      socket.conversationId = conversation._id.toString();
      await socket.join(`conversation:${socket.conversationId}`);

      // Se foi criada uma nova conversa, notificar o cliente
      if (wasNewConversation) {
        socket.emit('connected', {
          userId: socket.userId,
          username: socket.username,
          conversationId: socket.conversationId,
          history: [],
          status: conversation.status,
          userBanned: currentUser.isBanned,
          banExpiresAt: currentUser.bannedUntil,
        });
      }
    }

    if (
      conversation.status === 'closed' ||
      conversation.status === 'archived'
    ) {
      socket.emit('error', {
        message: 'conversation_closed',
        details:
          'Esta conversa está fechada. Por favor, inicie uma nova conversa.',
      });
      return;
    }

    // Verificar flood protection se for mensagem com imagem
    if (messageType === 'image' && metadata) {
      const imageSize = metadata.size || 0;
      const floodCheck = await floodProtectionService.checkImageUpload(
        socket.livechatUserId,
        imageSize,
        conversation._id as Types.ObjectId,
        socket.userRole,
      );

      if (!floodCheck.allowed) {
        socket.emit('error', {
          message: 'image_flood_protection',
          details: floodCheck.reason || 'Muitas imagens enviadas',
          warnings: floodCheck.warnings,
        });
        return;
      }

      // Se o usuário foi banido durante a verificação
      if (floodCheck.shouldBan) {
        socket.emit('error', {
          message: 'user_banned',
          details: floodCheck.reason || 'Você foi banido por flood de imagens',
        });
        return;
      }
    }

    const conversationId = conversation._id as Types.ObjectId;

    const userMessage = await messageService.createMessage({
      conversationId: conversationId,
      senderId: socket.livechatUserId,
      content,
      isFromAI: false,
      messageType: messageType || 'text',
      metadata: metadata || (imageUrl ? { imageUrl } : null),
    });

    await conversationService.updateLastMessageAt(conversationId);
    await conversationService.updateConversationTitle(conversationId);

    const conversationWithTicket =
      await conversationService.findConversationById(conversationId);

    if (conversationWithTicket?.ticketId) {
      // IMPORTANTE: Quando o usuário envia mensagem, incrementar contador apenas para suportes/admins
      // Usar unreadCountByUser para rastrear contadores individuais por usuário

      // Buscar o ticket atual para obter unreadCountByUser
      const ticket = await Ticket.findById(conversationWithTicket.ticketId);
      if (!ticket) {
        console.error('❌ [Message Handler] Ticket não encontrado');
        return;
      }

      // Buscar todos os usuários com role support ou admin
      const User = (await import('../../../models/User.js')).default;
      const supportAndAdminUsers = await User.find({
        role: { $in: ['support', 'admin'] }
      }).select('_id externalUserId role').lean();

      // Atualizar unreadCountByUser para cada support/admin
      // Usar externalUserId como chave para consistência com o frontend
      const unreadCountByUser = ticket.unreadCountByUser || new Map();
      supportAndAdminUsers.forEach((supportUser) => {
        const userExternalId = supportUser.externalUserId || supportUser._id.toString();
        const currentCount = unreadCountByUser.get(userExternalId) || 0;
        unreadCountByUser.set(userExternalId, currentCount + 1);
      });

      // Recalcular contadores globais como soma dos contadores individuais
      let totalUnreadSupport = 0;
      let totalUnreadAdmin = 0;
      supportAndAdminUsers.forEach((supportUser) => {
        const userExternalId = supportUser.externalUserId || supportUser._id.toString();
        const userCount = unreadCountByUser.get(userExternalId) || 0;
        if (supportUser.role === 'admin') {
          totalUnreadAdmin += userCount;
        } else if (supportUser.role === 'support') {
          totalUnreadSupport += userCount;
        }
      });

      // Atualizar ticket com unreadCountByUser e contadores globais
      const updatedTicket = await Ticket.findByIdAndUpdate(
        conversationWithTicket.ticketId,
        {
          unreadCountByUser: unreadCountByUser,
          unreadCountSupport: totalUnreadSupport,
          unreadCountAdmin: totalUnreadAdmin,
        },
        { new: true },
      );

      // Converter Map para Object antes de emitir eventos
      let unreadCountByUserObj: Record<string, number> = {};
      if (unreadCountByUser instanceof Map) {
        unreadCountByUserObj = Object.fromEntries(unreadCountByUser);
      } else {
        unreadCountByUserObj = unreadCountByUser as Record<string, number>;
      }

      // Emitir evento de atualização em tempo real com unreadCountByUser
      io.emit('unread:update', {
        conversationId: socket.conversationId,
        unreadCountSupport: totalUnreadSupport,
        unreadCountByUser: unreadCountByUserObj,
      });

      // Também emitir conversation:updated para garantir que a lista seja atualizada
      // Buscar conversa com populate completo incluindo unreadCountSupport e unreadCountByUser
      const updatedConversation = await Conversation.findById(conversationId)
        .populate(
          'userId',
          'username nickname externalUserId isOnline isBanned',
        )
        .populate('assignedTo', 'username email externalUserId')
        .populate({
          path: 'ticketId',
          select: '_id priority status subject unreadCountSupport unreadCountAdmin unreadCountByUser assignedTo',
          populate: {
            path: 'assignedTo',
            select: 'username email externalUserId',
          },
        })
        .lean();

      if (updatedConversation) {
        const conversationController = await import(
          '../../conversation.controller.js'
        );
        const transformed =
          conversationController.transformAssignedToIds(updatedConversation);
        io.to('support:global').emit('conversation:updated', {
          ...transformed,
          _id: socket.conversationId,
        });
      }
    } else {
      // Conversa sem ticket - incrementar unreadCount da conversa
      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          $inc: { unreadCount: 1 },
        },
        { new: true },
      );

      // Emitir evento de atualização em tempo real
      const newCount = (updatedConversation as any)?.unreadCount || 0;
      io.emit('unread:count', {
        conversationId: socket.conversationId,
        unreadCount: newCount,
      });

      // Também emitir conversation:updated para garantir que a lista seja atualizada
      const conversationWithPopulate = await Conversation.findById(
        conversationId,
      )
        .populate(
          'userId',
          'username nickname externalUserId isOnline isBanned',
        )
        .populate('assignedTo', 'username email externalUserId')
        .lean();

      if (conversationWithPopulate) {
        const conversationController = await import(
          '../../conversation.controller.js'
        );
        const transformed = conversationController.transformAssignedToIds(
          conversationWithPopulate,
        );
        io.to('support:global').emit('conversation:updated', {
          ...transformed,
          _id: socket.conversationId,
        });
      }
    }

    const userData = await userSyncService.findUserById(socket.livechatUserId);

    // Broadcast mensagem do usuário para toda a room da conversa (incluindo suporte)
    // Emitindo apenas 'message:new' - o frontend escuta ambos 'message:new' e 'new_message'
    const messagePayload = {
      _id: userMessage._id.toString(),
      content: userMessage.content,
      messageType: userMessage.messageType || 'text',
      metadata: userMessage.metadata || null,
      isFromAI: false,
      createdAt: userMessage.createdAt,
      conversationId: socket.conversationId,
      senderId: {
        _id: socket.livechatUserId.toString(),
        username: socket.username,
        externalUserId: userData?.externalUserId || socket.userId,
        role: socket.userRole || 'user',
      },
    };

    io.to(`conversation:${socket.conversationId}`).emit(
      'message:new',
      messagePayload,
    );

    // Notificar a lista de conversas do suporte sobre a nova mensagem (para reordenar em tempo real)
    const lastMessageContent =
      userMessage.messageType === 'image' ? 'Imagem' : userMessage.content;

    io.to('support:global').emit('conversation:message', {
      conversationId: socket.conversationId,
      lastMessage: lastMessageContent,
      lastMessageAt: userMessage.createdAt,
      isFromAI: false,
      senderName: socket.username || 'Usuário',
      messageType: userMessage.messageType || 'text',
      metadata: userMessage.metadata || null,
    });

    // Se a mensagem contém imagem, criar ticket automaticamente e não permitir resposta da IA
    if (messageType === 'image') {
      // Verificar se a conversa já tem ticket
      const currentConversation = await Conversation.findById(
        conversationId,
      ).lean();

      if (!currentConversation?.ticketId) {
        // Criar ticket automaticamente
        const ticketResult = await actionsService.executeAction(
          'create_ticket',
          {
            conversationId: conversationId.toString(),
            userId: socket.livechatUserId.toString(),
            priority: 'medium',
          },
        );

        if (ticketResult.success) {
          console.log(
            '[MessageHandler] Ticket criado automaticamente para mensagem com imagem',
          );

          // Criar mensagem de sistema informando que ticket foi criado
          const systemMessage = await messageService.createMessage({
            conversationId: conversationId,
            senderId: new Types.ObjectId('000000000000000000000000'),
            content:
              '📋 Um ticket foi criado automaticamente para atender sua solicitação. Nossa equipe entrará em contato em breve.',
            isFromAI: false,
            messageType: 'system',
          });

          // Emitir mensagem de sistema para o frontend
          const systemMessagePayload = {
            _id: systemMessage._id.toString(),
            content: systemMessage.content,
            messageType: 'system',
            metadata: null,
            isFromAI: false,
            createdAt: systemMessage.createdAt,
            conversationId: socket.conversationId,
            senderId: {
              _id: '000000000000000000000000',
              username: 'Sistema',
              externalUserId: 'system',
              role: 'system',
            },
          };

          io.to(`conversation:${socket.conversationId}`).emit(
            'message:new',
            systemMessagePayload,
          );
          socket.emit('message:new', systemMessagePayload);

          // Emitir evento de ticket criado para atualizar a lista de conversas
          if (ticketResult.data?.conversation) {
            const conversationController = await import(
              '../../conversation.controller.js'
            );
            const transformedConversation =
              conversationController.transformAssignedToIds(
                ticketResult.data.conversation,
              );

            io.to(`conversation:${socket.conversationId}`).emit(
              'conversation:ticket_created',
              transformedConversation,
            );
            socket.emit('conversation:ticket_created', transformedConversation);

            io.to('support:global').emit('conversation:updated', {
              ...transformedConversation,
              _id: socket.conversationId,
            });
          }
        } else {
          console.error(
            '[MessageHandler] Erro ao criar ticket automaticamente:',
            ticketResult.error,
          );

          // Criar mensagem de sistema informando erro
          const errorSystemMessage = await messageService.createMessage({
            conversationId: conversationId,
            senderId: new Types.ObjectId('000000000000000000000000'),
            content:
              '⚠️ Ocorreu um erro ao criar o ticket. Nossa equipe foi notificada e entrará em contato em breve.',
            isFromAI: false,
            messageType: 'system',
          });

          const errorSystemPayload = {
            _id: errorSystemMessage._id.toString(),
            content: errorSystemMessage.content,
            messageType: 'system',
            metadata: null,
            isFromAI: false,
            createdAt: errorSystemMessage.createdAt,
            conversationId: socket.conversationId,
            senderId: {
              _id: '000000000000000000000000',
              username: 'Sistema',
              externalUserId: 'system',
              role: 'system',
            },
          };

          io.to(`conversation:${socket.conversationId}`).emit(
            'message:new',
            errorSystemPayload,
          );
          socket.emit('message:new', errorSystemPayload);
        }
      } else {
        // Se já tem ticket, apenas garantir que needHumanAttention está marcado
        await Conversation.findByIdAndUpdate(conversationId, {
          needHumanAttention: true,
        });
        console.log(
          '[MessageHandler] Conversa já possui ticket, marcando needHumanAttention',
        );
      }

      // Não permitir resposta da IA para mensagens com imagem
      console.log(
        '[MessageHandler] Mensagem com imagem - bloqueando resposta da IA',
      );
      return;
    }

    // Para mensagens de texto, verificar se a conversa tem needHumanAttention
    // Se tiver, só bloquear se já tiver ticket (aguardando admin)
    // Se não tiver ticket, permitir resposta da IA normalmente
    const conversationWithTicketCheck = await Conversation.findById(
      conversationId,
    )
      .select('needHumanAttention ticketId')
      .lean();
    if (
      conversationWithTicketCheck?.needHumanAttention &&
      conversationWithTicketCheck?.ticketId
    ) {
      return;
    }

    const aiCheck = await chatService.shouldAIRespond(conversationId);

    if (!aiCheck.should) {
      console.log(`[MessageHandler] IA não responderá: ${aiCheck.reason}`);
    }

    if (aiCheck.should) {
      const response = await chatService.generateResponse(
        {
          content,
          senderId: socket.livechatUserId,
        },
        conversationId,
        socket.supportContext || supportContext,
      );

      // BotResponse agora pode ser string (legado) ou objeto { reply, actionResult }
      const botResponseText =
        typeof response === 'string'
          ? response
          : (response as any).reply || response;
      const actionResult =
        typeof response === 'object' && (response as any).actionResult
          ? (response as any).actionResult
          : null;

      const botMessage = await messageService.createMessage({
        conversationId: conversationId,
        senderId: new Types.ObjectId('000000000000000000000000'),
        content: botResponseText,
        isFromAI: true,
      });

      // Broadcast mensagem da IA para toda a room da conversa (incluindo suporte)
      // Emitindo apenas 'message:new' - o frontend escuta ambos 'message:new' e 'new_message'
      const botMessagePayload = {
        _id: botMessage._id.toString(),
        content: botMessage.content,
        messageType: botMessage.messageType || 'text',
        metadata: botMessage.metadata || null,
        isFromAI: true,
        createdAt: botMessage.createdAt,
        conversationId: socket.conversationId,
        senderId: {
          _id: '000000000000000000000000',
          username: 'IA',
          externalUserId: 'ai',
          role: 'ai',
        },
      };

      // Emitir para a room da conversa
      io.to(`conversation:${socket.conversationId}`).emit(
        'message:new',
        botMessagePayload,
      );

      // TAMBÉM emitir diretamente para o socket para garantir que chegue
      // (caso o socket não esteja na room por algum motivo)
      socket.emit('message:new', botMessagePayload);

      console.log(
        `[MessageHandler] Resposta da IA emitida com sucesso (room + socket direto)`,
      );

      // Notificar a lista de conversas do suporte sobre a resposta da IA (para reordenar em tempo real)
      io.to('support:global').emit('conversation:message', {
        conversationId: socket.conversationId,
        lastMessage: botMessage.content,
        lastMessageAt: botMessage.createdAt,
        isFromAI: true,
        senderName: 'IA',
      });

      // Se uma ação foi executada e criou um ticket, notificar sobre a atualização da conversa
      if (
        actionResult &&
        actionResult.success &&
        actionResult.data?.conversation
      ) {
        // Importar função de transformação
        const conversationController = await import(
          '../../conversation.controller.js'
        );
        const transformedConversation =
          conversationController.transformAssignedToIds(
            actionResult.data.conversation,
          );

        // Verificar se a ação foi fechar conversa
        if (actionResult.data.conversation.status === 'closed') {
          // Emitir evento de conversa fechada para a conversa específica
          io.to(`conversation:${socket.conversationId}`).emit(
            'conversation:closed',
            transformedConversation,
          );

          // Também notificar para suporte global (para atualizar lista)
          io.to('support:global').emit('conversation:updated', {
            ...transformedConversation,
            _id: socket.conversationId,
          });
        } else {
          // Emitir evento de ticket criado para a conversa específica
          io.to(`conversation:${socket.conversationId}`).emit(
            'conversation:ticket_created',
            transformedConversation,
          );

          // Também notificar para suporte global (para atualizar lista)
          io.to('support:global').emit('conversation:updated', {
            ...transformedConversation,
            _id: socket.conversationId,
          });
        }
      }
    } else {
      socket.emit('ai:no_response', { reason: aiCheck.reason });
    }
  } catch (error) {
    console.error('❌ [MessageHandler] ERRO AO PROCESSAR MENSAGEM:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: socket.userId,
      conversationId: socket.conversationId,
    });
    socket.emit('error', { message: 'Erro ao enviar mensagem' });
  }
}
