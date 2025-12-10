import User from '../models/User.js';

export interface UserSyncData {
  externalUserId: string;
  username: string;
  role?: string | undefined;
  email?: string | undefined;
}

export class UserSyncService {
  async findOrCreateUser(data: UserSyncData) {
    try {
      const existingUser = await User.findOne({
        externalUserId: data.externalUserId,
      });

      if (existingUser) {
        const updateData: any = {
          isOnline: true,
          lastSeen: new Date(),
        };

        if (data.role) {
          updateData.role = data.role;
        }
        if (data.email) {
          updateData.email = data.email;
        }

        const user = await User.findOneAndUpdate(
          { externalUserId: data.externalUserId },
          updateData,
          { new: true },
        );

        return user!;
      }

      const user = await User.create({
        externalUserId: data.externalUserId,
        username: data.username,
        role: data.role || 'user',
        email: data.email || null,
        isOnline: true,
        lastSeen: new Date(),
      });

      console.log(
        `[UserSync] Novo usuário criado: ${user.username} (${user.role})`,
      );
      return user;
    } catch (error) {
      console.error('❌ [UserSync] Erro ao sincronizar usuário:', error);
      throw error;
    }
  }

  async findUserByExternalId(externalUserId: string) {
    try {
      const user = await User.findOne({ externalUserId }).lean();
      return user;
    } catch (error) {
      console.error('❌ [UserSync] Erro ao buscar usuário:', error);
      return null;
    }
  }

  async findUserById(userId: any) {
    try {
      const user = await User.findById(userId).lean();
      return user;
    } catch (error) {
      console.error('❌ [UserSync] Erro ao buscar usuário por ID:', error);
      return null;
    }
  }

  async updateUserStatus(externalUserId: string, isOnline: boolean) {
    try {
      await User.findOneAndUpdate(
        { externalUserId },
        { isOnline, lastSeen: new Date() },
      );
    } catch (error) {
      console.error('❌ [UserSync] Erro ao atualizar status:', error);
    }
  }
}

export default new UserSyncService();
