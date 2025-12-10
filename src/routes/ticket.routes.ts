import { Router } from 'express';
import ticketController from '../controllers/ticket.controller.js';
import { httpAuthMiddleware } from '../middlewares/auth.middleware.js';
import { requireSupport } from '../middlewares/role.middleware.js';

const router = Router();

router.use(httpAuthMiddleware);
router.use(requireSupport);

router.post('/', ticketController.createTicket);

router.get('/', ticketController.getTickets);

router.get('/:id', ticketController.getTicketById);

router.patch('/:id', ticketController.updateTicket);

export default router;
