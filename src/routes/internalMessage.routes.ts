import { Router } from 'express';
import internalMessageController from '../controllers/internalMessage.controller.js';
import { httpAuthMiddleware } from '../middlewares/auth.middleware.js';
import { requireSupport } from '../middlewares/role.middleware.js';

const router = Router();

router.use(httpAuthMiddleware);
router.use(requireSupport);

router.get(
  '/conversation/:conversationId',
  internalMessageController.getInternalMessages
);

router.patch('/:id', internalMessageController.updateInternalMessage);

router.delete('/:id', internalMessageController.deleteInternalMessage);

export default router;
