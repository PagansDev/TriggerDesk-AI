import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { parseCookies } from '../utils/cookieParser.js';

interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  type: string;
  iat: number;
  exp: number;
}

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      console.log('❌ [Auth] Sem cookies na requisição');
      return next(new Error('Autenticação necessária'));
    }

    const cookies = parseCookies(cookieHeader);
    const accessToken = cookies['accessToken'];

    if (!accessToken) {
      console.log('❌ [Auth] Token de acesso não encontrado');
      return next(new Error('Token de acesso não encontrado'));
    }

    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      console.error('❌ [Auth] JWT_SECRET não configurado');
      return next(new Error('Configuração inválida do servidor'));
    }

    const decoded = jwt.verify(accessToken, secret, {
      algorithms: ['HS512'],
    }) as JWTPayload;

    if (decoded.type !== 'access') {
      console.log('❌ [Auth] Tipo de token inválido:', decoded.type);
      return next(new Error('Tipo de token inválido'));
    }

    (socket as any).userId = decoded.userId;
    (socket as any).username = decoded.username;
    (socket as any).userEmail = decoded.email;
    (socket as any).userRole = decoded.role;

    // Capturar contexto de suporte enviado pelo frontend
    const auth = socket.handshake.auth as any;
    const supportContext = auth?.['supportContext'];
    if (supportContext) {
      (socket as any).supportContext = supportContext;
      console.log(
        `[Auth] Contexto de suporte recebido: ExchangeRates=${!!supportContext[
          'exchangeRates'
        ]}, DashboardData=${!!supportContext['dashboardData']}`
      );
    }

    console.log(
      `[Auth] Usuário autenticado: ${decoded.username} (${decoded.userId})`
    );

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('❌ [Auth] Token expirado');
      return next(new Error('Token expirado'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      console.log('❌ [Auth] Token inválido:', error.message);
      return next(new Error('Token inválido'));
    }
    console.error('❌ [Auth] Erro na autenticação:', error);
    return next(new Error('Erro na autenticação'));
  }
};
