import { Types } from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import messageService from './message.service.js';
import conversationService from './conversation.service.js';
import chatNotificationService from './chatNotification.service.js';
import { getIoInstance } from '../utils/ioInstance.js';

const AI_SENDER_ID = new Types.ObjectId('000000000000000000000000');
const INACTIVITY_THRESHOLD_HOURS = 24; // Tempo em horas antes de enviar aviso
const WARNING_TIMEOUT_MINUTES = 5;
const CHECK_INTERVAL_MINUTES = 1; // Verificar a cada 1 minuto para garantir precisão no encerramento

export class InactivityMonitorService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Verifica se uma mensagem é do usuário (não IA, admin ou support)
   */
  private async isUserMessage(message: any): Promise<boolean> {
    try {
      // Mensagens da IA não contam
      if (message.isFromAI) {
        return false;
      }

      // Mensagens do sistema não contam
      if (message.messageType === 'system') {
        return false;
      }

      // Verificar se o senderId é da IA
      const senderIdStr =
        message.senderId?.toString() ||
        message.senderId?._id?.toString() ||
        message.senderId;
      if (senderIdStr === AI_SENDER_ID.toString()) {
        return false;
      }

      // Verificar role do sender (se populado)
      const sender = message.senderId;
      if (sender && typeof sender === 'object') {
        const role = sender.role || (sender as any).role;
        if (role === 'support' || role === 'admin') {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(
        '[InactivityMonitor] Erro ao verificar se mensagem é do usuário:',
        error,
      );
      return false;
    }
  }

  /**
   * Verifica se uma mensagem é de admin ou support
   */
  private async isAdminOrSupportMessage(message: any): Promise<boolean> {
    try {
      // Mensagens do sistema não contam
      if (message.messageType === 'system') {
        return false;
      }

      // Verificar role do sender (se populado)
      const sender = message.senderId;
      if (sender && typeof sender === 'object') {
        const role = sender.role || (sender as any).role;
        if (role === 'support' || role === 'admin') {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error(
        '[InactivityMonitor] Erro ao verificar se mensagem é de admin/support:',
        error,
      );
      return false;
    }
  }

  /**
   * Busca a última mensagem geral da conversa (de qualquer tipo)
   */
  private async getLastMessage(
    conversationId: Types.ObjectId,
  ): Promise<any | null> {
    try {
      const message = await Message.findOne({
        conversationId,
        $or: [{ isInternal: { $exists: false } }, { isInternal: false }],
      })
        .sort({ createdAt: -1 })
        .populate('senderId', '_id username externalUserId role')
        .lean();

      return message;
    } catch (error) {
      console.error(
        '[InactivityMonitor] Erro ao buscar última mensagem:',
        error,
      );
      return null;
    }
  }

  /**
   * Busca a última mensagem do usuário em uma conversa
   */
  private async getLastUserMessage(
    conversationId: Types.ObjectId,
  ): Promise<any | null> {
    try {
      const messages = await Message.find({
        conversationId,
        $or: [{ isInternal: { $exists: false } }, { isInternal: false }],
      })
        .sort({ createdAt: -1 })
        .limit(50) // Buscar últimas 50 mensagens para encontrar a última do usuário
        .populate('senderId', '_id username externalUserId role')
        .lean();

      // Procurar a primeira mensagem que seja do usuário
      for (const message of messages) {
        if (await this.isUserMessage(message)) {
          return message;
        }
      }

      return null;
    } catch (error) {
      console.error(
        '[InactivityMonitor] Erro ao buscar última mensagem do usuário:',
        error,
      );
      return null;
    }
  }

  /**
   * Verifica se houve nova mensagem do usuário após o aviso
   */
  private async hasUserRespondedAfterWarning(
    conversationId: Types.ObjectId,
    warningSentAt: Date,
  ): Promise<boolean> {
    try {
      const lastUserMessage = await this.getLastUserMessage(conversationId);

      if (!lastUserMessage) {
        return false;
      }

      const lastMessageDate = new Date(lastUserMessage.createdAt);
      return lastMessageDate > warningSentAt;
    } catch (error) {
      console.error(
        '[InactivityMonitor] Erro ao verificar resposta do usuário:',
        error,
      );
      return false;
    }
  }

  /**
   * Envia mensagem de aviso de inatividade
   */
  private async sendWarningMessage(
    conversationId: Types.ObjectId,
  ): Promise<void> {
    try {
      const io = getIoInstance();
      if (!io) {
        console.error('[InactivityMonitor] Socket.IO instance não disponível');
        return;
      }

      const warningMessage =
        'Você ainda está aí? O chat será encerrado automaticamente em breve.';

      const message = await messageService.createMessage({
        conversationId,
        senderId: AI_SENDER_ID,
        content: warningMessage,
        messageType: 'system',
        isFromAI: false,
      });

      // Emitir mensagem via Socket.IO
      const messagePayload = {
        _id: message._id.toString(),
        content: message.content,
        messageType: 'system',
        isFromAI: false,
        createdAt: message.createdAt,
        conversationId: conversationId.toString(),
        senderId: {
          _id: AI_SENDER_ID.toString(),
          username: 'Sistema',
          externalUserId: 'system',
          role: 'system',
        },
      };

      io.to(`conversation:${conversationId}`).emit(
        'message:new',
        messagePayload,
      );

      // Atualizar lastMessageAt para que a conversa suba na lista
      await conversationService.updateLastMessageAt(conversationId);

      // Notificar a lista de conversas do suporte sobre a nova mensagem (para reordenar em tempo real)
      io.to('support:global').emit('conversation:message', {
        conversationId: conversationId.toString(),
        lastMessage: warningMessage,
        lastMessageAt: message.createdAt,
        isFromAI: false,
        senderName: 'Sistema',
        messageType: 'system',
        metadata: null,
      });

      // Buscar conversa para obter userId e criar notificação
      const conversation = await Conversation.findById(conversationId)
        .populate('userId', '_id')
        .lean();

      if (conversation) {
        // Marcar que o aviso foi enviado
        const conversationDoc = await Conversation.findById(conversationId);
        if (conversationDoc) {
          const metadata = conversationDoc.metadata || {};
          metadata.inactivityWarningSentAt = new Date();
          conversationDoc.metadata = metadata;
          await conversationDoc.save();
        }

        // Criar notificação para o usuário
        try {
          const userId = conversation.userId as any;
          const userIdObj = userId?._id || userId || conversation.userId;

          if (userIdObj) {
            const messagePreview =
              warningMessage.length > 150
                ? warningMessage.substring(0, 147) + '...'
                : warningMessage;

            const notificationData: any = {
              userId: new Types.ObjectId(userIdObj.toString()),
              conversationId,
              senderId: AI_SENDER_ID,
              senderName: 'Sistema',
              senderRole: 'admin',
              title: 'Chat será encerrado em breve',
              message: warningMessage,
              messagePreview,
              messageType: 'text',
              metadata: {
                isInactivityWarning: true,
              },
            };

            // Adicionar ticketId se existir
            if (conversation.ticketId) {
              notificationData.ticketId = conversation.ticketId;
            }

            await chatNotificationService.createNotification(notificationData);

            // Emitir evento de notificação para o usuário (se estiver conectado)
            // Buscar sockets conectados do usuário
            const sockets = await io.fetchSockets();
            const userSockets = sockets.filter((socket: any) => {
              const socketUserId =
                socket.livechatUserId?.toString() || socket.userId?.toString();
              return socketUserId === userIdObj.toString();
            });

            // Emitir evento para cada socket do usuário
            userSockets.forEach((socket: any) => {
              const eventData: any = {
                conversationId: conversationId.toString(),
                senderName: 'Sistema',
                senderRole: 'admin',
                messagePreview,
                messageType: 'text',
                timestamp: new Date(),
                metadata: {
                  isInactivityWarning: true,
                },
              };

              // Adicionar ticketId se existir
              if (conversation.ticketId) {
                eventData.ticketId = conversation.ticketId.toString();
              }

              socket.emit('ticket:new_message', eventData);

              // Emitir evento de atualização de contador de notificações
              chatNotificationService
                .countUnreadNotifications(
                  new Types.ObjectId(userIdObj.toString()),
                )
                .then((count) => {
                  socket.emit('notification:unread_count', { count });
                });
            });

            console.log(
              `[InactivityMonitor] Notificação criada para usuário ${userIdObj}`,
            );
          }
        } catch (notificationError) {
          console.error(
            '[InactivityMonitor] Erro ao criar notificação:',
            notificationError,
          );
          // Continuar mesmo se falhar ao criar notificação
        }
      }

      console.log(
        `[InactivityMonitor] Aviso de inatividade enviado para conversa ${conversationId}`,
      );
    } catch (error) {
      console.error(
        '[InactivityMonitor] Erro ao enviar aviso de inatividade:',
        error,
      );
    }
  }

  /**
   * Encerra conversa por inatividade
   */
  private async closeConversationForInactivity(
    conversationId: Types.ObjectId,
  ): Promise<void> {
    try {
      const io = getIoInstance();
      if (!io) {
        console.error('[InactivityMonitor] Socket.IO instance não disponível');
        return;
      }

      const closingMessage =
        'Este chat foi encerrado automaticamente por inatividade. Caso ainda precise de ajuda, abra um novo chat.';

      // Enviar mensagem de encerramento
      const message = await messageService.createMessage({
        conversationId,
        senderId: AI_SENDER_ID,
        content: closingMessage,
        messageType: 'system',
        isFromAI: false,
      });

      // Fechar conversa
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.status = 'closed';
        if (
          conversation.metadata &&
          conversation.metadata.inactivityWarningSentAt
        ) {
          delete conversation.metadata.inactivityWarningSentAt;
        }
        await conversation.save();
      }

      // Emitir mensagem via Socket.IO
      const messagePayload = {
        _id: message._id.toString(),
        content: message.content,
        messageType: 'system',
        isFromAI: false,
        createdAt: message.createdAt,
        conversationId: conversationId.toString(),
        senderId: {
          _id: AI_SENDER_ID.toString(),
          username: 'Sistema',
          externalUserId: 'system',
          role: 'system',
        },
      };

      io.to(`conversation:${conversationId}`).emit(
        'message:new',
        messagePayload,
      );
      io.to(`conversation:${conversationId}`).emit('conversation:closed', {
        conversationId: conversationId.toString(),
        status: 'closed',
      });

      // Atualizar lastMessageAt para que a conversa suba na lista
      await conversationService.updateLastMessageAt(conversationId);

      // Notificar a lista de conversas do suporte sobre a nova mensagem (para reordenar em tempo real)
      io.to('support:global').emit('conversation:message', {
        conversationId: conversationId.toString(),
        lastMessage: closingMessage,
        lastMessageAt: message.createdAt,
        isFromAI: false,
        senderName: 'Sistema',
        messageType: 'system',
        metadata: null,
      });

      // Notificar suporte também sobre o fechamento
      io.to('support:global').emit('conversation:updated', {
        conversationId: conversationId.toString(),
        status: 'closed',
      });

      console.log(
        `[InactivityMonitor] Conversa ${conversationId} encerrada por inatividade`,
      );
    } catch (error) {
      console.error(
        '[InactivityMonitor] Erro ao encerrar conversa por inatividade:',
        error,
      );
    }
  }

  /**
   * Processa uma conversa para verificar inatividade
   */
  private async processConversation(conversation: any): Promise<void> {
    try {
      const conversationId = conversation._id;
      const metadata = conversation.metadata || {};
      const warningSentAt = metadata.inactivityWarningSentAt
        ? new Date(metadata.inactivityWarningSentAt)
        : null;

      // Se já foi enviado um aviso, verificar se passou o timeout
      if (warningSentAt) {
        const minutesSinceWarning =
          (Date.now() - warningSentAt.getTime()) / (1000 * 60);

        if (minutesSinceWarning >= WARNING_TIMEOUT_MINUTES) {
          // Verificar se o usuário respondeu
          const hasResponded = await this.hasUserRespondedAfterWarning(
            conversationId,
            warningSentAt,
          );

          if (!hasResponded) {
            // Antes de fechar, verificar se há mensagem recente de admin/support
            const lastMessage = await this.getLastMessage(conversationId);
            if (lastMessage) {
              const isLastMessageFromAdminOrSupport =
                await this.isAdminOrSupportMessage(lastMessage);

              if (isLastMessageFromAdminOrSupport) {
                const lastMessageDate = new Date(lastMessage.createdAt);
                const hoursSinceLastMessage =
                  (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60);

                // Se a mensagem de admin/support for recente (< 24h), cancelar o aviso e não fechar
                if (hoursSinceLastMessage < INACTIVITY_THRESHOLD_HOURS) {
                  const conversation = await Conversation.findById(
                    conversationId,
                  );
                  if (
                    conversation &&
                    conversation.metadata &&
                    conversation.metadata.inactivityWarningSentAt
                  ) {
                    delete conversation.metadata.inactivityWarningSentAt;
                    await conversation.save();
                  }
                  console.log(
                    `[InactivityMonitor] Conversa ${conversationId} tem mensagem recente de admin/support após aviso, cancelando encerramento`,
                  );
                  return;
                }
              }
            }

            // Encerrar conversa
            console.log(
              `[InactivityMonitor] Encerrando conversa ${conversationId} por inatividade após ${minutesSinceWarning.toFixed(
                2,
              )} minutos`,
            );
            await this.closeConversationForInactivity(conversationId);
          } else {
            // Usuário respondeu, remover o aviso
            const conversation = await Conversation.findById(conversationId);
            if (
              conversation &&
              conversation.metadata &&
              conversation.metadata.inactivityWarningSentAt
            ) {
              delete conversation.metadata.inactivityWarningSentAt;
              await conversation.save();
            }
            console.log(
              `[InactivityMonitor] Conversa ${conversationId} teve resposta após aviso, aviso removido`,
            );
          }
        } else {
          // Ainda não passou o timeout, aguardar próxima verificação
          const remainingMinutes = (
            WARNING_TIMEOUT_MINUTES - minutesSinceWarning
          ).toFixed(1);
        }
        // Retornar para não processar outras verificações
        return;
      }

      // Buscar última mensagem geral da conversa
      const lastMessage = await this.getLastMessage(conversationId);

      if (!lastMessage) {
        // Não há mensagens, não fazer nada
        return;
      }

      // Verificar se a última mensagem é do usuário
      const isLastMessageFromUser = await this.isUserMessage(lastMessage);

      // Se a última mensagem for do usuário, não fazer nada (não encerrar)
      if (isLastMessageFromUser) {
        return;
      }

      // Verificar se a última mensagem é de admin/support
      const isLastMessageFromAdminOrSupport =
        await this.isAdminOrSupportMessage(lastMessage);

      // Se a última mensagem for de admin/support, verificar se é recente
      if (isLastMessageFromAdminOrSupport) {
        const lastMessageDate = new Date(lastMessage.createdAt);
        const hoursSinceLastMessage =
          (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60);

        // Se a mensagem de admin/support for recente (< 24h), não fechar o chat
        // Isso permite que admins reabram chats sem que sejam fechados imediatamente
        if (hoursSinceLastMessage < INACTIVITY_THRESHOLD_HOURS) {
          console.log(
            `[InactivityMonitor] Conversa ${conversationId} tem mensagem recente de admin/support (${hoursSinceLastMessage.toFixed(
              2,
            )}h), não encerrando`,
          );
          return;
        }
      }

      // Se chegou aqui, a última mensagem é da IA/admin/support e é antiga
      // OU é de admin/support mas já passou o threshold
      // Calcular horas desde a última mensagem
      const lastMessageDate = new Date(lastMessage.createdAt);
      const hoursSinceLastMessage =
        (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastMessage >= INACTIVITY_THRESHOLD_HOURS) {
        // Enviar aviso
        await this.sendWarningMessage(conversationId);
      }
    } catch (error) {
      console.error(
        `[InactivityMonitor] Erro ao processar conversa ${conversation._id}:`,
        error,
      );
    }
  }

  /**
   * Verifica todas as conversas ativas para inatividade
   */
  private async checkInactiveConversations(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      // Buscar conversas ativas (incluindo aquelas com aviso pendente)
      const activeConversations = await Conversation.find({
        status: 'active',
        isInternal: { $ne: true }, // Ignorar conversas internas
      }).lean();

      // Contar conversas com aviso pendente
      const conversationsWithWarning = activeConversations.filter((conv) => {
        const metadata = conv.metadata || {};
        return metadata.inactivityWarningSentAt;
      });

      if (conversationsWithWarning.length > 0) {
        console.log(
          `[InactivityMonitor] ${conversationsWithWarning.length} conversa(s) com aviso pendente de encerramento`,
        );
      }

      // Processar cada conversa
      for (const conversation of activeConversations) {
        await this.processConversation(conversation);
      }
    } catch (error) {
      console.error(
        '[InactivityMonitor] Erro na verificação de inatividade:',
        error,
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Inicia o monitoramento periódico
   */
  start(): void {
    if (this.intervalId) {
      console.log('[InactivityMonitor] Monitoramento já está em execução');
      return;
    }

    console.log(
      `[InactivityMonitor] Iniciando monitoramento (verificação a cada ${CHECK_INTERVAL_MINUTES} minutos)`,
    );

    // Executar verificação imediatamente
    this.checkInactiveConversations();

    // Agendar verificações periódicas
    this.intervalId = setInterval(() => {
      this.checkInactiveConversations();
    }, CHECK_INTERVAL_MINUTES * 60 * 1000);
  }

  /**
   * Para o monitoramento periódico
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[InactivityMonitor] Monitoramento parado');
    }
  }
}

export default new InactivityMonitorService();
