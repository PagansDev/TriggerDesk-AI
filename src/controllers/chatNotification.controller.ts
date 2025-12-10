import { Request, Response } from 'express';
import { Types } from 'mongoose';
import chatNotificationService from '../services/chatNotification.service.js';
import type { IAuthenticatedRequest } from '../../@types/middlewares/auth.middleware.d.js';

export class ChatNotificationController {
  // Busca todas as notificações não lidas do usuário autenticado
  async getUnreadNotifications(req: IAuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({
        externalUserId: req.userId,
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const notifications = await chatNotificationService.getUnreadNotifications(
        user._id as Types.ObjectId
      );

      return res.json({
        success: true,
        data: notifications,
        count: notifications.length,
      });
    } catch (error) {
      console.error(
        '❌ [ChatNotificationController] Erro ao buscar notificações:',
        error
      );
      return res.status(500).json({
        error: 'Erro ao buscar notificações',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Busca todas as notificações do usuário (lidas e não lidas)
  async getAllNotifications(req: IAuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const limit = parseInt(req.query['limit'] as string) || 50;

      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({
        externalUserId: req.userId,
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const notifications = await chatNotificationService.getAllNotifications(
        user._id as Types.ObjectId,
        limit
      );

      return res.json({
        success: true,
        data: notifications,
        count: notifications.length,
      });
    } catch (error) {
      console.error(
        '❌ [ChatNotificationController] Erro ao buscar todas as notificações:',
        error
      );
      return res.status(500).json({
        error: 'Erro ao buscar notificações',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Contar notificações não lidas do usuário
  async getUnreadCount(req: IAuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({
        externalUserId: req.userId,
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const count = await chatNotificationService.countUnreadNotifications(
        user._id as Types.ObjectId
      );

      return res.json({
        success: true,
        count,
      });
    } catch (error) {
      console.error(
        '❌ [ChatNotificationController] Erro ao contar notificações:',
        error
      );
      return res.status(500).json({
        error: 'Erro ao contar notificações',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Marca notificação como lida (aceita um único ID ou array de IDs no body)
  async markAsRead(req: IAuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({
        externalUserId: req.userId,
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verifica se recebeu array de IDs no body ou um único ID no params
      const notificationIds = req.body?.notificationIds;
      const { id } = req.params;

      // Se recebeu array no body, processa múltiplas notificações
      if (notificationIds && Array.isArray(notificationIds)) {
        if (notificationIds.length === 0) {
          return res.status(400).json({ error: 'Array de notificações vazio' });
        }

        // Valida todos os IDs
        const invalidIds = notificationIds.filter(
          (id: string) => !Types.ObjectId.isValid(id)
        );
        if (invalidIds.length > 0) {
          return res.status(400).json({
            error: 'IDs de notificação inválidos',
            invalidIds,
          });
        }

        const count = await chatNotificationService.markMultipleAsRead(
          notificationIds.map((id: string) => new Types.ObjectId(id)),
          user._id as Types.ObjectId
        );

        return res.json({
          success: true,
          count,
          message: `${count} notificação(ões) marcada(s) como lida(s)`,
        });
      }

      // Único ID no params
      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de notificação inválido' });
      }

      const notification = await chatNotificationService.markAsRead(
        new Types.ObjectId(id),
        user._id as Types.ObjectId
      );

      if (!notification) {
        return res.status(404).json({
          error: 'Notificação não encontrada ou não pertence ao usuário',
        });
      }

      return res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      console.error(
        '❌ [ChatNotificationController] Erro ao marcar notificação como lida:',
        error
      );
      return res.status(500).json({
        error: 'Erro ao marcar notificação como lida',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Marca todas as notificações de uma conversa como lidas
  async markConversationAsRead(
    req: IAuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { conversationId } = req.params;

      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ error: 'ID de conversa inválido' });
      }

      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({
        externalUserId: req.userId,
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const count = await chatNotificationService.markConversationAsRead(
        new Types.ObjectId(conversationId),
        user._id as Types.ObjectId
      );

      return res.json({
        success: true,
        count,
        message: `${count} notificação(ões) marcada(s) como lida(s)`,
      });
    } catch (error) {
      console.error(
        '❌ [ChatNotificationController] Erro ao marcar conversa como lida:',
        error
      );
      return res.status(500).json({
        error: 'Erro ao marcar conversa como lida',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Deleta notificação
  async deleteNotification(req: IAuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;

      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de notificação inválido' });
      }

      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({
        externalUserId: req.userId,
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const deleted = await chatNotificationService.deleteNotification(
        new Types.ObjectId(id),
        user._id as Types.ObjectId
      );

      if (!deleted) {
        return res.status(404).json({
          error: 'Notificação não encontrada ou não pertence ao usuário',
        });
      }

      return res.json({
        success: true,
        message: 'Notificação deletada com sucesso',
      });
    } catch (error) {
      console.error(
        '❌ [ChatNotificationController] Erro ao deletar notificação:',
        error
      );
      return res.status(500).json({
        error: 'Erro ao deletar notificação',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Deleta todas as notificações de uma conversa
  async deleteConversationNotifications(
    req: IAuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { conversationId } = req.params;

      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ error: 'ID de conversa inválido' });
      }

      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({
        externalUserId: req.userId,
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const count = await chatNotificationService.deleteConversationNotifications(
        new Types.ObjectId(conversationId),
        user._id as Types.ObjectId
      );

      return res.json({
        success: true,
        count,
        message: `${count} notificação(ões) deletada(s)`,
      });
    } catch (error) {
      console.error(
        '❌ [ChatNotificationController] Erro ao deletar notificações da conversa:',
        error
      );
      return res.status(500).json({
        error: 'Erro ao deletar notificações da conversa',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Deleta todas as notificações lidas do usuário
  async deleteReadNotifications(req: IAuthenticatedRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const User = (await import('../models/User.js')).default;
      const user = await User.findOne({
        externalUserId: req.userId,
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const count = await chatNotificationService.deleteReadNotifications(
        user._id as Types.ObjectId
      );

      return res.json({
        success: true,
        count,
        message: `${count} notificação(ões) lida(s) deletada(s)`,
      });
    } catch (error) {
      console.error(
        '❌ [ChatNotificationController] Erro ao deletar notificações lidas:',
        error
      );
      return res.status(500).json({
        error: 'Erro ao deletar notificações lidas',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
}

export default new ChatNotificationController();

