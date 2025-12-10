import { Types } from 'mongoose';
import { TicketInput } from '../../@types/models/ticket';
import Ticket from '../models/Ticket.js';
import { ConversationInput } from '../../@types/models/conversation';
import Conversation from '../models/Conversation.js';
import { UserInput } from '../../@types/models/user';
import User from '../models/User.js';
import {
  IActionContext,
  IActionResult,
} from '../../@types/services/actions.service.d.js';

export class ActionsService {
  async executeAction(
    action: string,
    context: IActionContext
  ): Promise<IActionResult> {
    try {
      if (!action || typeof action !== 'string') {
        console.error('❌ [ActionService] Ação inválida:', action);
        return {
          success: false,
          error: 'Ação inválida',
        };
      }

      if (!context.conversationId || !context.userId) {
        console.error('❌ [ActionService] Contexto inválido:', context);
        return {
          success: false,
          error: 'conversationId e userId são obrigatórios',
        };
      }

      console.log(`[ActionService] Executando ação: ${action}`);

      switch (action) {
        case 'create_ticket':
          return await this.handleCreateTicket(context);

        case 'close_conversation':
          return await this.handleCloseConversation(context);

        case 'escalate':
          return await this.handleEscalate(context);

        case 'flag_message':
          return await this.handleFlagMessage(context);

        case 'ban_user':
          return await this.handleBanUser(context);

        case 'no_action':
          return { success: true, message: 'Nenhuma ação necessária' };

        default:
          console.warn(`⚠️ [ActionService] Ação desconhecida: ${action}`);
          return {
            success: false,
            error: `Ação não implementada: ${action}`,
            message: `Ação desconhecida: ${action}`,
          };
      }
    } catch (error) {
      console.error('❌ [ActionService] Erro ao executar ação:', error);
      return { success: false, error };
    }
  }

  private async handleCreateTicket(
    context: IActionContext
  ): Promise<IActionResult> {
    try {
      const conversation = await Conversation.findById(context.conversationId);
      if (!conversation) {
        return { success: false, error: 'Conversa não encontrada' };
      }

      if (conversation.ticketId) {
        console.log(
          `[ActionService] Conversa já possui ticket: ${conversation.ticketId}`
        );
        return {
          success: true,
          message: 'Ticket já existe para esta conversa',
          data: { ticketId: conversation.ticketId },
        };
      }

      const priorityMap: Record<string, 'urgent' | 'high' | 'medium' | 'low'> =
        {
          urgent: 'urgent',
          high: 'high',
          medium: 'medium',
          low: 'low',
          info: 'low',
        };

      const ticketPriority = context.priority
        ? priorityMap[context.priority]
        : 'medium';

      const ticket = await Ticket.create({
        title: conversation.title || 'Atendimento via Chat',
        priority: ticketPriority,
        externalUserId: new Types.ObjectId(context.userId),
        status: 'open',
        subject: conversation.title || null,
      });

      const updatedConversation = await Conversation.findByIdAndUpdate(
        context.conversationId,
        {
          ticketId: ticket._id,
          needHumanAttention: true,
        },
        { new: true }
      )
        .populate('userId', 'username externalUserId isOnline')
        .populate({
          path: 'ticketId',
          select: '_id priority status subject unreadCountSupport assignedTo',
          populate: {
            path: 'assignedTo',
            select: 'username email externalUserId',
          },
        })
        .lean();

      console.log(
        `[ActionService] Ticket criado: ${ticket._id} | Subject: ${
          ticket.subject || 'N/A'
        }`
      );
      return {
        success: true,
        data: { ticket, conversation: updatedConversation },
        message: 'Ticket criado com sucesso',
      };
    } catch (error) {
      console.error('❌ [ActionService] Erro ao criar ticket:', error);
      return { success: false, error };
    }
  }

  private async handleCloseConversation(
    context: IActionContext
  ): Promise<IActionResult> {
    try {
      const conversation = await Conversation.findByIdAndUpdate(
        context.conversationId,
        { status: 'closed' },
        { new: true }
      );

      if (!conversation) {
        return { success: false, error: 'Conversa não encontrada' };
      }

      console.log(
        `[ActionService] Conversa fechada: ${context.conversationId}`
      );
      return {
        success: true,
        data: { conversation },
        message: 'Conversa fechada com sucesso',
      };
    } catch (error) {
      console.error('❌ [ActionService] Erro ao fechar conversa:', error);
      return { success: false, error };
    }
  }

