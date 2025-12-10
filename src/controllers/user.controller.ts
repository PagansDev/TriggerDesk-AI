import { Request, Response } from 'express';
import { Types } from 'mongoose';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';

export class UserController {
  async getSupportUsers(req: Request, res: Response) {
    try {
      const supportUsers = await User.find({
        role: { $in: ['support', 'admin'] },
      })
        .select('_id username email role isOnline lastSeen externalUserId')
        .lean();

      const formattedUsers = supportUsers.map((user) => ({
        _id: user.externalUserId || user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isOnline: user.isOnline,
      }));

      return res.json(formattedUsers);
    } catch (error) {
      console.error(
        '❌ [UserController] Erro ao buscar usuários de suporte:',
        error
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
  async createUser(req: Request, res: Response) {
    try {
      const { username, externalUserId } = req.body;

      const user = await User.create({
        username,
        externalUserId,
      });

      return res.status(201).json(user);
    } catch (error) {
      console.error('❌ [UserController] Erro ao criar usuário:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const id = req.params['id'];

      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      return res.json(user);
    } catch (error) {
      console.error('❌ [UserController] Erro ao buscar usuário:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getUserConversations(req: Request, res: Response) {
    try {
      const externalUserId = req.params['userId'];

      const user = await User.findOne({ externalUserId });

      if (!user) {
        return res.json([]);
      }

      const conversations = await Conversation.find({
        userId: user._id,
      })
        .sort({ lastMessageAt: -1 })
        .populate('ticketId', '_id priority status subject');

      return res.json(conversations);
    } catch (error) {
      console.error(
        '❌ [UserController] Erro ao buscar conversas do usuário:',
        error
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async banUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      console.log('[UserController] banUser - userId:', id);

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID do usuário é obrigatório',
        });
      }

      const bannedUntil = new Date();
      bannedUntil.setDate(bannedUntil.getDate() + 2);

      const user = await User.findByIdAndUpdate(
        id,
        {
          isBanned: true,
          bannedAt: new Date(),
          bannedUntil: bannedUntil,
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
        });
      }

      console.log(
        `[UserController] Usuário banido: ${id} até ${bannedUntil.toISOString()}`
      );

      return res.json({
        success: true,
        message: 'Usuário banido com sucesso',
        data: { user },
      });
    } catch (error) {
      console.error('❌ [UserController] Erro ao banir usuário:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }

  async unbanUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID do usuário é obrigatório',
        });
      }

      const user = await User.findByIdAndUpdate(
        id,
        {
          isBanned: false,
          bannedAt: null,
          bannedUntil: null,
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
        });
      }

      console.log(`[UserController] Usuário desbanido: ${id}`);

      return res.json({
        success: true,
        message: 'Usuário desbanido com sucesso',
        data: { user },
      });
    } catch (error) {
      console.error('❌ [UserController] Erro ao desbanir usuário:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      });
    }
  }
}

export default new UserController();
