import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { Request, Response, NextFunction } from 'express';
import { parseCookies } from '../utils/cookieParser.js';
import {
  IJWTPayload,
  IAuthenticatedRequest,
} from '../../@types/middlewares/auth.middleware.d.js';

/**
 * ⚡ CONFIGURAÇÕES CENTRALIZADAS DE TEMPO DE TOKEN ⚡
 * Mesmos valores do bravo/src/utils/cookieUtils.js para garantir consistência
 */
const TOKEN_DURATIONS = {
  ACCESS_TOKEN: {
    DEVELOPMENT: 60 * 60, // 1 hora em segundos
    PRODUCTION: 60 * 60, // 1 hora em segundos
  },
  REFRESH_TOKEN: {
    DEVELOPMENT: 24 * 60 * 60, // 24 horas (1 dia) em segundos
    PRODUCTION: 7 * 24 * 60 * 60, // 7 dias em segundos
  },
};

/**
 * Obtém duração do token em segundos baseado no ambiente
 */
const getTokenDurationSeconds = (
  tokenType: 'ACCESS_TOKEN' | 'REFRESH_TOKEN',
): number => {
  const isDev = process.env['NODE_ENV'] === 'development';
  return isDev
    ? TOKEN_DURATIONS[tokenType].DEVELOPMENT
    : TOKEN_DURATIONS[tokenType].PRODUCTION;
};

/**
 * Obtém duração do token em milissegundos (para cookies)
 */
const getTokenDurationMilliseconds = (
  tokenType: 'ACCESS_TOKEN' | 'REFRESH_TOKEN',
): number => {
  return getTokenDurationSeconds(tokenType) * 1000;
};

/**
 * Tenta fazer refresh do token usando o refreshToken
 * @param refreshToken - Token de refresh para renovar
 * @returns Novos tokens ou null em caso de falha
 */