  private async handleEscalate(
    context: IActionContext
  ): Promise<IActionResult> {
    try {
      const conversation = await Conversation.findByIdAndUpdate(
        context.conversationId,
        { needHumanAttention: true },
        { new: true }
      );

      if (!conversation) {
        return { success: false, error: 'Conversa não encontrada' };
      }

      console.log(
        `[ActionService] Conversa escalada para atendimento humano: ${context.conversationId}`
      );
      return {
        success: true,
        data: { conversation },
        message: 'Conversa escalada para atendimento humano',
      };
    } catch (error) {
      console.error('❌ [ActionService] Erro ao escalar conversa:', error);
      return { success: false, error };
    }
  }

  private async handleFlagMessage(
    context: IActionContext
  ): Promise<IActionResult> {
    try {
      const conversation = await Conversation.findById(context.conversationId);
      if (!conversation) {
        return { success: false, error: 'Conversa não encontrada' };
      }

      const newSpamCount = (conversation.spamCount || 0) + 1;

      await Conversation.findByIdAndUpdate(
        context.conversationId,
        {
          spamCount: newSpamCount,
          needHumanAttention: newSpamCount >= 3,
        },
        { new: true }
      );

      console.log(
        `[ActionService] Mensagem flagrada. SpamCount: ${newSpamCount}`
      );

      if (newSpamCount >= 3) {
        console.log(
          `[ActionService] Limite de spam atingido para conversa: ${context.conversationId}`
        );
      }

      return {
        success: true,
        data: { spamCount: newSpamCount },
        message: `Mensagem flagrada. Total de violações: ${newSpamCount}`,
      };
    } catch (error) {
      console.error('❌ [ActionService] Erro ao flagar mensagem:', error);
      return { success: false, error };
    }
  }

  private async handleBanUser(context: IActionContext): Promise<IActionResult> {
    try {
      const bannedUntil = new Date();
      bannedUntil.setDate(bannedUntil.getDate() + 2);

      const user = await User.findByIdAndUpdate(
        context.userId,
        {
          isBanned: true,
          bannedAt: new Date(),
          bannedUntil: bannedUntil,
        },
        { new: true }
      );

      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      await Conversation.findByIdAndUpdate(context.conversationId, {
        status: 'archived',
        needHumanAttention: true,
      });

      console.log(
        `[ActionService] Usuário banido: ${
          context.userId
        } até ${bannedUntil.toISOString()}`
      );
      return {
        success: true,
        data: { user },
        message: 'Usuário banido com sucesso',
      };
    } catch (error) {
      console.error('❌ [ActionService] Erro ao banir usuário:', error);
      return { success: false, error };
    }
  }

  async createTicket(data: TicketInput): Promise<IActionResult> {
    try {
      const ticket = await Ticket.create(data);
      return { success: true, data: { ticket } };
    } catch (error) {
      console.error('❌ [ActionService] Erro ao criar ticket:', error);
      return { success: false, error };
    }
  }

  async updateTicket(
    id: string,
    data: Partial<TicketInput>
  ): Promise<IActionResult> {
    try {
      const ticket = await Ticket.findByIdAndUpdate(id, data, { new: true });

      if (!ticket) {
        return { success: false, error: 'Ticket não encontrado' };
      }
      return { success: true, data: { ticket } };
    } catch (error) {
      console.error('❌ [ActionService] Erro ao atualizar ticket:', error);
      return { success: false, error };
    }
  }

  async updateConversation(
    conversationId: string,
    data: Partial<ConversationInput>
  ): Promise<IActionResult> {
    try {
      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        data,
        { new: true }
      );

      if (!conversation) {
        return { success: false, error: 'Conversa não encontrada' };
      }
      return { success: true, data: { conversation } };
    } catch (error) {
      console.error('❌ [ActionService] Erro ao atualizar conversa:', error);
      return { success: false, error };
    }
  }

  async updateUser(
    userId: string,
    data: Partial<UserInput>
  ): Promise<IActionResult> {
    try {
      const user = await User.findByIdAndUpdate(userId, data, { new: true });

      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }
      return { success: true, data: { user } };
    } catch (error) {
      console.error('❌ [ActionService] Erro ao atualizar usuário:', error);
      return { success: false, error };
    }
  }
}

export const actionsService = new ActionsService();
