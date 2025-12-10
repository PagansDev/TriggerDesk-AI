import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Ticket from '../models/Ticket.js';

export class TicketController {
  async createTicket(req: Request, res: Response) {
    try {
      const { conversationId, subject, description, priority } = req.body;

      if (!Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ error: 'ID da conversa inválido' });
      }

      const ticket = await Ticket.create({
        conversationId: new Types.ObjectId(conversationId),
        subject,
        description,
        priority: priority || 'medium',
      });

      return res.status(201).json(ticket);
    } catch (error) {
      console.error('❌ [TicketController] Erro ao criar ticket:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getTickets(req: Request, res: Response) {
    try {
      const { status, priority } = req.query;

      const filter: any = {};
      if (status) filter.status = status;
      if (priority) filter.priority = priority;

      const tickets = await Ticket.find(filter)
        .sort({ createdAt: -1 })
        .populate('externalUserId', 'username externalUserId')
        .populate('assignedTo', 'username externalUserId');

      return res.json(tickets);
    } catch (error) {
      console.error('❌ [TicketController] Erro ao buscar tickets:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getTicketById(req: Request, res: Response) {
    try {
      const id = req.params['id'];

      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const ticket = await Ticket.findById(id)
        .populate('externalUserId', 'username externalUserId')
        .populate('assignedTo', 'username externalUserId');

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket não encontrado' });
      }

      return res.json(ticket);
    } catch (error) {
      console.error('❌ [TicketController] Erro ao buscar ticket:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async updateTicket(req: Request, res: Response) {
    try {
      const id = req.params['id'];
      const updates = req.body;

      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const allowedUpdates = [
        'status',
        'priority',
        'assignedTo',
        'subject',
        'unreadCountUser',
        'unreadCountSupport',
        'unreadCountAdmin',
      ];

      const updateData: any = {};
      Object.keys(updates).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          updateData[key] = updates[key];
        }
      });

      const ticket = await Ticket.findByIdAndUpdate(id, updateData, {
        new: true,
      })
        .populate('externalUserId', 'username externalUserId')
        .populate('assignedTo', 'username externalUserId');

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket não encontrado' });
      }

      return res.json(ticket);
    } catch (error) {
      console.error('❌ [TicketController] Erro ao atualizar ticket:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

export default new TicketController();

