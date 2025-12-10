import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import { httpAuthMiddleware } from '../middlewares/auth.middleware.js';
import { requireSupport } from '../middlewares/role.middleware.js';

const router = Router();

router.use(httpAuthMiddleware);

router.get('/support', requireSupport, userController.getSupportUsers);

router.post('/', userController.createUser);

router.get('/:id', userController.getUserById);

router.get(
  '/external/:userId/conversations',
  userController.getUserConversations
);

router.patch('/:id/ban', requireSupport, userController.banUser);

router.patch('/:id/unban', requireSupport, userController.unbanUser);

export default router;
