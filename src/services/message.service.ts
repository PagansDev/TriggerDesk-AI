import Message from '../models/Message.js';
import { Types } from 'mongoose';

export interface CreateMessageData {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
  isFromAI: boolean;
  metadata?: {
    imageUrl?: string;
    imageId?: string;
    filename?: string;
    size?: number;
    mimetype?: string;
  };
}

export class MessageService {
  async createMessage(data: CreateMessageData) {
    try {
      // Para mensagens de imagem, permitir conteúdo vazio
      const content = data.messageType === 'image' && !data.content.trim()
        ? ''
        : data.content;

      // Garantir que metadata de imagem sempre tenha imageUrl
      let metadata = data.metadata || null;
      if (data.messageType === 'image' && metadata) {
        // Se tiver imageId mas não tiver imageUrl, construir imageUrl
        if (metadata.imageId && !metadata.imageUrl) {
          metadata = {
            ...metadata,
            imageUrl: `/api/images/${metadata.imageId}`,
          };
        }
        // Se tiver imageUrl mas não tiver imageId, tentar extrair do imageUrl
        else if (metadata.imageUrl && !metadata.imageId) {
          // Extrair imageId do imageUrl se for formato /api/images/{id}
          const match = metadata.imageUrl.match(/\/api\/images\/([^\/]+)/);
          if (match && match[1]) {
            metadata = {
              ...metadata,
              imageId: match[1],
            };
          }
        }
      }

      const message = await Message.create({
        conversationId: data.conversationId,
        senderId: data.senderId,
        content,
        messageType: data.messageType || 'text',
        isFromAI: data.isFromAI,
        metadata: metadata,
      });

      return message;
    } catch (error) {
      console.error('❌ [Message] Erro ao criar mensagem:', error);
      throw error;
    }
  }

  async getRecentMessages(conversationId: Types.ObjectId, limit: number = 150) {
    try {
      const messages = await Message.find({
        conversationId,
        $or: [
          { isInternal: { $exists: false } },
          { isInternal: false }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('senderId', '_id username externalUserId role')
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

  async hasBingXMessage(conversationId: Types.ObjectId): Promise<boolean> {
    try {
      const messages = await Message.find({
        conversationId,
        isFromAI: true,
        content: { $regex: /bingx|BingX/i }
      })
        .limit(1)
        .lean();

      return messages.length > 0;
    } catch (error) {
      console.error('❌ [Message] Erro ao verificar mensagem BingX:', error);
      return false;
    }
  }

  async hasRepetitiveEmpathyPhrases(conversationId: Types.ObjectId): Promise<boolean> {
    try {
      // Padrões de frases repetitivas de empatia
      const empathyPatterns = [
        /entendo sua frustração/i,
        /entendo sua preocupação/i,
        /entendo sua dúvida/i,
        /entendo sua (?:inquietação|ansiedade|preocupação|dúvida)/i,
        /compreendo sua frustração/i,
        /compreendo sua preocupação/i
      ];

      const messages = await Message.find({
        conversationId,
        isFromAI: true
      })
        .lean();

      // Verificar se alguma mensagem contém alguma das frases repetitivas
      for (const message of messages) {
        const content = message.content || '';
        for (const pattern of empathyPatterns) {
          if (pattern.test(content)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('❌ [Message] Erro ao verificar frases repetitivas:', error);
      return false;
    }
  }
}

export default new MessageService();
