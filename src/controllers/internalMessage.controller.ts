import { Response } from 'express';
import { Types } from 'mongoose';
import InternalMessage from '../models/InternalMessage.js';
import Conversation from '../models/Conversation.js';
import { IAuthenticatedRequest } from '../../@types/middlewares/auth.middleware.d.js';

export class InternalMessageController {
  async getInternalMessages(req: IAuthenticatedRequest, res: Response) {
    try {
      const conversationId = req.params['conversationId'];

      if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ error: 'ID da conversa inválido' });
      }

      const internalMessages = await InternalMessage.find({
        conversationId: new Types.ObjectId(conversationId),
      })
        .sort({ createdAt: 1 })
        .populate('senderId', 'username externalUserId role')
        .lean();

      return res.json(internalMessages);
    } catch (error) {
      console.error(
        '❌ [InternalMessageController] Erro ao buscar notas internas:',
        error
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async updateInternalMessage(req: IAuthenticatedRequest, res: Response) {
    try {
      const id = req.params['id'];
      const { content } = req.body;

      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      if (!content || !content.trim()) {
        return res
          .status(400)
          .json({ error: 'Conteúdo da nota é obrigatório' });
      }

      const internalMessage = await InternalMessage.findByIdAndUpdate(
        id,
        {
          content,
          isEdited: true,
        },
        { new: true }
      ).populate('senderId', 'username externalUserId role');

      if (!internalMessage) {
        return res.status(404).json({ error: 'Nota interna não encontrada' });
      }

      return res.json(internalMessage);
    } catch (error) {
      console.error(
        '❌ [InternalMessageController] Erro ao atualizar nota interna:',
        error
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async deleteInternalMessage(req: IAuthenticatedRequest, res: Response) {
    try {
      const id = req.params['id'];

      if (!id || !Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
      }

      const internalMessage = await InternalMessage.findByIdAndDelete(id);

      if (!internalMessage) {
        return res.status(404).json({ error: 'Nota interna não encontrada' });
      }

      const remainingNotes = await InternalMessage.countDocuments({
        conversationId: internalMessage.conversationId,
      });

      if (remainingNotes === 0) {
        await Conversation.findByIdAndUpdate(internalMessage.conversationId, {
          hasInternalMessages: false,
        });
      }

      return res.json({ message: 'Nota interna deletada com sucesso' });
    } catch (error) {
      console.error(
        '❌ [InternalMessageController] Erro ao deletar nota interna:',
        error
      );
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

export default new InternalMessageController();
