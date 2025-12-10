import { Server } from 'socket.io';
import { Types } from 'mongoose';
import conversationService from '../../../services/conversation.service.js';
import internalMessageService from '../../../services/internalMessage.service.js';
import userSyncService from '../../../services/userSync.service.js';
import { IAuthenticatedSocket } from '../../../../@types/controllers/chat.controller.d.js';

export async function handleInternalMessage(
  io: Server,
  socket: IAuthenticatedSocket,
  content: string,
  imageUrl?: string,
  messageType?: 'text' | 'image',
  metadata?: any
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

    const internalMessage =
      await internalMessageService.createInternalMessage({
        conversationId: conversationObjectId,
        senderId: socket.livechatUserId,
        content,
        messageType: messageType || 'text',
        metadata: metadata || null,
      });

    const user = await userSyncService.findUserById(socket.livechatUserId);

    io.to('support:global').emit('internal:new', {
      _id: internalMessage._id.toString(),
      conversationId: socket.conversationId,
      senderId: {
        _id: socket.livechatUserId.toString(),
        username: socket.username,
        externalUserId: user?.externalUserId || '',
        role: socket.userRole,
      },
      content: internalMessage.content,
      messageType: messageType || 'text',
      metadata: metadata || null,
      isInternal: true,
      createdAt: internalMessage.createdAt,
    });
  } catch (error) {
    console.error('❌ [Socket] Erro ao processar nota interna:', error);
    socket.emit('error', { message: 'Erro ao enviar nota interna' });
  }
}

