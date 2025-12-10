import { Types } from 'mongoose';
import User from '../models/User.js';
import Message from '../models/Message.js';

export interface FloodCheckResult {
  allowed: boolean;
  reason?: string;
  shouldBan?: boolean;
  warnings?: number;
}

interface ImageUploadRecord {
  userId: Types.ObjectId;
  timestamp: Date;
  size: number; // em bytes
}

// Cache em memória para rastrear uploads recentes
const imageUploadHistory = new Map<string, ImageUploadRecord[]>();

// Configurações de flood protection
const FLOOD_CONFIG = {
  // Máximo de imagens por janela de tempo
  MAX_IMAGES_PER_MINUTE: 5,
  MAX_IMAGES_PER_HOUR: 20,

  // Tamanho máximo total por janela de tempo
  MAX_SIZE_PER_MINUTE: 5 * 1024 * 1024, // 5MB por minuto
  MAX_SIZE_PER_HOUR: 20 * 1024 * 1024, // 20MB por hora

  // Limite de tamanho individual
  MAX_INDIVIDUAL_SIZE: 5 * 1024 * 1024, // 5MB por imagem

  // Janelas de tempo (em ms)
  MINUTE_WINDOW: 60 * 1000,
  HOUR_WINDOW: 60 * 60 * 1000,

  // Sistema de warnings antes de banir
  MAX_WARNINGS: 3,
  WARNING_EXPIRY: 60 * 60 * 1000, // 1 hora
};

