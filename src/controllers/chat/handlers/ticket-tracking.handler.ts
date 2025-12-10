import { Server } from 'socket.io';
import { IAuthenticatedSocket } from '../../../../@types/controllers/chat.controller.d.js';

/**
 * Handler para quando um usuário começa a visualizar um ticket
 * Isso permite ao sistema saber quando NÃO enviar notificações
 */
export async function handleTicketViewing(
  io: Server,
  socket: IAuthenticatedSocket,
  ticketId: string,
  conversationId: string,
) {
  try {
    // Armazenar no socket qual ticket o usuário está visualizando
    (socket as any).viewingTicketId = ticketId;
    (socket as any).viewingConversationId = conversationId;
  } catch (error) {
    console.error('❌ [TicketTracking] Erro ao registrar visualização:', error);
  }
}

/**
 * Handler para quando um usuário para de visualizar um ticket
 */
export async function handleTicketLeft(
  io: Server,
  socket: IAuthenticatedSocket,
  ticketId: string,
  conversationId: string,
) {
  try {
    // Limpar o ticket que estava sendo visualizado
    delete (socket as any).viewingTicketId;
    delete (socket as any).viewingConversationId;
  } catch (error) {
    console.error('❌ [TicketTracking] Erro ao registrar saída:', error);
  }
}

/**
 * Função utilitária para verificar se um usuário está visualizando um ticket específico
 */
export function isUserViewingTicket(
  io: Server,
  userId: string,
  conversationId: string,
): boolean {
  const sockets = Array.from(io.sockets.sockets.values());

  for (const socket of sockets) {
    const authSocket = socket as any;

    // Verificar se o socket pertence ao usuário
    if (authSocket.userId === userId) {
      // Verificar se está visualizando o ticket em questão
      if (authSocket.viewingConversationId === conversationId) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Função utilitária para obter o socket de um usuário específico
 */
export function getUserSocket(io: Server, userId: string): any | null {
  const sockets = Array.from(io.sockets.sockets.values());

  for (const socket of sockets) {
    const authSocket = socket as any;
    if (authSocket.userId === userId) {
      return authSocket;
    }
  }

  return null;
}
