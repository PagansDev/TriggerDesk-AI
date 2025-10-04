import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import chatService from '../services/chat.service.js';
import userSyncService from '../services/userSync.service.js';
import conversationService from '../services/conversation.service.js';
import messageService from '../services/message.service.js';

//exemplo de contexto de suporte em integração de projeto em andamento
interface SupportContext {
  exchangeRates?: {
    BTC_USD: number | null;
    USD_BRL: number | null;
    lastUpdate: string | null;
  };
  dashboardData?: any;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  userEmail?: string;
  userRole?: string;
  livechatUserId?: Types.ObjectId;
  conversationId?: string;
  supportContext?: SupportContext;
}

export class ChatController {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  async handleConnection(socket: AuthenticatedSocket) {
    console.log(` [Socket] Nova conexão: ${socket.id}`);
    console.log(` [Socket] Usuário: ${socket.username} (${socket.userId})`);

    try {
      const user = await userSyncService.findOrCreateUser({
        externalUserId: socket.userId!,
        username: socket.username!,
      });
      socket.livechatUserId = user._id as Types.ObjectId;

      const conversation = await conversationService.findOrCreateConversation(
        user._id as Types.ObjectId
      );
      socket.conversationId = conversation._id.toString();

      await socket.join(socket.conversationId);

      const history = await messageService.getRecentMessages(
        conversation._id as Types.ObjectId,
        15
      );

      const formattedHistory = history.map((msg: any) => ({
        id: msg._id.toString(),
        content: msg.content,
        isFromAI: msg.isFromAI,
        createdAt: msg.createdAt,
      }));

      socket.emit('connected', {
        userId: socket.userId,
        username: socket.username,
        conversationId: socket.conversationId,
        history: formattedHistory,
      });

      console.log(
        ` [Socket] Conectado à conversa: ${socket.conversationId} (${history.length} mensagens)`
      );
    } catch (error) {
      console.error('❌ [Socket] Erro na conexão:', error);
      socket.emit('error', { message: 'Erro ao estabelecer conexão' });
      socket.disconnect();
    }
  }

  async handleMessage(
    socket: AuthenticatedSocket,
    content: string,
    supportContext?: SupportContext
  ) {
    if (!socket.userId || !socket.conversationId || !socket.livechatUserId) {
      socket.emit('error', { message: 'Conversa não inicializada' });
      return;
    }

    console.log(`[Socket] Mensagem de ${socket.username}: "${content}"`);

    // Atualizar contexto do socket com dados mais recentes
    if (supportContext) {
      socket.supportContext = supportContext;
      console.log('[Socket] Contexto de suporte atualizado na mensagem');
    }

    try {
      const userMessage = await messageService.createMessage({
        conversationId: new Types.ObjectId(socket.conversationId),
        senderId: socket.livechatUserId,
        content,
        isFromAI: false,
      });

      await conversationService.updateLastMessageAt(
        new Types.ObjectId(socket.conversationId)
      );

      socket.emit('new_message', {
        id: userMessage._id.toString(),
        content: userMessage.content,
        isFromAI: false,
        createdAt: userMessage.createdAt,
      });

      const botResponse = await chatService.generateResponse(
        content,
        new Types.ObjectId(socket.conversationId),
        socket.supportContext || supportContext
      );

      const botMessage = await messageService.createMessage({
        conversationId: new Types.ObjectId(socket.conversationId),
        senderId: new Types.ObjectId('000000000000000000000000'),
        content: botResponse,
        isFromAI: true,
      });

      socket.emit('new_message', {
        id: botMessage._id.toString(),
        content: botMessage.content,
        isFromAI: true,
        createdAt: botMessage.createdAt,
      });

      console.log(
        ` [Socket] Resposta IA enviada: "${botResponse.substring(0, 50)}..."`
      );
    } catch (error) {
      console.error('❌ [Socket] Erro ao processar mensagem:', error);
      socket.emit('error', { message: 'Erro ao enviar mensagem' });
    }
  }

  async handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.userId) {
      await userSyncService.updateUserStatus(socket.userId, false);
      console.log(` [Socket] Usuário ${socket.username} desconectado`);
    }
  }
}
