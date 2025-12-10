import { Server } from 'socket.io';
import { IAuthenticatedSocket } from '../../../../@types/controllers/chat.controller.d.js';

export async function handleTyping(
  io: Server,
  socket: IAuthenticatedSocket,
  isTyping: boolean
) {
  if (!socket.conversationId) {
    return;
  }

  socket
    .to(`conversation:${socket.conversationId}`)
    .emit('typing:broadcast', {
      userId: socket.userId,
      username: socket.username,
      isTyping,
    });
}

