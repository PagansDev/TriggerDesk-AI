import { Router } from 'express';
import chatNotificationController from '../controllers/chatNotification.controller.js';
import { httpAuthMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas as rotas requerem autenticação
router.use(httpAuthMiddleware);

// Buscar notificações não lidas
router.get('/', chatNotificationController.getUnreadNotifications);

// Buscar todas as notificações (com limite)
router.get('/all', chatNotificationController.getAllNotifications);

// Contar notificações não lidas
router.get('/count', chatNotificationController.getUnreadCount);

// Marcar notificação como lida
router.patch('/:id/read', chatNotificationController.markAsRead);

// Marcar todas as notificações de uma conversa como lidas
router.patch(
  '/conversation/:conversationId/read',
  chatNotificationController.markConversationAsRead
);

// Deletar notificação
router.delete('/:id', chatNotificationController.deleteNotification);

// Deletar todas as notificações de uma conversa
router.delete(
  '/conversation/:conversationId',
  chatNotificationController.deleteConversationNotifications
);

// Deletar todas as notificações lidas
router.delete('/read', chatNotificationController.deleteReadNotifications);

export default router;