export class FloodProtectionService {
  /**
   * Verifica se o upload de imagem é permitido
   */
  async checkImageUpload(
    userId: Types.ObjectId,
    imageSize: number,
    conversationId: Types.ObjectId,
    userRole?: string,
  ): Promise<FloodCheckResult> {
    try {
      // Admins não têm limitações de flood protection
      if (userRole === 'admin') {
        return {
          allowed: true,
        };
      }

      const userKey = userId.toString();

      // Limpar histórico antigo
      this.cleanOldHistory(userKey);

      // Verificar tamanho individual
      if (imageSize > FLOOD_CONFIG.MAX_INDIVIDUAL_SIZE) {
        return {
          allowed: false,
          reason: `Imagem muito grande. Tamanho máximo permitido: ${
            FLOOD_CONFIG.MAX_INDIVIDUAL_SIZE / 1024 / 1024
          }MB`,
        };
      }

      // Buscar histórico do usuário
      const history = imageUploadHistory.get(userKey) || [];
      const now = new Date();

      // Filtrar uploads na última hora
      const recentUploads = history.filter(
        (record) =>
          now.getTime() - record.timestamp.getTime() < FLOOD_CONFIG.HOUR_WINDOW,
      );

      // Filtrar uploads no último minuto
      const lastMinuteUploads = recentUploads.filter(
        (record) =>
          now.getTime() - record.timestamp.getTime() <
          FLOOD_CONFIG.MINUTE_WINDOW,
      );

      // Verificar quantidade por minuto
      if (lastMinuteUploads.length >= FLOOD_CONFIG.MAX_IMAGES_PER_MINUTE) {
        const warnings = await this.getWarningCount(userId);
        const shouldBan = warnings >= FLOOD_CONFIG.MAX_WARNINGS;

        if (shouldBan && userRole !== 'admin') {
          await this.banUser(
            userId,
            'Flood de imagens - muitas imagens em pouco tempo',
          );
          return {
            allowed: false,
            reason:
              'Você foi banido por enviar muitas imagens muito rapidamente.',
            shouldBan: true,
          };
        }

        await this.addWarning(userId);
        return {
          allowed: false,
          reason: `Muitas imagens enviadas. Aguarde antes de enviar mais. (Aviso ${
            warnings + 1
          }/${FLOOD_CONFIG.MAX_WARNINGS})`,
          warnings: warnings + 1,
        };
      }

      // Verificar quantidade por hora
      if (recentUploads.length >= FLOOD_CONFIG.MAX_IMAGES_PER_HOUR) {
        const warnings = await this.getWarningCount(userId);
        const shouldBan = warnings >= FLOOD_CONFIG.MAX_WARNINGS;

        if (shouldBan && userRole !== 'admin') {
          await this.banUser(
            userId,
            'Flood de imagens - muitas imagens em uma hora',
          );
          return {
            allowed: false,
            reason:
              'Você foi banido por enviar muitas imagens em um curto período.',
            shouldBan: true,
          };
        }

        await this.addWarning(userId);
        return {
          allowed: false,
          reason: `Muitas imagens enviadas recentemente. Aguarde antes de enviar mais. (Aviso ${
            warnings + 1
          }/${FLOOD_CONFIG.MAX_WARNINGS})`,
          warnings: warnings + 1,
        };
      }

      // Verificar tamanho total no último minuto
      const lastMinuteSize = lastMinuteUploads.reduce(
        (sum, record) => sum + record.size,
        0,
      );
      if (lastMinuteSize + imageSize > FLOOD_CONFIG.MAX_SIZE_PER_MINUTE) {
        const warnings = await this.getWarningCount(userId);
        const shouldBan = warnings >= FLOOD_CONFIG.MAX_WARNINGS;

        if (shouldBan && userRole !== 'admin') {
          await this.banUser(
            userId,
            'Flood de imagens - muito tamanho em pouco tempo',
          );
          return {
            allowed: false,
            reason:
              'Você foi banido por enviar muitas imagens grandes muito rapidamente.',
            shouldBan: true,
          };
        }

        await this.addWarning(userId);
        return {
          allowed: false,
          reason: `Tamanho total de imagens excedido. Aguarde antes de enviar mais. (Aviso ${
            warnings + 1
          }/${FLOOD_CONFIG.MAX_WARNINGS})`,
          warnings: warnings + 1,
        };
      }

      // Verificar tamanho total na última hora
      const lastHourSize = recentUploads.reduce(
        (sum, record) => sum + record.size,
        0,
      );
      if (lastHourSize + imageSize > FLOOD_CONFIG.MAX_SIZE_PER_HOUR) {
        const warnings = await this.getWarningCount(userId);
        const shouldBan = warnings >= FLOOD_CONFIG.MAX_WARNINGS;

        if (shouldBan && userRole !== 'admin') {
          await this.banUser(
            userId,
            'Flood de imagens - muito tamanho em uma hora',
          );
          return {
            allowed: false,
            reason:
              'Você foi banido por enviar muitas imagens grandes em um curto período.',
            shouldBan: true,
          };
        }

        await this.addWarning(userId);
        return {
          allowed: false,
          reason: `Tamanho total de imagens excedido recentemente. Aguarde antes de enviar mais. (Aviso ${
            warnings + 1
          }/${FLOOD_CONFIG.MAX_WARNINGS})`,
          warnings: warnings + 1,
        };
      }

      // Verificar mensagens de imagem suspeitas no banco de dados
      const suspiciousCount = await this.checkSuspiciousImageMessages(
        userId,
        conversationId,
      );
      if (suspiciousCount > 5) {
        // Se houver mais de 5 mensagens de imagem na mesma conversa em pouco tempo
        const warnings = await this.getWarningCount(userId);
        const shouldBan = warnings >= FLOOD_CONFIG.MAX_WARNINGS;

        if (shouldBan) {
          await this.banUser(
            userId,
            'Flood de imagens - comportamento suspeito detectado',
          );
          return {
            allowed: false,
            reason: 'Você foi banido por comportamento suspeito com imagens.',
            shouldBan: true,
          };
        }

        await this.addWarning(userId);
        return {
          allowed: false,
          reason: `Comportamento suspeito detectado. Aguarde antes de enviar mais. (Aviso ${
            warnings + 1
          }/${FLOOD_CONFIG.MAX_WARNINGS})`,
          warnings: warnings + 1,
        };
      }

      // Registrar upload permitido
      this.recordUpload(userKey, imageSize);

      return { allowed: true };
    } catch (error) {
      console.error('❌ [FloodProtection] Erro ao verificar upload:', error);
      // Em caso de erro, permitir (fail-open) para não bloquear usuários legítimos
      return { allowed: true };
    }
  }