const attemptTokenRefresh = async (
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> => {
  try {
    // Determinar URL do bravo baseado em variáveis de ambiente
    let bravoUrl = process.env['BRAVO_URL'];

    if (!bravoUrl) {
      // Tentar derivar do FRONTEND_URL
      const frontendUrl = process.env['FRONTEND_URL'];
      if (frontendUrl) {
        // Se for localhost, usar porta padrão do bravo
        if (frontendUrl.includes('localhost')) {
          bravoUrl = 'http://localhost:3030';
        } else {
          // Em produção, assumir que bravo está no mesmo domínio
          // Remover porta e path se houver
          const url = new URL(frontendUrl);
          bravoUrl = `${url.protocol}//${url.hostname}`;
        }
      } else {
        bravoUrl = 'http://localhost:3030';
      }
    }

    // Validação de segurança: garantir que é uma URL válida e permitida
    let bravoUrlObj: URL;
    try {
      bravoUrlObj = new URL(bravoUrl);
    } catch (error) {
      console.error('[Auth] URL do bravo inválida:', bravoUrl);
      return null;
    }

    // Validar protocolo (apenas http/https)
    if (bravoUrlObj.protocol !== 'http:' && bravoUrlObj.protocol !== 'https:') {
      console.error(
        '[Auth] Protocolo inválido para BRAVO_URL:',
        bravoUrlObj.protocol,
      );
      return null;
    }

    // Em desenvolvimento, permitir localhost e endereços privados
    // Em produção, bloquear para prevenir ataques SSRF
    const isProduction = process.env['NODE_ENV'] === 'production';
    const isDevelopment = !isProduction;

    // Em desenvolvimento, permitir qualquer URL (incluindo localhost)
    if (isDevelopment) {
      // Permitir localhost e endereços privados em desenvolvimento
      // Nenhuma validação adicional necessária
    } else if (isProduction) {
      // Em produção, aplicar validações de segurança rigorosas
      const hostname = bravoUrlObj.hostname.toLowerCase();

      // Verificar localhost e loopback
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1'
      ) {
        console.error('[Auth] Localhost não permitido em produção:', hostname);
        return null;
      }

      // Verificar endereços privados (RFC 1918)
      // 192.168.0.0/16
      if (hostname.startsWith('192.168.')) {
        console.error(
          '[Auth] Endereço privado não permitido em produção:',
          hostname,
        );
        return null;
      }

      // 10.0.0.0/8
      if (hostname.startsWith('10.')) {
        console.error(
          '[Auth] Endereço privado não permitido em produção:',
          hostname,
        );
        return null;
      }

      // 172.16.0.0/12 (172.16.0.0 até 172.31.255.255)
      const ipParts = hostname.split('.');
      if (ipParts.length === 4 && ipParts[0] && ipParts[1]) {
        const firstOctet = parseInt(ipParts[0], 10);
        const secondOctet = parseInt(ipParts[1], 10);
        if (
          !isNaN(firstOctet) &&
          !isNaN(secondOctet) &&
          firstOctet === 172 &&
          secondOctet >= 16 &&
          secondOctet <= 31
        ) {
          console.error(
            '[Auth] Endereço privado não permitido em produção:',
            hostname,
          );
          return null;
        }
      }
    }

    const response = await fetch(`${bravoUrl}/api/users/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refreshToken=${refreshToken}`,
      },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // Tentar extrair tokens dos headers Set-Cookie
        // Set-Cookie pode vir como string única ou array
        const setCookieHeader = response.headers.get('set-cookie');
        const setCookieArray = response.headers.getSetCookie?.() || [];

        const cookies: Record<string, string> = {};

        // Processar array de cookies (método preferido)
        if (setCookieArray.length > 0) {
          for (const cookieStr of setCookieArray) {
            const parts = cookieStr.trim().split(';');
            const nameValue = parts[0];
            if (nameValue) {
              const [name, value] = nameValue.trim().split('=');
              if (name && value) {
                cookies[name] = decodeURIComponent(value);
              }
            }
          }
        } else if (setCookieHeader) {
          // Fallback: processar como string (pode ter múltiplos cookies separados por vírgula)
          // Mas precisa ser cuidadoso pois vírgulas podem aparecer em valores também
          const cookieStrings = setCookieHeader.split(/,(?=\w+=)/);

          for (const cookieStr of cookieStrings) {
            const parts = cookieStr.trim().split(';');
            const nameValue = parts[0];
            if (nameValue) {
              const [name, value] = nameValue.trim().split('=');
              if (name && value) {
                cookies[name] = decodeURIComponent(value);
              }
            }
          }
        }

        if (cookies['accessToken'] && cookies['refreshToken']) {
          return {
            accessToken: cookies['accessToken'],
            refreshToken: cookies['refreshToken'],
          };
        }

        // Se não conseguiu extrair dos cookies Set-Cookie,
        // o refresh foi bem-sucedido mas não conseguimos os tokens aqui
        // Os cookies foram definidos no bravo, mas não podemos usá-los no golf
        // Neste caso, retornar null para forçar novo login
        console.warn(
          '[Auth] Refresh bem-sucedido mas não foi possível extrair tokens dos cookies',
        );
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('[Auth] Erro ao tentar refresh:', error);
    return null;
  }
};

/**
 * Define cookies de autenticação na resposta
 * Usa as mesmas configurações de segurança e tempos do bravo para consistência
 */
