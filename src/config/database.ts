import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const { MONGODB_URI } = process.env;

const getConnectionString = (): string => {
  return MONGODB_URI || 'mongodb://localhost:27017/lnbot_livechat';
};

const connectDatabase = async (): Promise<void> => {
  try {
    const connectionString = getConnectionString();
    console.log(' [MongoDB] Conectando...');
    console.log(
      ' [MongoDB] URI:',
      connectionString.replace(/:[^:@]+@/, ':****@')
    );

    await mongoose.connect(connectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    });

    console.log(' [MongoDB] Conectado com sucesso');
  } catch (error) {
    console.error('❌ [MongoDB] Erro ao conectar:', error);
    process.exit(1);
  }
};

export default connectDatabase;
