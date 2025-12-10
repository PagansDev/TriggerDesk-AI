import { Server } from 'socket.io';
import { Types } from 'mongoose';
import chatNotificationService from '../../../services/chatNotification.service.js';
import { IAuthenticatedSocket } from '../../../../@types/controllers/chat.controller.d.js';

/**
 * Marcar notificação como lida via socket
 * Aceita tanto { notificationId: string } quanto { notificationIds: string[] }
 */
export async function handleNotificationMarkAsRead(
  io: Server,
  socket: IAuthenticatedSocket,
  data: { notificationId?: string; notificationIds?: string[] }
) {
  try {
    if (!socket.livechatUserId) {
      socket.emit('notification:error', { message: 'Usuário não autenticado' });
      return;
    }

    // Verificar se recebeu array de IDs
    if (data.notificationIds && Array.isArray(data.notificationIds)) {
      if (data.notificationIds.length === 0) {
        socket.emit('notification:error', {
          message: 'Array de notificações vazio'
        });
        return;
      }

      // Validar todos os IDs
      const invalidIds = data.notificationIds.filter(
        (id) => !Types.ObjectId.isValid(id)
      );
      if (invalidIds.length > 0) {
        socket.emit('notification:error', {
          message: 'IDs de notificação inválidos',
          invalidIds,
        });
        return;
      }

      const count = await chatNotificationService.markMultipleAsRead(
        data.notificationIds.map((id) => new Types.ObjectId(id)),
        socket.livechatUserId
      );

      // Confirmar sucesso
      socket.emit('notification:multiple_marked_read', {
        notificationIds: data.notificationIds,
        count,
        success: true,
      });

      // Atualizar contador de não lidas
      const unreadCount = await chatNotificationService.countUnreadNotifications(
        socket.livechatUserId
      );
      socket.emit('notification:unread_count', { count: unreadCount });
      return;
    }

    // Comportamento original: único ID
    if (!data.notificationId || !Types.ObjectId.isValid(data.notificationId)) {
      socket.emit('notification:error', { message: 'ID de notificação inválido' });
      return;
    }

    const notification = await chatNotificationService.markAsRead(
      new Types.ObjectId(data.notificationId),
      socket.livechatUserId
    );

    if (!notification) {
      socket.emit('notification:error', {
        message: 'Notificação não encontrada ou não pertence ao usuário'
      });
      return;
    }

    // Confirmar sucesso
    socket.emit('notification:marked_read', {
      notificationId: data.notificationId,
      success: true,
    });

    // Atualizar contador de não lidas
    const unreadCount = await chatNotificationService.countUnreadNotifications(
      socket.livechatUserId
    );
    socket.emit('notification:unread_count', { count: unreadCount });
  } catch (error) {
    console.error('❌ [Notification] Erro ao marcar notificação como lida:', error);
    socket.emit('notification:error', {
      message: 'Erro ao marcar notificação como lida'
    });
  }
}

/**
 * Deletar notificação via socket
 */
export async function handleNotificationDelete(
  io: Server,
  socket: IAuthenticatedSocket,
  data: { notificationId: string }
) {
  try {
    if (!socket.livechatUserId) {
      socket.emit('notification:error', { message: 'Usuário não autenticado' });
      return;
    }

    if (!data.notificationId || !Types.ObjectId.isValid(data.notificationId)) {
      socket.emit('notification:error', { message: 'ID de notificação inválido' });
      return;
    }

    const deleted = await chatNotificationService.deleteNotification(
      new Types.ObjectId(data.notificationId),
      socket.livechatUserId
    );

    if (!deleted) {
      socket.emit('notification:error', {
        message: 'Notificação não encontrada ou não pertence ao usuário'
      });
      return;
    }

    // Confirmar sucesso
    socket.emit('notification:deleted', {
      notificationId: data.notificationId,
      success: true,
    });

    // Atualizar contador
    const unreadCount = await chatNotificationService.countUnreadNotifications(
      socket.livechatUserId
    );
    socket.emit('notification:unread_count', { count: unreadCount });
  } catch (error) {
    console.error('❌ [Notification] Erro ao deletar notificação:', error);
    socket.emit('notification:error', { message: 'Erro ao deletar notificação' });
  }
}

/**
 * Marcar todas as notificações de uma conversa como lidas via socket
 */
export async function handleNotificationMarkConversationAsRead(
  io: Server,
  socket: IAuthenticatedSocket,
  data: { conversationId: string }
) {
  try {
    if (!socket.livechatUserId) {
      socket.emit('notification:error', { message: 'Usuário não autenticado' });
      return;
    }

    if (!data.conversationId || !Types.ObjectId.isValid(data.conversationId)) {
      socket.emit('notification:error', { message: 'ID de conversa inválido' });
      return;
    }

    const count = await chatNotificationService.markConversationAsRead(
      new Types.ObjectId(data.conversationId),
      socket.livechatUserId
    );

    // Confirmar sucesso
    socket.emit('notification:conversation_marked_read', {
      conversationId: data.conversationId,
      count,
      success: true,
    });

    // Atualizar contador de não lidas
    const unreadCount = await chatNotificationService.countUnreadNotifications(
      socket.livechatUserId
    );
    socket.emit('notification:unread_count', { count: unreadCount });
  } catch (error) {
    console.error('❌ [Notification] Erro ao marcar conversa como lida:', error);
    socket.emit('notification:error', {
      message: 'Erro ao marcar conversa como lida'
    });
  }
}

/**
 * Buscar notificações não lidas via socket
 */
export async function handleNotificationGetUnread(
  io: Server,
  socket: IAuthenticatedSocket
) {
  try {
    if (!socket.livechatUserId) {
      socket.emit('notification:error', { message: 'Usuário não autenticado' });
      return;
    }

    const notifications = await chatNotificationService.getUnreadNotifications(
      socket.livechatUserId
    );

    socket.emit('notification:unread_list', {
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error('❌ [Notification] Erro ao buscar notificações:', error);
    socket.emit('notification:error', {
      message: 'Erro ao buscar notificações'
    });
  }
}

