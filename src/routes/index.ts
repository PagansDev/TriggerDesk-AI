import { Router } from 'express';
import { Types } from 'mongoose';
import User from '../models/User';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import Ticket from '../models/Ticket';

const router = Router();

router.get('/users/:id', async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/conversations', async (req, res) => {
  try {
    const { userId, externalUserId, title } = req.body;

    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(externalUserId)) {
      return res.status(400).json({ error: 'ID do usuário inválido' });
    }

    const conversation = await Conversation.create({
      userId: new Types.ObjectId(userId),
      externalUserId: new Types.ObjectId(externalUserId),
      title: title || 'Nova conversa',
    });

    return res.status(201).json(conversation);
  } catch (error) {
    console.error('Erro ao criar conversa:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/conversations/:id', async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversa não encontrada' });
    }

    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username externalUserId');

    return res.json({
      ...conversation.toObject(),
      messages,
    });
  } catch (error) {
    console.error('Erro ao buscar conversa:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/conversations/user/:userId', async (req, res) => {
  try {
    if (!Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'ID do usuário inválido' });
    }

    const conversations = await Conversation.find({
      userId: req.params.userId,
    }).sort({ lastMessageAt: -1 });

    return res.json(conversations);
  } catch (error) {
    console.error('Erro ao buscar conversas do usuário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/tickets', async (req, res) => {
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
    console.error('Erro ao criar ticket:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/tickets', async (req, res) => {
  try {
    const { status, priority } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .populate('conversationId', 'title')
      .populate('assignedTo', 'name email');

    return res.json(tickets);
  } catch (error) {
    console.error('Erro ao buscar tickets:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
