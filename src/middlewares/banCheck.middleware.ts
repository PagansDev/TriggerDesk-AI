import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';

export interface BanCheckRequest extends Request {
  userId?: string;
}

export const checkUserBan = async (
  req: BanCheckRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId || req.params['userId'];

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'ID do usuário é obrigatório',
      });
      return;
    }

    const user = await User.findOne({
      $or: [{ _id: userId }, { externalUserId: userId }],
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
      });
      return;
    }

    if (user.isBanned) {
      if (user.bannedUntil && new Date() > user.bannedUntil) {
        await User.findByIdAndUpdate(user._id, {
          isBanned: false,
          bannedAt: null,
          bannedUntil: null,
        });

        req.userId = user._id.toString();
        next();
      } else {

        res.status(403).json({
          success: false,
          error: 'Usuário está temporariamente suspenso',
          userBanned: true,
          banExpiresAt: user.bannedUntil,
        });
        return;
      }
    } else {

      req.userId = user._id.toString();
      next();
    }
  } catch (error) {
    console.error('❌ [BanCheck] Erro ao verificar ban:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
};

