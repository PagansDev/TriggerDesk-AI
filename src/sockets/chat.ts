import { Server } from 'socket.io';
import { Types } from 'mongoose';
import { ChatController } from '../controllers/chat/chat.controller.js';
import { IAuthenticatedSocket, ISupportContext } from '../../@types/controllers/chat.controller.d.js';

const chatSocket = (io: Server) => {
  const controller = new ChatController(io);

  io.on('connection', async (socket: IAuthenticatedSocket) => {
    await controller.handleConnection(socket);

    socket.on(
      'send_message',
      async (data: {
        content: string;
        conversationId?: string;
        supportContext?: ISupportContext;
        imageUrl?: string;
        messageType?: 'text' | 'image';
        metadata?: any;
      }) => {
        if (
          data.conversationId &&
          Types.ObjectId.isValid(data.conversationId)
        ) {
          socket.conversationId = data.conversationId;
          await socket.join(`conversation:${data.conversationId}`);
        }

        try {
          await controller.handleMessage(
            socket,
            data.content,
            data.supportContext,
            data.imageUrl,
            data.messageType,
            data.metadata,
          );
        } catch (error) {
          console.error('❌ [Socket] Erro ao chamar handleMessage:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          socket.emit('error', { message: 'Erro ao processar mensagem' });
        }
      },
    );

    socket.on(
      'support:message',
      async (data: {
        content: string;
        imageUrl?: string;
        messageType?: 'text' | 'image';
        metadata?: any;
      }) => {
        await controller.handleSupportMessage(
          socket,
          data.content,
          data.imageUrl,
          data.messageType,
          data.metadata,
        );
      },
    );

    socket.on(
      'internal:message',
      async (data: {
        content: string;
        imageUrl?: string;
        messageType?: 'text' | 'image';
        metadata?: any;
      }) => {
        await controller.handleInternalMessage(
          socket,
          data.content,
          data.imageUrl,
          data.messageType,
          data.metadata,
        );
      },
    );

    socket.on('typing', async (data: { isTyping: boolean }) => {
      await controller.handleTyping(socket, data.isTyping);
    });

    socket.on('conversation:join', async (data: { conversationId: string }) => {
      await controller.handleConversationJoin(socket, data.conversationId);
    });

    socket.on('internal:room:join', async (data: { roomId: string }) => {
      await controller.handleInternalRoomJoin(socket, data.roomId);
    });

    socket.on(
      'internal:room:message',
      async (data: {
        roomId: string;
        content: string;
        imageUrl?: string;
        messageType?: 'text' | 'image';
        metadata?: any;
      }) => {
        await controller.handleInternalRoomMessage(socket, data);
      },
    );

    socket.on(
      'ticket:viewing',
      async (data: { ticketId: string; conversationId: string }) => {
        await controller.handleTicketViewing(
          socket,
          data.ticketId,
          data.conversationId,
        );
      },
    );

    socket.on(
      'ticket:left',
      async (data: { ticketId: string; conversationId: string }) => {
        await controller.handleTicketLeft(
          socket,
          data.ticketId,
          data.conversationId,
        );
      },
    );

    socket.on(
      'notification:mark_read',
      async (data: { notificationId: string }) => {
        await controller.handleNotificationMarkAsRead(socket, data);
      },
    );

    socket.on(
      'notification:mark_conversation_read',
      async (data: { conversationId: string }) => {
        await controller.handleNotificationMarkConversationAsRead(socket, data);
      },
    );

    socket.on(
      'notification:delete',
      async (data: { notificationId: string }) => {
        await controller.handleNotificationDelete(socket, data);
      },
    );

    socket.on('notification:get_unread', async () => {
      await controller.handleNotificationGetUnread(socket);
    });

    socket.on('disconnect', () => {
      controller.handleDisconnect(socket);
    });
  });
};

export default chatSocket;
