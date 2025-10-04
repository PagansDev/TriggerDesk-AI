import Conversation from '../models/Conversation.js';
import { Types } from 'mongoose';

export class ConversationService {
  async findOrCreateConversation(userId: Types.ObjectId) {
    try {
      let conversation = await Conversation.findOne({
        userId,
        status: 'active',
      });

      if (conversation) {
        console.log(` [Conversation] Conversa existente: ${conversation._id}`);
        return conversation;
      }

      conversation = await Conversation.create({
        userId,
        externalUserId: userId,
        title: 'Chat de Suporte',
        status: 'active',
        lastMessageAt: new Date(),
      });

      console.log(` [Conversation] Nova conversa criada: ${conversation._id}`);
      return conversation;
    } catch (error) {
      console.error('❌ [Conversation] Erro ao buscar/criar conversa:', error);
      throw error;
    }
  }

  async updateLastMessageAt(conversationId: Types.ObjectId) {
    try {
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessageAt: new Date(),
      });
    } catch (error) {
      console.error('❌ [Conversation] Erro ao atualizar timestamp:', error);
    }
  }
}

export default new ConversationService();
