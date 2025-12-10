import { Response, NextFunction } from 'express';
import { IAuthenticatedRequest } from '../../@types/middlewares/auth.middleware.d.js';

export const requireSupport = (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.userRole) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  if (req.userRole !== 'admin' && req.userRole !== 'support') {
    return res
      .status(403)
      .json({ error: 'Acesso negado. Apenas admin/support' });
  }

  return next();
};

export const requireAdmin = (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.userRole) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas admin' });
  }

  return next();
};
