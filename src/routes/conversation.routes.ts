import { Router } from 'express';
import conversationController from '../controllers/conversation.controller.js';
import { httpAuthMiddleware } from '../middlewares/auth.middleware.js';
import { requireSupport } from '../middlewares/role.middleware.js';

const router = Router();

router.use(httpAuthMiddleware);

router.get('/', requireSupport, conversationController.getConversations);

router.get('/:id', requireSupport, conversationController.getConversationById);

router.get('/:id/messages', conversationController.getConversationMessages);

router.patch('/:id', requireSupport, conversationController.updateConversation);

router.patch(
  '/:id/assign',
  requireSupport,
  conversationController.assignOperator
);

router.post(
  '/:id/mark-read',
  requireSupport,
  conversationController.markConversationAsRead
);

export default router;
