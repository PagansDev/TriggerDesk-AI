import { Server } from 'socket.io';
import { Types } from 'mongoose';
import { IAuthenticatedSocket } from '../../../../@types/controllers/chat.controller.d.js';

export async function handleConversationJoin(
  io: Server,
  socket: IAuthenticatedSocket,
  conversationId: string
) {
  if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
    socket.emit('error', { message: 'ID da conversa inválido' });
    return;
  }

  if (socket.conversationId !== conversationId) {
    if (socket.conversationId) {
      await socket.leave(`conversation:${socket.conversationId}`);
    }

    socket.conversationId = conversationId;
    await socket.join(`conversation:${conversationId}`);
  }
}

