import { Server } from 'socket.io';
import userSyncService from '../../../services/userSync.service.js';
import { IAuthenticatedSocket } from '../../../../@types/controllers/chat.controller.d.js';

export async function handleDisconnect(
  io: Server,
  socket: IAuthenticatedSocket
) {
  if (socket.userId) {
    await userSyncService.updateUserStatus(socket.userId, false);

    // Broadcast status offline para suporte
    io.to('support:global').emit('user:status', {
      userId: socket.livechatUserId?.toString(),
      externalUserId: socket.userId,
      isOnline: false,
      timestamp: new Date(),
    });
  }
}

