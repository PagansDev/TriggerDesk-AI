import { Router } from 'express';
import internalConversationController from '../controllers/internalConversation.controller.js';
import { requireSupport } from '../middlewares/role.middleware.js';

const router = Router();

router.get(
  '/general',
  requireSupport,
  internalConversationController.getOrCreateGeneral
);
router.get('/', requireSupport, internalConversationController.listRooms);
router.post('/', requireSupport, internalConversationController.createRoom);

// Rota PUT deve vir ANTES das rotas mais específicas para evitar conflitos
router.put(
  '/:id',
  requireSupport,
  internalConversationController.updateRoom
);

// Rotas específicas com parâmetros
router.get(
  '/:id/messages',
  requireSupport,
  internalConversationController.getRoomMessages
);
router.post(
  '/:id/messages',
  requireSupport,
  internalConversationController.sendMessage
);
router.post(
  '/:id/mark-read',
  requireSupport,
  internalConversationController.markRoomAsRead
);

export default router;
