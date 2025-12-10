import { Request, Response } from 'express';
import imageUploadService from '../services/imageUpload.service.js';
import userSyncService from '../services/userSync.service.js';
import { IAuthenticatedRequest } from '../../@types/middlewares/auth.middleware.d.js';

export class ImageController {
  async uploadImage(req: IAuthenticatedRequest, res: Response) {
    try {
      //@ts-ignore
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Nenhuma imagem enviada' });
      }

      const conversationId = req.body.conversationId || '';
      const externalUserId = (req as any).userId;

      if (!externalUserId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const user = await userSyncService.findUserByExternalId(externalUserId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verifica se está banido (admins não podem ser banidos)
      if (user.isBanned && user.role !== 'admin') {
        return res.status(403).json({
          error: 'Você está banido e não pode enviar imagens.',
          bannedUntil: user.bannedUntil,
        });
      }

      const result = await imageUploadService.uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
        conversationId,
        user._id,
        user.role
      );

      console.log(`[Image] Imagem enviada: ${result.imageId}`);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('❌ [Image] Erro ao fazer upload:', error);
      return res.status(500).json({
        error: error.message || 'Erro ao fazer upload da imagem',
      });
    }
  }

  async getImage(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID da imagem não fornecido' });
      }

      const imageBuffer = await imageUploadService.getImage(id);

      if (!imageBuffer) {
        return res.status(404).json({ error: 'Imagem não encontrada' });
      }

      const imageInfo = await imageUploadService.getImageInfo(id);
      if (!imageInfo) {
        return res.status(404).json({ error: 'Imagem não encontrada' });
      }

      res.setHeader('Content-Type', imageInfo.contentType);
      res.setHeader('Content-Length', imageInfo.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 ano

      return res.send(imageBuffer);
    } catch (error: any) {
      console.error('❌ [Image] Erro ao buscar imagem:', error);
      return res.status(500).json({
        error: error.message || 'Erro ao buscar imagem',
      });
    }
  }
}

export default new ImageController();

