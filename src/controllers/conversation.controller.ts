import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import { getIoInstance } from '../utils/ioInstance.js';
import type {
  ConversationResponse,
  UserWithExternalId,
  PopulatedUser,
  TicketWithPopulatedAssignedTo,
} from '../../@types/api/conversation.response.js';

export function transformAssignedToIds(
  conversation: Record<string, any>,
): ConversationResponse {
  const assignedTo = conversation['assignedTo'];
  if (assignedTo && assignedTo['externalUserId']) {
    assignedTo['_id'] = assignedTo['externalUserId'];
  }

  const ticketId = conversation['ticketId'];
  if (
    ticketId &&
    ticketId['assignedTo'] &&
    ticketId['assignedTo']['externalUserId']
  ) {
    ticketId['assignedTo']['_id'] = ticketId['assignedTo']['externalUserId'];
  }

  return conversation as ConversationResponse;
}

export class ConversationController {
  async getConversations(req: Request, res: Response) {
    try {
      const {
        status,
        needHumanAttention,
        hasTicket,
        sortBy = 'lastMessageAt',
        order = 'desc',
      } = req.query;

      // Buscar usuário atual para calcular contador específico
      const externalUserId = (req as any).userId;
      const user = externalUserId ? await User.findOne({ externalUserId }).select('externalUserId role').lean() : null;

      const filter: any = {};

      if (status) filter.status = status;
      if (needHumanAttention !== undefined)
        filter.needHumanAttention = needHumanAttention === 'true';
      if (hasTicket === 'true') {
        filter.ticketId = { $ne: null };
      } else if (hasTicket === 'false') {
        filter.ticketId = null;
      }

      const sortOrder = order === 'asc' ? 1 : -1;
      const sortField: any = {};
      sortField[sortBy as string] = sortOrder;

      const conversations = await Conversation.find(filter)
        .sort(sortField)
        .populate(
          'userId',
          'username nickname externalUserId isOnline isBanned',
        )
        .populate('assignedTo', 'username email')
        .populate({
          path: 'ticketId',
          select: '_id priority status subject unreadCountSupport unreadCountAdmin unreadCountByUser assignedTo',
          populate: {
            path: 'assignedTo',
            select: 'username email externalUserId',
          },
        })
        .lean();

      const conversationsWithLastMessage = await Promise.all(
        conversations.map(async (conv) => {
          const lastMessage = await Message.findOne({
            conversationId: conv._id,
            $or: [
              { isInternal: { $exists: false } },
              { isInternal: false }
            ]
          })
            .sort({ createdAt: -1 })
            .populate('senderId', 'username')
            .select('content messageType metadata createdAt isFromAI senderId')
            .lean();

          const senderId = lastMessage?.senderId as
            | { username: string }
            | undefined;

          // Determinar conteúdo da última mensagem
          let lastMessageContent = lastMessage?.content || '';
          if (lastMessage?.messageType === 'image') {
            lastMessageContent = 'Imagem';
          }

          const convWithLastMessage = {
            ...conv,
            lastMessage: lastMessage
              ? {
                  content: lastMessageContent,
                  createdAt: lastMessage.createdAt,
                  isFromAI: lastMessage.isFromAI,
                  senderName: senderId?.username || '',
                  messageType: lastMessage.messageType || 'text',
                  metadata: lastMessage.metadata || null,
                }
              : null,
          };

          const transformed = transformAssignedToIds(convWithLastMessage);

          return transformed;
        }),
      );

      return res.json(conversationsWithLastMessage);
    } catch (error) {
      console.error(
        '❌ [ConversationController] Erro ao listar conversas:',
        error,
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getConversationById(req: Request, res: Response) {
    try {
      const id = req.params['id'];

      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const conversation = await Conversation.findById(id)
        .populate(
          'userId',
          'username nickname externalUserId isOnline isBanned',
        )
        .populate('assignedTo', 'username email externalUserId')
        .populate({
          path: 'ticketId',
          populate: {
            path: 'assignedTo',
            select: 'username email externalUserId',
          },
        })
        .lean();

      if (!conversation) {
        return res.status(404).json({ error: 'Conversa não encontrada' });
      }

      const transformedConversation = transformAssignedToIds(conversation);

      return res.json(transformedConversation);
    } catch (error) {
      console.error(
        '❌ [ConversationController] Erro ao buscar conversa:',
        error,
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getConversationMessages(req: Request, res: Response) {
    try {
      const id = req.params['id'];

      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const messages = await Message.find({
        conversationId: id,
        $or: [
          { isInternal: { $exists: false } },
          { isInternal: false }
        ]
      })
        .sort({ createdAt: 1 })
        .populate('senderId', 'username externalUserId role')
        .lean();

      return res.json(messages);
    } catch (error) {
      console.error(
        '❌ [ConversationController] Erro ao buscar mensagens:',
        error,
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async updateConversation(req: Request, res: Response) {
    try {
      const id = req.params['id'];
      const updates = req.body;

      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const allowedUpdates = ['status', 'needHumanAttention', 'title'];

      const updateData: any = {};
      Object.keys(updates).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          updateData[key] = updates[key];
        }
      });

      const conversation = await Conversation.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
        },
      )
        .populate(
          'userId',
          'username nickname externalUserId isOnline isBanned',
        )
        .populate('assignedTo', 'username email externalUserId')
        .populate({
          path: 'ticketId',
          populate: {
            path: 'assignedTo',
            select: 'username email externalUserId',
          },
        })
        .lean();

      if (!conversation) {
        return res.status(404).json({ error: 'Conversa não encontrada' });
      }

      const transformedConversation = transformAssignedToIds(conversation);

      const io = getIoInstance();
      if (io) {
        io.to('support:global').emit(
          'conversation:updated',
          transformedConversation,
        );

        if (updateData.status) {
          io.to(`conversation:${id}`).emit('conversation:status_changed', {
            conversationId: id,
            status: updateData.status,
            changedBy: (req as any).user?.id || 'system',
            changedAt: new Date(),
          });
        }
      }

      return res.json(transformedConversation);
    } catch (error) {
      console.error(
        '❌ [ConversationController] Erro ao atualizar conversa:',
        error,
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async assignOperator(req: Request, res: Response) {
    try {
      const conversationId = req.params['id'];
      const { operatorId } = req.body;

      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ error: 'ID da conversa inválido' });
      }

      const updateData: any = {};

      if (
        operatorId === '' ||
        operatorId === null ||
        operatorId === undefined
      ) {
        updateData.assignedTo = null;
      } else {
        let operatorMongoId: Types.ObjectId | null = null;

        if (Types.ObjectId.isValid(operatorId)) {
          operatorMongoId = new Types.ObjectId(operatorId);
        } else {
          const operator = await User.findOne({ externalUserId: operatorId });

          if (!operator) {
            return res.status(400).json({ error: 'Operador não encontrado' });
          }

          operatorMongoId = operator._id;
        }

        updateData.assignedTo = operatorMongoId;
      }

      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        updateData,
        { new: true },
      )
        .populate(
          'userId',
          'username nickname externalUserId isOnline isBanned',
        )
        .populate('assignedTo', 'username email externalUserId')
        .populate({
          path: 'ticketId',
          populate: {
            path: 'assignedTo',
            select: 'username email externalUserId',
          },
        })
        .lean();

      if (!conversation) {
        return res.status(404).json({ error: 'Conversa não encontrada' });
      }

      const transformedConversation = transformAssignedToIds(conversation);

      if (transformedConversation.ticketId?._id) {
        await Ticket.findByIdAndUpdate(transformedConversation.ticketId._id, {
          assignedTo: updateData.assignedTo,
        });
      }

      const io = getIoInstance();
      if (io) {
        io.to('support:global').emit(
          'conversation:updated',
          transformedConversation,
        );
      }

      return res.json(transformedConversation);
    } catch (error) {
      console.error(
        '❌ [ConversationController] Erro ao atribuir operador:',
        error,
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async markConversationAsRead(req: Request, res: Response) {
    try {
      const conversationId = req.params['id'];
      const userId = (req as any).userId;

      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ error: 'ID da conversa inválido' });
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversa não encontrada' });
      }

      const io = getIoInstance();

      if (conversation.ticketId) {
        // Zerar contador de mensagens não lidas apenas para o usuário atual
        // Usar unreadCountByUser para rastrear contadores individuais

        // Buscar o ticket atual para obter unreadCountByUser
        const ticket = await Ticket.findById(conversation.ticketId);
        if (!ticket) {
          return res.status(404).json({ error: 'Ticket não encontrado' });
        }

        // Buscar o usuário atual
        const externalUserId = (req as any).userId;
        const user = await User.findOne({ externalUserId });
        if (!user) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Atualizar unreadCountByUser: zerar contador do usuário atual
        // Usar externalUserId como chave para consistência com o frontend
        const unreadCountByUser = ticket.unreadCountByUser || new Map();
        const userExternalId = user.externalUserId || user._id.toString();
        unreadCountByUser.set(userExternalId, 0);

        // Buscar todos os suportes/admins para recalcular contadores globais
        const supportAndAdminUsers = await User.find({
          role: { $in: ['support', 'admin'] }
        }).select('_id externalUserId role').lean();

        // Recalcular contadores globais como soma dos contadores individuais
        let totalUnreadSupport = 0;
        let totalUnreadAdmin = 0;
        supportAndAdminUsers.forEach((supportUser) => {
          const supportUserExternalId = supportUser.externalUserId || supportUser._id.toString();
          const userCount = unreadCountByUser.get(supportUserExternalId) || 0;
          if (supportUser.role === 'admin') {
            totalUnreadAdmin += userCount;
          } else if (supportUser.role === 'support') {
            totalUnreadSupport += userCount;
          }
        });

        // Atualizar ticket com unreadCountByUser e contadores globais
        await Ticket.findByIdAndUpdate(
          conversation.ticketId,
          {
            unreadCountByUser: unreadCountByUser,
            unreadCountSupport: totalUnreadSupport,
            unreadCountAdmin: totalUnreadAdmin,
          },
          { new: true }
        );

        // Converter Map para Object antes de emitir eventos
        let unreadCountByUserObj: Record<string, number> = {};
        if (unreadCountByUser instanceof Map) {
          unreadCountByUserObj = Object.fromEntries(unreadCountByUser);
        } else {
          unreadCountByUserObj = unreadCountByUser as Record<string, number>;
        }

        // Calcular contador do usuário atual (sempre 0 após marcar como lida)
        const userUnreadCount = 0;

        if (io) {
          // Emitir evento para atualizar o frontend em tempo real
          io.emit('unread:update', {
            conversationId: conversationId,
            unreadCountSupport: totalUnreadSupport,
            unreadCountByUser: unreadCountByUserObj,
          });

          // Também emitir conversation:updated para garantir que a lista seja atualizada
          const updatedConversation = await Conversation.findById(conversationId)
            .populate('userId', 'username nickname externalUserId isOnline isBanned')
            .populate('assignedTo', 'username email externalUserId')
            .populate({
              path: 'ticketId',
              select: '_id priority status subject unreadCountSupport unreadCountAdmin unreadCountByUser assignedTo',
              populate: {
                path: 'assignedTo',
                select: 'username email externalUserId',
              },
            })
            .lean();

          if (updatedConversation) {
            const transformed = transformAssignedToIds(updatedConversation);
            io.to('support:global').emit('conversation:updated', {
              ...transformed,
              _id: conversationId,
            });
          }
        }
      } else {
        // Conversa sem ticket - zerar unreadCount da conversa
        await Conversation.findByIdAndUpdate(
          conversationId,
          {
            unreadCount: 0,
          },
          { new: true }
        );

        if (io) {
          // Emitir evento para atualizar o frontend em tempo real
          io.emit('unread:count', {
            conversationId: conversationId,
            unreadCount: 0,
          });

          // Também emitir conversation:updated para garantir que a lista seja atualizada
          const conversationWithPopulate = await Conversation.findById(conversationId)
            .populate('userId', 'username nickname externalUserId isOnline isBanned')
            .populate('assignedTo', 'username email externalUserId')
            .lean();

          if (conversationWithPopulate) {
            const transformed = transformAssignedToIds(conversationWithPopulate);
            io.to('support:global').emit('conversation:updated', {
              ...transformed,
              _id: conversationId,
            });
          }
        }
      }

      return res.json({ success: true });
    } catch (error) {
      console.error(
        '❌ [ConversationController] Erro ao marcar conversa como lida:',
        error,
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

export default new ConversationController();
