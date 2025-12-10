import InternalMessage from '../models/InternalMessage.js';
import Conversation from '../models/Conversation.js';
import { Types } from 'mongoose';

export interface CreateInternalMessageData {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, any>;
}

export class InternalMessageService {
  async createInternalMessage(data: CreateInternalMessageData) {
    try {
    const internalMessage = await InternalMessage.create({
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content,
      messageType: data.messageType || 'text',
      metadata: data.metadata || null,
      isInternal: true,
    });

      await Conversation.findByIdAndUpdate(data.conversationId, {
        hasInternalMessages: true,
      });

      console.log(
        `[InternalMessage] Nota interna salva: ${internalMessage._id}`
      );
      return internalMessage;
    } catch (error) {
      console.error('❌ [InternalMessage] Erro ao criar nota interna:', error);
      throw error;
    }
  }

  async getInternalMessages(
    conversationId: Types.ObjectId,
    limit: number = 150
  ) {
    try {
      const messages = await InternalMessage.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const chronologicalMessages = messages.reverse();

      console.log(
        `[InternalMessage] ${chronologicalMessages.length} notas internas recuperadas`
      );
      return chronologicalMessages;
    } catch (error) {
      console.error(
        '❌ [InternalMessage] Erro ao buscar notas internas:',
        error
      );
      throw error;
    }
  }
}

export default new InternalMessageService();
