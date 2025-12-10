import ChatNotification from '../models/ChatNotification.js';
import { Types } from 'mongoose';
import type { IChatNotification } from '../../@types/models/chatNotification';

export class ChatNotificationService {
  /**
   * Criar uma nova notificação de chat
   */
  async createNotification(data: {
    userId: Types.ObjectId;
    conversationId: Types.ObjectId;
    ticketId?: Types.ObjectId;
    senderId: Types.ObjectId;
    senderName: string;
    senderRole: 'user' | 'support' | 'admin';
    title: string;
    message: string;
    messagePreview: string;
    messageType: 'text' | 'image';
    metadata?: {
      subject?: string;
      priority?: string;
      imageUrl?: string;
      imageId?: string;
    };
  }): Promise<IChatNotification> {
    try {
      const notification = await ChatNotification.create({
        userId: data.userId,
        conversationId: data.conversationId,
        ticketId: data.ticketId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderRole: data.senderRole,
        title: data.title,
        message: data.message,
        messagePreview: data.messagePreview,
        messageType: data.messageType,
        metadata: data.metadata || null,
        isRead: false,
      });

      return notification;
    } catch (error) {
      console.error('❌ [ChatNotification] Erro ao criar notificação:', error);
      throw error;
    }
  }

  /**
   * Buscar todas as notificações não lidas de um usuário
   */
  async getUnreadNotifications(
    userId: Types.ObjectId,
  ): Promise<IChatNotification[]> {
    try {
      const notifications = await ChatNotification.find({
        userId,
        isRead: false,
      })
        .sort({ createdAt: -1 })
        .populate('conversationId', 'title status')
        .populate('senderId', 'username')
        .lean();

      return notifications as IChatNotification[];
    } catch (error) {
      console.error(
        '❌ [ChatNotification] Erro ao buscar notificações não lidas:',
        error,
      );
      throw error;
    }
  }

  /**
   * Buscar todas as notificações de um usuário (lidas e não lidas)
   */
  async getAllNotifications(
    userId: Types.ObjectId,
    limit: number = 50,
  ): Promise<IChatNotification[]> {
    try {
      const notifications = await ChatNotification.find({
        userId,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('conversationId', 'title status')
        .populate('senderId', 'username')
        .lean();

      return notifications as IChatNotification[];
    } catch (error) {
      console.error(
        '❌ [ChatNotification] Erro ao buscar todas as notificações:',
        error,
      );
      throw error;
    }
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(
    notificationId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<IChatNotification | null> {
    try {
      const notification = await ChatNotification.findOneAndUpdate(
        {
          _id: notificationId,
          userId, // Garantir que só o dono pode marcar como lida
        },
        {
          isRead: true,
          readAt: new Date(),
        },
        { new: true },
      );

      return notification;
    } catch (error) {
      console.error(
        '❌ [ChatNotification] Erro ao marcar notificação como lida:',
        error,
      );
      throw error;
    }
  }

  /**
   * Marcar múltiplas notificações como lidas
   */
  async markMultipleAsRead(
    notificationIds: Types.ObjectId[],
    userId: Types.ObjectId,
  ): Promise<number> {
    try {
      if (!notificationIds || notificationIds.length === 0) {
        return 0;
      }

      const result = await ChatNotification.updateMany(
        {
          _id: { $in: notificationIds },
          userId, // Garantir que só o dono pode marcar como lida
          isRead: false, // Apenas marcar as não lidas
        },
        {
          isRead: true,
          readAt: new Date(),
        },
      );

      return result.modifiedCount || 0;
    } catch (error) {
      console.error(
        '❌ [ChatNotification] Erro ao marcar múltiplas notificações como lidas:',
        error,
      );
      throw error;
    }
  }

  /**
   * Marcar todas as notificações de uma conversa como lidas
   */
  async markConversationAsRead(
    conversationId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<number> {
    try {
      const result = await ChatNotification.updateMany(
        {
          conversationId,
          userId,
          isRead: false,
        },
        {
          isRead: true,
          readAt: new Date(),
        },
      );

      return result.modifiedCount || 0;
    } catch (error) {
      console.error(
        '❌ [ChatNotification] Erro ao marcar conversa como lida:',
        error,
      );
      throw error;
    }
  }

  /**
   * Deletar notificação
   */
  async deleteNotification(
    notificationId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<boolean> {
    try {
      const result = await ChatNotification.deleteOne({
        _id: notificationId,
        userId, // Garantir que só o dono pode deletar
      });

      if (result.deletedCount > 0) {
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        '❌ [ChatNotification] Erro ao deletar notificação:',
        error,
      );
      throw error;
    }
  }

  /**
   * Deletar todas as notificações de uma conversa
   */
  async deleteConversationNotifications(
    conversationId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<number> {
    try {
      const result = await ChatNotification.deleteMany({
        conversationId,
        userId,
      });

      return result.deletedCount || 0;
    } catch (error) {
      console.error(
        '❌ [ChatNotification] Erro ao deletar notificações da conversa:',
        error,
      );
      throw error;
    }
  }

  /**
   * Deletar todas as notificações lidas de um usuário
   */
  async deleteReadNotifications(userId: Types.ObjectId): Promise<number> {
    try {
      const result = await ChatNotification.deleteMany({
        userId,
        isRead: true,
      });

      return result.deletedCount || 0;
    } catch (error) {
      console.error(
        '❌ [ChatNotification] Erro ao deletar notificações lidas:',
        error,
      );
      throw error;
    }
  }

  /**
   * Contar notificações não lidas de um usuário
   */
  async countUnreadNotifications(userId: Types.ObjectId): Promise<number> {
    try {
      const count = await ChatNotification.countDocuments({
        userId,
        isRead: false,
      });

      return count;
    } catch (error) {
      console.error(
        '❌ [ChatNotification] Erro ao contar notificações não lidas:',
        error,
      );
      throw error;
    }
  }
}

export default new ChatNotificationService();
