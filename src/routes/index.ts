import { Router } from 'express';
import { httpAuthMiddleware } from '../middlewares/auth.middleware.js';
import conversationRoutes from './conversation.routes.js';
import userRoutes from './user.routes.js';
import ticketRoutes from './ticket.routes.js';
import internalMessageRoutes from './internalMessage.routes.js';
import internalConversationRoutes from './internalConversation.routes.js';
import imageRoutes from './image.routes.js';
import chatNotificationRoutes from './chatNotification.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

router.use(httpAuthMiddleware);

router.use('/conversations', conversationRoutes);
router.use('/users', userRoutes);
router.use('/tickets', ticketRoutes);
router.use('/internal-messages', internalMessageRoutes);
router.use('/internal-conversations', internalConversationRoutes);
router.use('/images', imageRoutes);
router.use('/chat-notifications', chatNotificationRoutes);

export default router;
