import mongoose from 'mongoose';
import 'dotenv/config';

const user = process.env['MONGO_INITDB_ROOT_USERNAME'];
const pass = process.env['MONGO_INITDB_ROOT_PASSWORD'];
const host = process.env['MONGO_HOST'] || 'localhost';
const db = process.env['MONGO_DB'] || 'pagansdev_livechat';

const getConnectionString = (): string => {
  if (!user || !pass) {
    console.error('❌ [MongoDB] Credenciais não configuradas no .env');
    console.error('   Defina: MONGO_INITDB_ROOT_USERNAME e MONGO_INITDB_ROOT_PASSWORD');
    throw new Error('MongoDB credentials missing');
  }

  const uri = process.env['MONGODB_URI'] ||
    `mongodb://${user}:${pass}@${host}:27017/${db}?authSource=admin`;
  return uri;
};

const connectDatabase = async (): Promise<void> => {
  try {
    const connectionString = getConnectionString();
    console.log('[MongoDB] Conectando...');
    console.log('[MongoDB] URI:', connectionString.replace(pass || '', '****'));

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