const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
): void => {
  const isProduction = process.env['NODE_ENV'] === 'production';

  // Configurações base - mesmas do bravo para consistência
  const cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    maxAge: number;
    domain?: string;
  } = {
    httpOnly: true, // JavaScript não pode acessar (segurança)
    secure: isProduction, // Apenas HTTPS em produção
    sameSite: 'lax', // Proteção CSRF
    path: '/',
    maxAge: getTokenDurationMilliseconds('REFRESH_TOKEN'), // Usar valor centralizado
  };

  // Adicionar domain compartilhado em produção se configurado (mesmo do bravo)
  if (isProduction && process.env['COOKIE_DOMAIN']) {
    cookieOptions.domain = process.env['COOKIE_DOMAIN'];
  }

  // Usar valores centralizados do TOKEN_DURATIONS
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: getTokenDurationMilliseconds('ACCESS_TOKEN'),
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: getTokenDurationMilliseconds('REFRESH_TOKEN'),
  });
};

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      console.log('❌ [Auth] Sem cookies na requisição');
      return next(new Error('Autenticação necessária'));
    }

    const cookies = parseCookies(cookieHeader);
    let accessToken = cookies['accessToken'];
    const refreshToken = cookies['refreshToken'];

    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      console.error('❌ [Auth] JWT_SECRET não configurado');
      return next(new Error('Configuração inválida do servidor'));
    }

    // Se não tem accessToken mas tem refreshToken, tentar refresh
    if (!accessToken && refreshToken) {
      const refreshed = await attemptTokenRefresh(refreshToken);
      if (refreshed) {
        accessToken = refreshed.accessToken;
        // Emitir evento para cliente atualizar cookies
        socket.emit('tokensRefreshed', {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
        });
      } else {
        console.log(
          '❌ [Auth] Token de acesso não encontrado e refresh falhou',
        );
        return next(new Error('Token de acesso não encontrado'));
      }
    }

    if (!accessToken) {
      console.log('❌ [Auth] Token de acesso não encontrado');
      return next(new Error('Token de acesso não encontrado'));
    }

    let decoded: IJWTPayload;
    try {
      decoded = jwt.verify(accessToken, secret, {
        algorithms: ['HS512'],
      }) as IJWTPayload;
    } catch (error) {
      // Se token expirou e temos refreshToken, tentar refresh
      if (error instanceof jwt.TokenExpiredError && refreshToken) {
        const refreshed = await attemptTokenRefresh(refreshToken);
        if (refreshed) {
          // Emitir evento para cliente atualizar cookies
          socket.emit('tokensRefreshed', {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
          });
          // Verificar o novo token
          decoded = jwt.verify(refreshed.accessToken, secret, {
            algorithms: ['HS512'],
          }) as IJWTPayload;
        } else {
          console.log('❌ [Auth] Token expirado e refresh falhou');
          return next(new Error('Token expirado'));
        }
      } else {
        throw error;
      }
    }

    if (decoded.type !== 'access') {
      console.log('❌ [Auth] Tipo de token inválido:', decoded.type);
      return next(new Error('Tipo de token inválido'));
    }

    (socket as any).userId = decoded.userId;
    (socket as any).username = decoded.username;
    (socket as any).userEmail = decoded.email;
    (socket as any).userRole = decoded.role;

    const auth = socket.handshake.auth as any;

    const conversationId = auth?.['conversationId'];
    if (conversationId) {
      (socket as any).conversationId = conversationId;
      console.log(`[Auth] ConversationId recebido: ${conversationId}`);
    }

    const supportContext = auth?.['supportContext'];
    if (supportContext) {
      (socket as any).supportContext = supportContext;
      console.log(
        `[Auth] Contexto de suporte recebido: ExchangeRates=${!!supportContext[
          'exchangeRates'
        ]}, DashboardData=${!!supportContext['dashboardData']}`,
      );
    }

    console.log(
      `[Auth] Usuário autenticado: ${decoded.username} (${decoded.userId})`,
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

export const httpAuthMiddleware = async (
  req: IAuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    const cookies = parseCookies(cookieHeader);
    let accessToken = cookies['accessToken'];
    const refreshToken = cookies['refreshToken'];

    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      console.error('❌ [Auth] JWT_SECRET não configurado');
      return res
        .status(500)
        .json({ error: 'Configuração inválida do servidor' });
    }

    // Se não tem accessToken mas tem refreshToken, tentar refresh
    if (!accessToken && refreshToken) {
      const refreshed = await attemptTokenRefresh(refreshToken);
      if (refreshed) {
        accessToken = refreshed.accessToken;
        // Definir novos cookies na resposta
        setAuthCookies(res, refreshed.accessToken, refreshed.refreshToken);
      } else {
        return res.status(401).json({ error: 'Sessão expirada' });
      }
    }

    if (!accessToken) {
      return res.status(401).json({ error: 'Token de acesso não encontrado' });
    }

    let decoded: IJWTPayload;
    try {
      decoded = jwt.verify(accessToken, secret, {
        algorithms: ['HS512'],
      }) as IJWTPayload;
    } catch (error) {
      // Se token expirou e temos refreshToken, tentar refresh
      if (error instanceof jwt.TokenExpiredError && refreshToken) {
        const refreshed = await attemptTokenRefresh(refreshToken);
        if (refreshed) {
          // Definir novos cookies na resposta
          setAuthCookies(res, refreshed.accessToken, refreshed.refreshToken);
          // Verificar o novo token
          decoded = jwt.verify(refreshed.accessToken, secret, {
            algorithms: ['HS512'],
          }) as IJWTPayload;
        } else {
          return res.status(401).json({ error: 'Token expirado' });
        }
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Token inválido' });
      } else {
        throw error;
      }
    }

    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Tipo de token inválido' });
    }

    req.userId = decoded.userId;
    req.username = decoded.username;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.error('❌ [Auth] Erro na autenticação:', error);
    return res.status(500).json({ error: 'Erro na autenticação' });
  }
};
