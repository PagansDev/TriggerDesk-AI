import { Server } from 'socket.io';
import { Types } from 'mongoose';
import InternalConversation from '../../../models/InternalConversation.js';
import InternalRoomMessage from '../../../models/InternalRoomMessage.js';
import User from '../../../models/User.js';
import { IAuthenticatedSocket } from '../../../../@types/controllers/chat.controller.d.js';

export async function handleInternalRoomJoin(
  io: Server,
  socket: IAuthenticatedSocket,
  roomId: string
) {
  if (socket.userRole !== 'support' && socket.userRole !== 'admin') {
    socket.emit('error', { message: 'Acesso negado' });
    return;
  }

  if (!roomId || !Types.ObjectId.isValid(roomId)) {
    socket.emit('error', { message: 'ID da sala inválido' });
    return;
  }

  if (!socket.livechatUserId) {
    socket.emit('error', { message: 'Usuário não autenticado' });
    return;
  }

  try {
    const room = await InternalConversation.findById(roomId);
    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }

    // Verificar se o usuário está na lista de participantes
    const isParticipant = room.participants.some(
      (participantId) => participantId.toString() === socket.livechatUserId!.toString()
    );

    // Admin pode entrar em todas as salas, mesmo sem ser participante
    if (!isParticipant && socket.userRole !== 'admin') {
      socket.emit('error', { message: 'Você não tem permissão para acessar esta sala' });
      return;
    }

    await socket.join(`internal:room:${roomId}`);
  } catch (error) {
    console.error('❌ [Socket] Erro ao entrar na sala:', error);
    socket.emit('error', { message: 'Erro ao entrar na sala' });
  }
}

export async function handleInternalRoomMessage(
  io: Server,
  socket: IAuthenticatedSocket,
  data: {
    roomId: string;
    content: string;
    imageUrl?: string;
    messageType?: 'text' | 'image';
    metadata?: any;
  }
) {
  if (socket.userRole !== 'support' && socket.userRole !== 'admin') {
    socket.emit('error', { message: 'Acesso negado' });
    return;
  }

  if (!socket.livechatUserId) {
    socket.emit('error', { message: 'Usuário não autenticado' });
    return;
  }

  const { roomId, content, imageUrl, messageType, metadata } = data;

  if (!roomId || !Types.ObjectId.isValid(roomId)) {
    socket.emit('error', { message: 'ID da sala inválido' });
    return;
  }

  // Permitir mensagens vazias se for imagem
  if (messageType !== 'image' && (!content || !content.trim())) {
    socket.emit('error', { message: 'Conteúdo é obrigatório' });
    return;
  }

  try {
    const room = await InternalConversation.findById(roomId);
    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }

    // Verificar se o usuário está na lista de participantes
    const isParticipant = room.participants.some(
      (participantId) => participantId.toString() === socket.livechatUserId!.toString()
    );

    // Admin pode enviar mensagens em todas as salas, mesmo sem ser participante
    if (!isParticipant && socket.userRole !== 'admin') {
      socket.emit('error', { message: 'Você não tem permissão para enviar mensagens nesta sala' });
      return;
    }

    const message = await InternalRoomMessage.create({
      internalConversationId: roomId,
      senderId: socket.livechatUserId,
      content: content?.trim() || '',
      messageType: messageType || 'text',
      metadata: metadata || (imageUrl ? { imageUrl } : null),
    });

    // Incrementar unreadCount apenas para os outros participantes (não para o remetente)
    // Buscar todos os participantes para obter seus externalUserId
    const allParticipants = await User.find({
      _id: { $in: room.participants }
    }).select('_id externalUserId').lean();

    const senderUser = allParticipants.find(
      (participant) => participant._id.toString() === socket.livechatUserId!.toString()
    );

    const otherParticipants = allParticipants.filter(
      (participant) => participant._id.toString() !== socket.livechatUserId!.toString()
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
    const senderExternalId = senderUser?.externalUserId || socket.livechatUserId!.toString();
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

    const populatedMessage = await InternalRoomMessage.findById(message._id)
      .populate('senderId', 'username email externalUserId role')
      .lean();

    const messageToEmit = {
      ...populatedMessage,
      internalConversationId: roomId,
    };

    // Emitir mensagem para participantes da sala
    io.to(`internal:room:${roomId}`).emit('internal:room:message', messageToEmit);

    // Emitir atualização de contador não lido
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
  } catch (error) {
    console.error('❌ [Socket] Erro ao enviar mensagem:', error);
    socket.emit('error', { message: 'Erro ao enviar mensagem' });
  }
}

