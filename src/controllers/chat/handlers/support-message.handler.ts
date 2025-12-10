import { Server } from 'socket.io';
import { Types } from 'mongoose';
import conversationService from '../../../services/conversation.service.js';
import messageService from '../../../services/message.service.js';
import userSyncService from '../../../services/userSync.service.js';
import floodProtectionService from '../../../services/floodProtection.service.js';
import Conversation from '../../../models/Conversation.js';
import Ticket from '../../../models/Ticket.js';
import { transformAssignedToIds } from '../../conversation.controller.js';
import { IAuthenticatedSocket } from '../../../../@types/controllers/chat.controller.d.js';
import {
  isUserViewingTicket,
  getUserSocket,
} from './ticket-tracking.handler.js';
import chatNotificationService from '../../../services/chatNotification.service.js';

export async function handleSupportMessage(
  io: Server,
  socket: IAuthenticatedSocket,
  content: string,
  imageUrl?: string,
  messageType?: 'text' | 'image',
  metadata?: any,
) {
  if (!socket.userId || !socket.conversationId || !socket.livechatUserId) {
    socket.emit('error', { message: 'Conversa não inicializada' });
    return;
  }

  if (socket.userRole !== 'support' && socket.userRole !== 'admin') {
    socket.emit('error', { message: 'Acesso negado' });
    return;
  }

  try {
    const conversationObjectId = new Types.ObjectId(socket.conversationId);

    // Buscar dados do usuário primeiro
    const user = await userSyncService.findUserById(socket.livechatUserId);

    // Buscar conversa para verificar se já tem operador atribuído
    const conversation = await Conversation.findById(conversationObjectId)
      .populate('assignedTo', 'username email externalUserId')
      .populate({
        path: 'ticketId',
        populate: {
          path: 'assignedTo',
          select: 'username email externalUserId',
        },
      });

    // Se o chat estiver fechado, reabrir quando admin/support envia mensagem
    if (conversation && conversation.status === 'closed') {
      conversation.status = 'active';
      await conversation.save();

      // Buscar conversa atualizada para emitir evento completo
      const reopenedConversation = await Conversation.findById(
        conversationObjectId,
      )
        .populate(
          'userId',
          'username nickname externalUserId isOnline isBanned',
        )
        .populate('assignedTo', 'username email externalUserId')
        .populate({
          path: 'ticketId',
          populate: {
            path: 'assignedTo',
            select: 'username email externalUserId',
          },
        })
        .lean();

      if (reopenedConversation) {
        const transformedConversation =
          transformAssignedToIds(reopenedConversation);

        // Notificar reabertura da conversa
        io.to(`conversation:${socket.conversationId}`).emit(
          'conversation:reopened',
          {
            conversationId: socket.conversationId,
            ...transformedConversation,
            status: 'active',
          },
        );

        // Notificar atualização da conversa para todos os suportes
        io.to('support:global').emit('conversation:updated', {
          ...transformedConversation,
          _id: socket.conversationId,
        });

        console.log(
          `[Support Message Handler] Chat ${socket.conversationId} reaberto por ${socket.userRole}`,
        );
      }
    }

    // Se não tiver operador atribuído, atribuir automaticamente ao operador que está enviando
    if (conversation && !conversation.assignedTo) {
      await Conversation.findByIdAndUpdate(conversationObjectId, {
        assignedTo: socket.livechatUserId,
      });

      // Se houver ticket, também atribuir o ticket
      if (conversation.ticketId) {
        await Ticket.findByIdAndUpdate(conversation.ticketId, {
          assignedTo: socket.livechatUserId,
        });
      }

      // Buscar conversa atualizada para emitir evento completo
      const updatedConversation = await Conversation.findById(
        conversationObjectId,
      )
        .populate(
          'userId',
          'username nickname externalUserId isOnline isBanned',
        )
        .populate('assignedTo', 'username email externalUserId')
        .populate({
          path: 'ticketId',
          populate: {
            path: 'assignedTo',
            select: 'username email externalUserId',
          },
        })
        .lean();

      if (updatedConversation) {
        const transformedConversation =
          transformAssignedToIds(updatedConversation);

        // Notificar atualização da conversa para todos os suportes
        io.to('support:global').emit(
          'conversation:updated',
          transformedConversation,
        );

        // Também emitir para a room específica da conversa para atualização em tempo real
        // para quem está visualizando o chat
        io.to(`conversation:${socket.conversationId}`).emit(
          'conversation:updated',
          transformedConversation,
        );
      }
    }

    // Verificar flood protection se for mensagem com imagem
    if (messageType === 'image' && metadata) {
      const imageSize = metadata.size || 0;
      const floodCheck = await floodProtectionService.checkImageUpload(
        socket.livechatUserId,
        imageSize,
        conversationObjectId,
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

    const supportMessage = await messageService.createMessage({
      conversationId: conversationObjectId,
      senderId: socket.livechatUserId,
      content,
      isFromAI: false,
      messageType: messageType || 'text',
      metadata: metadata || (imageUrl ? { imageUrl } : null),
    });

    await conversationService.updateLastMessageAt(conversationObjectId);

    // Se há suporte visualizando o chat, garantir que o contador está zerado
    // (mensagens de suporte nunca devem incrementar o contador)
    const conversationWithTicket =
      await conversationService.findConversationById(conversationObjectId);
    let unreadCount = 0;

    if (conversationWithTicket?.ticketId) {
      // Quando support/admin envia mensagem, zerar apenas o contador do remetente
      // Usar unreadCountByUser para rastrear contadores individuais

      // Buscar o ticket atual para obter unreadCountByUser
      const ticket = await Ticket.findById(conversationWithTicket.ticketId);
      if (!ticket) {
        console.error('❌ [Support Message Handler] Ticket não encontrado');
        return;
      }

      // Buscar o usuário que está enviando a mensagem
      const User = (await import('../../../models/User.js')).default;
      const senderUser = await User.findById(socket.livechatUserId)
        .select('externalUserId role').lean();

      if (!senderUser) {
        console.error('❌ [Support Message Handler] Usuário remetente não encontrado');
        return;
      }

      // Atualizar unreadCountByUser: zerar contador do remetente
      // Usar externalUserId como chave para consistência com o frontend
      const unreadCountByUser = ticket.unreadCountByUser || new Map();
      const senderExternalId = senderUser.externalUserId || senderUser._id.toString();
      unreadCountByUser.set(senderExternalId, 0);

      // Buscar todos os suportes/admins para recalcular contadores globais
      const supportAndAdminUsers = await User.find({
        role: { $in: ['support', 'admin'] }
      }).select('_id externalUserId role').lean();

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
      await Ticket.findByIdAndUpdate(conversationWithTicket.ticketId, {
        unreadCountByUser: unreadCountByUser,
        unreadCountSupport: totalUnreadSupport,
        unreadCountAdmin: totalUnreadAdmin,
      });

      // Converter Map para Object antes de emitir eventos
      let unreadCountByUserObj: Record<string, number> = {};
      if (unreadCountByUser instanceof Map) {
        unreadCountByUserObj = Object.fromEntries(unreadCountByUser);
      } else {
        unreadCountByUserObj = unreadCountByUser as Record<string, number>;
      }

      // Calcular contador do remetente (sempre 0 após enviar mensagem)
      unreadCount = 0;

      // IMPORTANTE: Emitir evento de atualização ANTES de conversation:message
      // para evitar que o frontend incremente o contador desnecessariamente
      io.emit('unread:update', {
        conversationId: socket.conversationId,
        unreadCountSupport: totalUnreadSupport,
        unreadCountByUser: unreadCountByUserObj,
      });
    }

    // Broadcast mensagem do suporte para toda a room da conversa
    io.to(`conversation:${socket.conversationId}`).emit('message:new', {
      _id: supportMessage._id.toString(),
      conversationId: socket.conversationId,
      senderId: {
        _id: socket.livechatUserId.toString(),
        username: socket.username,
        externalUserId: user?.externalUserId || '',
        role: socket.userRole,
      },
      content: supportMessage.content,
      messageType: supportMessage.messageType || 'text',
      metadata: supportMessage.metadata || null,
      isFromAI: false,
      createdAt: supportMessage.createdAt,
    });

    // Notificar a lista de conversas do suporte sobre a mensagem do suporte (para reordenar em tempo real)
    const lastMessageContent =
      supportMessage.messageType === 'image'
        ? 'Imagem'
        : supportMessage.content;

    // IMPORTANTE: Incluir flag isFromSupport para que o frontend saiba que não deve incrementar o contador
    io.to('support:global').emit('conversation:message', {
      conversationId: socket.conversationId,
      lastMessage: lastMessageContent,
      lastMessageAt: supportMessage.createdAt,
      isFromAI: false,
      isFromSupport: true, // Flag indicando que a mensagem é de suporte/admin
      senderName: socket.username || 'Suporte',
      messageType: supportMessage.messageType || 'text',
      metadata: supportMessage.metadata || null,
    });

    // ========== ENVIAR NOTIFICAÇÃO PARA O USUÁRIO (se não estiver visualizando) ==========
    if (conversationWithTicket?.userId) {
      const conversationWithUser = await Conversation.findById(
        conversationObjectId,
      )
        .populate('userId', 'username nickname externalUserId')
        .populate('ticketId', 'subject priority')
        .lean();

      if (conversationWithUser?.userId) {
        const ticketOwner = conversationWithUser.userId as any;
        const ticketOwnerExternalId =
          ticketOwner.externalUserId || ticketOwner._id.toString();

        // Verificar se o usuário está visualizando o ticket
        const isViewing = isUserViewingTicket(
          io,
          ticketOwnerExternalId,
          socket.conversationId!,
        );

        if (!isViewing) {
          // Usuário NÃO está visualizando o ticket - enviar notificação
          const userSocket = getUserSocket(io, ticketOwnerExternalId);

          if (userSocket) {
            // Preparar preview da mensagem (máximo 100 caracteres)
            let messagePreview = content;
            if (supportMessage.messageType === 'image') {
              messagePreview = '🖼️ Imagem';
            } else if (content.length > 100) {
              messagePreview = content.substring(0, 100) + '...';
            }

            // Buscar informações do ticket se existir
            const ticketInfo = conversationWithUser.ticketId as any;
            const ticketMetadata = ticketInfo
              ? {
                  subject: ticketInfo.subject,
                  priority: ticketInfo.priority,
                }
              : undefined;

            // Preparar título da notificação
            let notificationTitle = 'Nova mensagem em ticket';
            if (ticketMetadata?.subject) {
              notificationTitle = `Ticket: ${ticketMetadata.subject}`;
            }

            // Criar notificação no banco de dados
            try {
              const notificationData: any = {
                userId: ticketOwner._id as Types.ObjectId,
                conversationId: conversationObjectId,
                senderId: socket.livechatUserId,
                senderName: socket.username || 'Suporte',
                senderRole: socket.userRole as 'support' | 'admin',
                title: notificationTitle,
                message: `${socket.username || 'Suporte'}: ${messagePreview}`,
                messagePreview,
                messageType: (supportMessage.messageType || 'text') as
                  | 'text'
                  | 'image',
                metadata: ticketMetadata,
              };

              // Adicionar ticketId apenas se existir
              if (conversationWithUser.ticketId?._id) {
                notificationData.ticketId = conversationWithUser.ticketId
                  ._id as Types.ObjectId;
              }

              await chatNotificationService.createNotification(
                notificationData,
              );
            } catch (notificationError) {
              console.error(
                '❌ [Notification] Erro ao salvar notificação no banco:',
                notificationError,
              );
              // Continuar mesmo se falhar ao salvar - o socket ainda funciona
            }

            // Emitir evento de notificação para o socket específico do usuário
            userSocket.emit('ticket:new_message', {
              ticketId: conversationWithUser.ticketId?._id?.toString(),
              conversationId: socket.conversationId,
              senderName: socket.username || 'Suporte',
              senderRole: socket.userRole,
              messagePreview,
              messageType: supportMessage.messageType || 'text',
              timestamp: supportMessage.createdAt,
              metadata: ticketMetadata,
            });
          } else {
            // Usuário não está conectado, mas ainda criar notificação no banco
            // para que ele veja quando fizer login
            try {
              // Preparar título da mensagem
              let messagePreview = content;
              if (supportMessage.messageType === 'image') {
                messagePreview = '🖼️ Imagem';
              } else if (content.length > 100) {
                messagePreview = content.substring(0, 100) + '...';
              }

              // Preparar título da notificação
              const ticketInfo = conversationWithUser.ticketId as any;
              let notificationTitle = 'Nova mensagem em ticket';
              if (ticketInfo?.subject) {
                notificationTitle = `Ticket: ${ticketInfo.subject}`;
              }

              const notificationData: any = {
                userId: ticketOwner._id as Types.ObjectId,
                conversationId: conversationObjectId,
                senderId: socket.livechatUserId,
                senderName: socket.username || 'Suporte',
                senderRole: socket.userRole as 'support' | 'admin',
                title: notificationTitle,
                message: `${socket.username || 'Suporte'}: ${messagePreview}`,
                messagePreview,
                messageType: (supportMessage.messageType || 'text') as
                  | 'text'
                  | 'image',
              };

              // Adicionar ticketId apenas se existir
              if (conversationWithUser.ticketId?._id) {
                notificationData.ticketId = conversationWithUser.ticketId
                  ._id as Types.ObjectId;
              }

              // Adicionar metadata apenas se existir
              if (ticketInfo) {
                notificationData.metadata = {
                  subject: ticketInfo.subject,
                  priority: ticketInfo.priority,
                };
              }

              await chatNotificationService.createNotification(
                notificationData,
              );
            } catch (notificationError) {
              console.error(
                '❌ [Notification] Erro ao salvar notificação para usuário offline:',
                notificationError,
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ [Socket] Erro ao processar mensagem de suporte:', error);
    socket.emit('error', { message: 'Erro ao enviar mensagem' });
  }
}
