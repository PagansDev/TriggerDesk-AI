import Message from '../models/Message.js';
import { Types } from 'mongoose';

export interface CreateMessageData {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
  isFromAI: boolean;
}

export class MessageService {
  async createMessage(data: CreateMessageData) {
    try {
      const message = await Message.create({
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        messageType: data.messageType || 'text',
        isFromAI: data.isFromAI,
      });

      console.log(` [Message] Mensagem salva: ${message._id}`);
      return message;
    } catch (error) {
      console.error('❌ [Message] Erro ao criar mensagem:', error);
      throw error;
    }
  }

  async getRecentMessages(conversationId: Types.ObjectId, limit: number = 150) {
    try {
      
      const messages = await Message.find({ conversationId })
        .sort({ createdAt: -1 }) 
        .limit(limit)
        .lean();

      
      const chronologicalMessages = messages.reverse();

      console.log(
        `[Message] ${chronologicalMessages.length} mensagens recuperadas (últimas ${limit})`
      );
      return chronologicalMessages;
    } catch (error) {
      console.error('❌ [Message] Erro ao buscar mensagens:', error);
      throw error;
    }
  }
}

export default new MessageService();
