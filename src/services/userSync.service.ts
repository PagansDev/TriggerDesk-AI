import User from '../models/User.js';

export interface UserSyncData {
  externalUserId: string;
  username: string;
}

export class UserSyncService {
  async findOrCreateUser(data: UserSyncData) {
    try {
      let user = await User.findOne({ externalUserId: data.externalUserId });

      if (user) {
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();
        console.log(` [UserSync] Usuário atualizado: ${user.username}`);
        return user;
      }

      user = await User.create({
        externalUserId: data.externalUserId,
        username: data.username,
        isOnline: true,
        lastSeen: new Date(),
      });

      console.log(` [UserSync] Novo usuário criado: ${user.username}`);
      return user;
    } catch (error) {
      console.error('❌ [UserSync] Erro ao sincronizar usuário:', error);
      throw error;
    }
  }

  async updateUserStatus(externalUserId: string, isOnline: boolean) {
    try {
      await User.findOneAndUpdate(
        { externalUserId },
        { isOnline, lastSeen: new Date() }
      );
    } catch (error) {
      console.error('❌ [UserSync] Erro ao atualizar status:', error);
    }
  }
}

export default new UserSyncService();
