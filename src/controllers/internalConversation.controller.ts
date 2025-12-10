import { Request, Response } from 'express';
import { Types } from 'mongoose';
import InternalConversation from '../models/InternalConversation.js';
import InternalRoomMessage from '../models/InternalRoomMessage.js';
import User from '../models/User.js';
import { getIoInstance } from '../utils/ioInstance.js';

export class InternalConversationController {
  async getOrCreateGeneral(req: Request, res: Response) {
    try {
      let general = await InternalConversation.findOne({ isGeneral: true })
        .populate('participants', 'username email externalUserId role')
        .populate('createdBy', 'username email')
        .lean();

      if (!general) {
        const supportUsers = await User.find({
          role: { $in: ['support', 'admin'] },
        });

        if (supportUsers.length === 0) {
          return res.status(400).json({
            error: 'Nenhum operador encontrado para criar sala Geral',
          });
        }

        const firstAdmin =
          supportUsers.find((u) => u.role === 'admin') || supportUsers[0];

        if (!firstAdmin) {
          return res
            .status(500)
            .json({ error: 'Erro ao identificar criador da sala' });
        }

        const newGeneral = await InternalConversation.create({
          title: 'Geral',
          participants: supportUsers.map((u) => u._id),
          isGeneral: true,
          createdBy: firstAdmin._id,
        });

        general = await InternalConversation.findById(newGeneral._id)
          .populate('participants', 'username email externalUserId role')
          .populate('createdBy', 'username email')
          .lean();
      }

      return res.json(general);
    } catch (error) {
      console.error(
        '❌ [InternalConversation] Erro ao buscar/criar sala Geral:',
        error
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async listRooms(req: Request, res: Response) {
    try {
      const externalUserId = (req as any).userId;
      if (!externalUserId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const user = await User.findOne({ externalUserId });
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Se for admin, retorna todas as salas
      // Se for support, retorna apenas salas onde é participante
      const query: any = {};
      if (user.role !== 'admin') {
        query.participants = { $in: [user._id] };
      }

      const rooms = await InternalConversation.find(query)
        .populate('participants', 'username email externalUserId role isOnline')
        .populate('createdBy', 'username email')
        .sort({ isGeneral: -1, lastMessageAt: -1 })
        .lean();

      // Calcula unreadCount do usuário atual para cada sala baseado no unreadCountByUser
      // Usa externalUserId como chave para consistência com o frontend
      // Fallback para _id caso existam dados antigos
      const roomsWithUserUnreadCount = rooms.map((room: any) => {

        const unreadCountByUser = room.unreadCountByUser || {};
        let userUnreadCount = unreadCountByUser[user.externalUserId];

        if (userUnreadCount === undefined) {
          userUnreadCount = unreadCountByUser[user._id.toString()] || 0;
        }

        return {
          ...room,
          unreadCount: userUnreadCount,
          unreadCountByUser: unreadCountByUser,
        };
      });

      return res.json(roomsWithUserUnreadCount);
    } catch (error) {
      console.error('❌ [InternalConversation] Erro ao listar salas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async createRoom(req: Request, res: Response) {
    try {
      const { title, participantIds } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Título é obrigatório' });
      }

      if (
        !participantIds ||
        !Array.isArray(participantIds) ||
        participantIds.length === 0
      ) {
        return res
          .status(400)
          .json({ error: 'Participantes são obrigatórios' });
      }

      const participants = await User.find({
        externalUserId: { $in: participantIds },
      });

      if (participants.length === 0) {
        return res
          .status(400)
          .json({ error: 'Nenhum participante válido encontrado' });
      }

      const creatorExternal = (req as any).userId;
      const creator = await User.findOne({ externalUserId: creatorExternal });

      if (!creator) {
        return res.status(400).json({ error: 'Criador não encontrado' });
      }

      const room = await InternalConversation.create({
        title: title.trim(),
        participants: participants.map((p) => p._id),
        isGeneral: false,
        createdBy: creator._id,
      });

      const populatedRoom = await InternalConversation.findById(room._id)
        .populate('participants', 'username email externalUserId role isOnline')
        .populate('createdBy', 'username email')
        .lean();

      const io = getIoInstance();
      if (io) {
        // Converter unreadCountByUser de Map para objeto se necessário
        let unreadCountByUserForEmit: Record<string, number> = {};
        if ((populatedRoom as any)?.unreadCountByUser) {
          if ((populatedRoom as any).unreadCountByUser instanceof Map) {
            unreadCountByUserForEmit = Object.fromEntries((populatedRoom as any).unreadCountByUser);
          } else {
            unreadCountByUserForEmit = (populatedRoom as any).unreadCountByUser as Record<string, number>;
          }
        }

        const roomWithUnreadCountByUser = {
          ...populatedRoom,
          unreadCountByUser: unreadCountByUserForEmit,
        };

        io.to('support:global').emit('internal:room:created', roomWithUnreadCountByUser);
      }

      return res.status(201).json(populatedRoom);
    } catch (error) {
      console.error('❌ [InternalConversation] Erro ao criar sala:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async updateRoom(req: Request, res: Response) {
    try {
      console.log('✅ [InternalConversation] updateRoom chamado:', {
        roomId: req.params['id'],
        participantIds: req.body.participantIds,
        method: req.method,
        url: req.url,
      });
      const roomId = req.params['id'];
      const { participantIds } = req.body;

      if (!roomId || !Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ error: 'ID da sala inválido' });
      }

      if (
        !participantIds ||
        !Array.isArray(participantIds) ||
        participantIds.length === 0
      ) {
        return res
          .status(400)
          .json({ error: 'Participantes são obrigatórios' });
      }

      const externalUserId = (req as any).userId;
      if (!externalUserId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar usuário pelo externalUserId
      const user = await User.findOne({ externalUserId });
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Buscar a sala
      const room = await InternalConversation.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Sala não encontrada' });
      }

      // Verificar permissões: apenas participantes podem editar (ou admin)
      const isParticipant = room.participants.some(
        (participantId) => participantId.toString() === user._id.toString()
      );

      if (!isParticipant && user.role !== 'admin') {
        return res.status(403).json({
          error: 'Você não tem permissão para editar esta sala',
        });
      }

      const participants = await User.find({
        externalUserId: { $in: participantIds },
      });

      if (participants.length === 0) {
        return res
          .status(400)
          .json({ error: 'Nenhum participante válido encontrado' });
      }

      // Identificar participantes novos (que foram adicionados) e removidos
      const oldParticipantIds = room.participants.map((p) => p.toString());
      const newParticipantIds = participants.map((p) => p._id.toString());
      const addedParticipantIds = newParticipantIds.filter(
        (id) => !oldParticipantIds.includes(id)
      );
      const removedParticipantIds = oldParticipantIds.filter(
        (id) => !newParticipantIds.includes(id)
      );

      // Busca participantes removidos para limpar seus contadores
      let unreadCountByUser = room.unreadCountByUser || new Map();
      if (removedParticipantIds.length > 0) {
        const removedParticipants = await User.find({
          _id: { $in: removedParticipantIds.map((id) => new Types.ObjectId(id)) }
        }).select('externalUserId').lean();

        // Remove contadores de participantes que foram removidos da sala
        removedParticipants.forEach((removedParticipant) => {
          const removedExternalId = removedParticipant.externalUserId || removedParticipant._id.toString();
          unreadCountByUser.delete(removedExternalId);
        });
      }

      // Atualiza sala
      const updatedRoom = await InternalConversation.findByIdAndUpdate(
        roomId,
        {
          participants: participants.map((p) => p._id),
          unreadCountByUser: unreadCountByUser,
        },
        { new: true }
      )
        .populate('participants', 'username email externalUserId role isOnline')
        .populate('createdBy', 'username email')
        .lean();

      const io = getIoInstance();
      if (io) {
        // Converte unreadCountByUser de Map para objeto se necessário
        let unreadCountByUserForEmit: Record<string, number> = {};
        if ((updatedRoom as any).unreadCountByUser) {
          if ((updatedRoom as any).unreadCountByUser instanceof Map) {
            unreadCountByUserForEmit = Object.fromEntries((updatedRoom as any).unreadCountByUser);
          } else {
            unreadCountByUserForEmit = (updatedRoom as any).unreadCountByUser as Record<string, number>;
          }
        }

        const roomWithUnreadCountByUser = {
          ...updatedRoom,
          unreadCountByUser: unreadCountByUserForEmit,
        };

        // Emitir para support:global (todos os admins/support conectados)
        // Isso garante que todos vejam a atualização da sala
        io.to('support:global').emit('internal:room:updated', roomWithUnreadCountByUser);
        io.to(`internal:room:${roomId}`).emit('internal:room:updated', roomWithUnreadCountByUser);

        if (addedParticipantIds.length > 0) {

          const newParticipants = await User.find({
            _id: { $in: addedParticipantIds.map((id) => new Types.ObjectId(id)) },
          }).select('externalUserId').lean();

          newParticipants.forEach((participant) => {
            io.to('support:global').emit('internal:room:user:added', {
              room: roomWithUnreadCountByUser,
              userId: participant.externalUserId,
            });
          });
        }
      }

      return res.json(updatedRoom);
    } catch (error) {
      console.error('❌ [InternalConversation] Erro ao atualizar sala:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getRoomMessages(req: Request, res: Response) {
    try {
      const roomId = req.params['id'];

      if (!roomId || !Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ error: 'ID da sala inválido' });
      }

      const externalUserId = (req as any).userId;
      if (!externalUserId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Busca usuário pelo externalUserId
      const user = await User.findOne({ externalUserId });
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verifica se o usuário é participante da sala
      const room = await InternalConversation.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Sala não encontrada' });
      }

      const isParticipant = room.participants.some(
        (participantId) => participantId.toString() === user._id.toString()
      );

      // Admin pode acessar todas as salas, mesmo sem ser participante
      if (!isParticipant && user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para acessar esta sala' });
      }

      const messages = await InternalRoomMessage.find({
        internalConversationId: roomId,
      })
        .sort({ createdAt: 1 })
        .populate('senderId', 'username email externalUserId role')
        .lean();

      return res.json(messages);
    } catch (error) {
      console.error(
        '❌ [InternalConversation] Erro ao buscar mensagens:',
        error
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async sendMessage(req: Request, res: Response) {
    try {
      const roomId = req.params['id'];
      const { content } = req.body;

      if (!roomId || !Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ error: 'ID da sala inválido' });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Conteúdo é obrigatório' });
      }

      const senderExternal = (req as any).userId;
      const sender = await User.findOne({ externalUserId: senderExternal });

      if (!sender) {
        return res.status(400).json({ error: 'Remetente não encontrado' });
      }

      const room = await InternalConversation.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Sala não encontrada' });
      }

      // Verificar se o usuário é participante da sala
      const isParticipant = room.participants.some(
        (participantId) => participantId.toString() === sender._id.toString()
      );

      // Admin pode enviar mensagens em todas as salas, mesmo sem ser participante
      if (!isParticipant && sender.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para enviar mensagens nesta sala' });
      }

      const message = await InternalRoomMessage.create({
        internalConversationId: roomId,
        senderId: sender._id,
        content: content.trim(),
        messageType: 'text',
      });

      // Incrementar unreadCount apenas para os outros participantes (não para o remetente)
      // Buscar todos os participantes para obter seus externalUserId
      const allParticipants = await User.find({
        _id: { $in: room.participants }
      }).select('_id externalUserId').lean();

      const otherParticipants = allParticipants.filter(
        (participant) => participant._id.toString() !== sender._id.toString()
      );

      // Atualizar unreadCountByUser para cada participante (exceto remetente)
      // Usar externalUserId como chave para consistência com o frontend
      const unreadCountByUser = room.unreadCountByUser || new Map();
      otherParticipants.forEach((participant) => {
        const participantExternalId = participant.externalUserId || participant._id.toString();
        const currentCount = unreadCountByUser.get(participantExternalId) || 0;
        unreadCountByUser.set(participantExternalId, currentCount + 1);
      });

      // Garantir que o remetente tenha contador zerado usando externalUserId
      const senderExternalId = sender.externalUserId || sender._id.toString();
      unreadCountByUser.set(senderExternalId, 0);

      // Calcular unreadCount global (soma de todos os usuários)
      let totalUnreadCount = 0;
      unreadCountByUser.forEach((count) => {
        totalUnreadCount += count;
      });

      const updatedRoom = await InternalConversation.findByIdAndUpdate(
        roomId,
        {
          lastMessageAt: new Date(),
          unreadCount: totalUnreadCount,
          unreadCountByUser: unreadCountByUser,
        },
        { new: true }
      );

      const finalRoom = await InternalConversation.findById(roomId)
        .populate('participants', 'username email externalUserId role isOnline')
        .populate('createdBy', 'username email')
        .lean();

      const populatedMessage = await InternalRoomMessage.findById(message._id)
        .populate('senderId', 'username email externalUserId role')
        .lean();

      const io = getIoInstance();
      if (io) {
        // Emitir mensagem para participantes da sala
        io.to(`internal:room:${roomId}`).emit(
          'internal:room:message',
          populatedMessage
        );

        // Emitir atualização de contador não lido para todos os participantes
        // e para support:global para atualizar a lista de salas
        // O unreadCount será calculado no frontend baseado no unreadCountByUser do usuário atual
        // Converter Map para objeto se necessário
        let unreadCountByUserObj: Record<string, number> = {};
        if (updatedRoom?.unreadCountByUser) {
          if (updatedRoom.unreadCountByUser instanceof Map) {
            unreadCountByUserObj = Object.fromEntries(updatedRoom.unreadCountByUser);
          } else {
            unreadCountByUserObj = updatedRoom.unreadCountByUser as Record<string, number>;
          }
        }

        const unreadUpdate = {
          roomId: roomId,
          unreadCount: updatedRoom ? updatedRoom.unreadCount : 0,
          unreadCountByUser: unreadCountByUserObj,
        };

        // Emitir para a sala específica
        io.to(`internal:room:${roomId}`).emit('internal:unread:update', unreadUpdate);

        // Emitir para support:global para atualizar lista de salas
        io.to('support:global').emit('internal:unread:update', unreadUpdate);

        // Emitir atualização da sala completa para atualizar lastMessageAt na lista
        const roomForList = await InternalConversation.findById(roomId)
          .populate('participants', 'username email externalUserId role isOnline')
          .populate('createdBy', 'username email')
          .lean();

        if (roomForList) {
          // Converter unreadCountByUser de Map para objeto se necessário
          let unreadCountByUserForList: Record<string, number> = {};
          if ((roomForList as any).unreadCountByUser) {
            if ((roomForList as any).unreadCountByUser instanceof Map) {
              unreadCountByUserForList = Object.fromEntries((roomForList as any).unreadCountByUser);
            } else {
              unreadCountByUserForList = (roomForList as any).unreadCountByUser as Record<string, number>;
            }
          }

          const roomWithUnreadCountByUser = {
            ...roomForList,
            unreadCountByUser: unreadCountByUserForList,
          };

          io.to('support:global').emit('internal:room:updated', roomWithUnreadCountByUser);
        }
      }

      return res.status(201).json(populatedMessage);
    } catch (error) {
      console.error(
        '❌ [InternalConversation] Erro ao enviar mensagem:',
        error
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async markRoomAsRead(req: Request, res: Response) {
    try {
      const roomId = req.params['id'];

      if (!roomId || !Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ error: 'ID da sala inválido' });
      }

      const externalUserId = (req as any).userId;
      if (!externalUserId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar usuário pelo externalUserId
      const user = await User.findOne({ externalUserId });
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const room = await InternalConversation.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Sala não encontrada' });
      }

      // Verificar se o usuário é participante da sala
      const isParticipant = room.participants.some(
        (participantId) => participantId.toString() === user._id.toString()
      );

      // Admin pode marcar como lida em todas as salas, mesmo sem ser participante
      if (!isParticipant && user.role !== 'admin') {
        return res.status(403).json({ error: 'Você não tem permissão para acessar esta sala' });
      }

      // Zerar unreadCount apenas para o usuário atual
      // Usar externalUserId como chave para consistência com o frontend
      const unreadCountByUser = room.unreadCountByUser || new Map();
      const userExternalId = user.externalUserId || user._id.toString();
      unreadCountByUser.set(userExternalId, 0);

      // Recalcular unreadCount global
      let totalUnreadCount = 0;
      unreadCountByUser.forEach((count) => {
        totalUnreadCount += count;
      });

      await InternalConversation.findByIdAndUpdate(roomId, {
        unreadCount: totalUnreadCount,
        unreadCountByUser: unreadCountByUser,
      });

      const io = getIoInstance();
      if (io) {
        const updatedRoomAfterRead = await InternalConversation.findById(roomId).lean();
        // Converter Map para objeto se necessário
        let unreadCountByUserObj: Record<string, number> = {};
        if (updatedRoomAfterRead?.unreadCountByUser) {
          if (updatedRoomAfterRead.unreadCountByUser instanceof Map) {
            unreadCountByUserObj = Object.fromEntries(updatedRoomAfterRead.unreadCountByUser);
          } else {
            unreadCountByUserObj = updatedRoomAfterRead.unreadCountByUser as Record<string, number>;
          }
        }

        const unreadUpdate = {
          roomId: roomId,
          unreadCount: updatedRoomAfterRead ? updatedRoomAfterRead.unreadCount : 0,
          unreadCountByUser: unreadCountByUserObj,
        };

        // Emitir para a sala específica
        io.to(`internal:room:${roomId}`).emit('internal:unread:update', unreadUpdate);

        // Emitir para support:global para atualizar lista de salas
        io.to('support:global').emit('internal:unread:update', unreadUpdate);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error(
        '❌ [InternalConversation] Erro ao marcar sala como lida:',
        error
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

export default new InternalConversationController();
