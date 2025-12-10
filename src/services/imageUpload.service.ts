import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { Types } from 'mongoose';
import floodProtectionService from './floodProtection.service.js';

export interface UploadedImageResult {
  imageId: string;
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export class ImageUploadService {
  private bucket: GridFSBucket | null = null;

  private getBucket(): GridFSBucket {
    if (!this.bucket) {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database não está conectada');
      }
      this.bucket = new GridFSBucket(db, { bucketName: 'images' });
    }
    return this.bucket;
  }

  async uploadImage(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    conversationId: string,
    userId: Types.ObjectId,
    userRole?: string
  ): Promise<UploadedImageResult> {
    try {
      // Verificar proteção contra flood ANTES de processar
      const floodCheck = await floodProtectionService.checkImageUpload(
        userId,
        buffer.length,
        new Types.ObjectId(conversationId),
        userRole
      );

      if (!floodCheck.allowed) {
        throw new Error(floodCheck.reason || 'Upload de imagem não permitido');
      }

      const bucket = this.getBucket();
      const imageId = new Types.ObjectId();

      // Validar tipo de arquivo
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimes.includes(mimetype)) {
        throw new Error(`Tipo de arquivo não permitido: ${mimetype}`);
      }

      // Validar tamanho (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (buffer.length > maxSize) {
        throw new Error('Imagem muito grande. Tamanho máximo: 5MB');
      }

      // Criar stream de upload
      const uploadStream = bucket.openUploadStreamWithId(imageId, filename, {
        contentType: mimetype,
        metadata: {
          conversationId,
          uploadedAt: new Date(),
        },
      });

      return new Promise((resolve, reject) => {
        uploadStream.on('finish', () => {
          const url = `/api/images/${imageId.toString()}`;
          resolve({
            imageId: imageId.toString(),
            url,
            filename,
            size: buffer.length,
            mimetype,
          });
        });

        uploadStream.on('error', (error) => {
          console.error('❌ [ImageUpload] Erro no upload:', error);
          reject(error);
        });

        uploadStream.end(buffer);
      });
    } catch (error) {
      console.error('❌ [ImageUpload] Erro ao fazer upload:', error);
      throw error;
    }
  }

  async getImage(imageId: string): Promise<Buffer | null> {
    try {
      const bucket = this.getBucket();
      const objectId = new Types.ObjectId(imageId);

      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        return null;
      }

      const downloadStream = bucket.openDownloadStream(objectId);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        downloadStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        downloadStream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        downloadStream.on('error', (error) => {
          console.error('❌ [ImageUpload] Erro ao baixar imagem:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('❌ [ImageUpload] Erro ao buscar imagem:', error);
      throw error;
    }
  }

  async getImageInfo(imageId: string): Promise<{
    filename: string;
    contentType: string;
    length: number;
    uploadDate: Date;
  } | null> {
    try {
      const bucket = this.getBucket();
      const objectId = new Types.ObjectId(imageId);

      const files = await bucket.find({ _id: objectId }).toArray();
      if (files.length === 0) {
        return null;
      }

      const file = files[0];
      if (!file) {
        return null;
      }

      return {
        filename: file.filename || 'image',
        contentType: file.contentType || 'image/jpeg',
        length: file.length || 0,
        uploadDate: file.uploadDate || new Date(),
      };
    } catch (error) {
      console.error('❌ [ImageUpload] Erro ao buscar info da imagem:', error);
      throw error;
    }
  }

  async deleteImage(imageId: string): Promise<boolean> {
    try {
      const bucket = this.getBucket();
      const objectId = new Types.ObjectId(imageId);

      await bucket.delete(objectId);
      return true;
    } catch (error) {
      console.error('❌ [ImageUpload] Erro ao deletar imagem:', error);
      return false;
    }
  }
}

export default new ImageUploadService();

