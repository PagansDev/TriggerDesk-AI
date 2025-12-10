import { Server } from 'socket.io';
import { Types } from 'mongoose';
import userSyncService from '../../../services/userSync.service.js';
import conversationService from '../../../services/conversation.service.js';
import messageService from '../../../services/message.service.js';
import { IAuthenticatedSocket } from '../../../../@types/controllers/chat.controller.d.js';

export async function handleConnection(
  io: Server,
  socket: IAuthenticatedSocket
) {
  try {
    const userData: any = {
      externalUserId: socket.userId!,
      username: socket.username!,
    };

    if (socket.userRole) {
      userData.role = socket.userRole;
    }
    if (socket.userEmail) {
      userData.email = socket.userEmail;
    }

    const user = await userSyncService.findOrCreateUser(userData);
    socket.livechatUserId = user._id as Types.ObjectId;

    // Broadcast status online para suporte
    io.to('support:global').emit('user:status', {
      userId: user._id.toString(),
      externalUserId: socket.userId,
      isOnline: true,
      timestamp: new Date(),
    });

    if (socket.userRole === 'support' || socket.userRole === 'admin') {
      await socket.join('support:global');
    }

    const rawConversationId =
      socket.conversationId || (socket.handshake.auth as any)?.conversationId;
    const hasValidConversationId =
      typeof rawConversationId === 'string' &&
      Types.ObjectId.isValid(rawConversationId);

    if (hasValidConversationId) {
      const conversationObjectId = new Types.ObjectId(
        rawConversationId as string
      );
      const conversation = await conversationService.findOrCreateConversation(
        conversationObjectId,
        user._id as Types.ObjectId
      );
      socket.conversationId = conversation._id.toString();

      await socket.join(`conversation:${socket.conversationId}`);

      const history = await messageService.getRecentMessages(
        conversation._id as Types.ObjectId
      );

      const formattedHistory = history.map((msg: any) => ({
        id: msg._id.toString(),
        content: msg.content,
        isFromAI: msg.isFromAI,
        createdAt: msg.createdAt,
        senderId: msg.senderId
          ? {
              _id: msg.senderId._id?.toString() || msg.senderId.toString(),
              username: msg.senderId.username || '',
              externalUserId: msg.senderId.externalUserId || '',
              role: msg.senderId.role || 'user',
            }
          : undefined,
      }));

      socket.emit('connected', {
        userId: socket.userId,
        username: socket.username,
        conversationId: socket.conversationId,
        history: formattedHistory,
        status: conversation.status,
        userBanned: user.isBanned,
        banExpiresAt: user.bannedUntil,
      });
    } else {
      // NÃO criar conversa automaticamente para nenhum usuário
      // A conversa será criada apenas quando o usuário enviar a primeira mensagem
      // Isso evita criar conversas vazias toda vez que o usuário conecta
      console.log(
        `[Socket] ${socket.userRole || 'user'} conectado sem conversationId - apenas escutando eventos globais`,
      );
      socket.emit('connected', {
        userId: socket.userId,
        username: socket.username,
        conversationId: null,
        history: [],
        status: null,
        userBanned: user.isBanned,
        banExpiresAt: user.bannedUntil,
      });
    }
  } catch (error) {
    console.error('❌ [Socket] Erro na conexão:', error);
    socket.emit('error', { message: 'Erro ao estabelecer conexão' });
    socket.disconnect();
  }
}