  /**
   * Registra um upload de imagem
   */
  private recordUpload(userKey: string, size: number): void {
    const history = imageUploadHistory.get(userKey) || [];
    history.push({
      userId: new Types.ObjectId(userKey),
      timestamp: new Date(),
      size,
    });

    // Manter apenas histórico da última hora
    const now = new Date();
    const filteredHistory = history.filter(
      (record) =>
        now.getTime() - record.timestamp.getTime() < FLOOD_CONFIG.HOUR_WINDOW,
    );

    imageUploadHistory.set(userKey, filteredHistory);
  }

  /**
   * Limpa histórico antigo
   */
  private cleanOldHistory(userKey: string): void {
    const history = imageUploadHistory.get(userKey);
    if (!history) return;

    const now = new Date();
    const filteredHistory = history.filter(
      (record) =>
        now.getTime() - record.timestamp.getTime() < FLOOD_CONFIG.HOUR_WINDOW,
    );

    if (filteredHistory.length === 0) {
      imageUploadHistory.delete(userKey);
    } else {
      imageUploadHistory.set(userKey, filteredHistory);
    }
  }

  /**
   * Verifica mensagens de imagem suspeitas no banco
   */
  private async checkSuspiciousImageMessages(
    userId: Types.ObjectId,
    conversationId: Types.ObjectId,
  ): Promise<number> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const count = await Message.countDocuments({
        conversationId,
        senderId: userId,
        messageType: 'image',
        createdAt: { $gte: fiveMinutesAgo },
      });

      return count;
    } catch (error) {
      console.error(
        '❌ [FloodProtection] Erro ao verificar mensagens suspeitas:',
        error,
      );
      return 0;
    }
  }

  /**
   * Obtém contagem de warnings do usuário
   */
  private async getWarningCount(userId: Types.ObjectId): Promise<number> {
    try {
      const user = await User.findById(userId).lean();
      if (!user) return 0;

      // Usar campo metadata para armazenar warnings (se não existir, criar)
      const warnings = (user as any).imageUploadWarnings || 0;
      const lastWarning = (user as any).lastImageWarningAt;

      // Resetar warnings se passou o tempo de expiração
      if (lastWarning) {
        const lastWarningDate = new Date(lastWarning);
        if (
          Date.now() - lastWarningDate.getTime() >
          FLOOD_CONFIG.WARNING_EXPIRY
        ) {
          await User.findByIdAndUpdate(userId, {
            $set: {
              imageUploadWarnings: 0,
              lastImageWarningAt: null,
            },
          });
          return 0;
        }
      }

      return warnings || 0;
    } catch (error) {
      console.error('❌ [FloodProtection] Erro ao buscar warnings:', error);
      return 0;
    }
  }

  /**
   * Adiciona um warning ao usuário
   */
  private async addWarning(userId: Types.ObjectId): Promise<void> {
    try {
      const currentWarnings = await this.getWarningCount(userId);

      await User.findByIdAndUpdate(userId, {
        $set: {
          imageUploadWarnings: currentWarnings + 1,
          lastImageWarningAt: new Date(),
        },
      });

      console.log(
        `[FloodProtection] Warning adicionado ao usuário ${userId.toString()}. Total: ${
          currentWarnings + 1
        }`,
      );
    } catch (error) {
      console.error('❌ [FloodProtection] Erro ao adicionar warning:', error);
    }
  }

  /**
   * Bane o usuário por flood de imagens
   */
  private async banUser(userId: Types.ObjectId, reason: string): Promise<void> {
    try {
      const bannedUntil = new Date();
      bannedUntil.setDate(bannedUntil.getDate() + 2); // Banir por 2 dias

      await User.findByIdAndUpdate(userId, {
        $set: {
          isBanned: true,
          bannedAt: new Date(),
          bannedUntil: bannedUntil,
          banReason: reason,
        },
      });

      console.log(
        `[FloodProtection] Usuário ${userId.toString()} banido por: ${reason}. Banido até: ${bannedUntil.toISOString()}`,
      );
    } catch (error) {
      console.error('❌ [FloodProtection] Erro ao banir usuário:', error);
    }
  }

  /**
   * Limpa todo o histórico (útil para testes ou manutenção)
   */
  clearHistory(): void {
    imageUploadHistory.clear();
    console.log('[FloodProtection] Histórico de uploads limpo');
  }
}

export default new FloodProtectionService();
