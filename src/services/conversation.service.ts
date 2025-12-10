import chatService from './chat.service.js';
import Conversation from '../models/Conversation.js';
import { Types } from 'mongoose';

export class ConversationService {
  async findOrCreateConversation(
    conversationId: Types.ObjectId | undefined,
    userId: Types.ObjectId
  ) {
    try {
      if (conversationId) {
        const conversation = await Conversation.findOne({
          _id: conversationId,
        });

        if (conversation) {
          console.log(
            `[Conversation] Conversa existente: ${conversation._id}`
          );
          return conversation;
        }
      }

      const conversation = await Conversation.create({
        userId,
        externalUserId: userId,
        title: 'Chat de Suporte',
        status: 'active',
        lastMessageAt: new Date(),
      });

      console.log(`[Conversation] Nova conversa criada: ${conversation._id}`);
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

  async findConversationById(conversationId: Types.ObjectId) {
    try {
      return await Conversation.findById(conversationId);
    } catch (error) {
      console.error('❌ [Conversation] Erro ao buscar conversa:', error);
      throw error;
    }
  }

  async updateConversationTitle(conversationId: Types.ObjectId) {
    try {
      const title = await chatService.generateConversationTitle(conversationId);

      if (!title) {
        console.log(
          '[Title] Não atualizando título - conversa já tem título definido'
        );
        return;
      }
      await Conversation.findByIdAndUpdate(conversationId, {
        title: title,
      });
      console.log(`[Conversation] Título atualizado para: ${title}`);
    } catch (error) {
      console.error(
        '❌ [Conversation] Erro ao atualizar título da conversa:',
        error
      );
    }
  }
}

export default new ConversationService();
