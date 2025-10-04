import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

import { connectDatabase } from './models/index.js';
import chatSocket from './sockets/chat.js';
// import routes from './routes/index.js';

import { socketAuthMiddleware } from './middlewares/auth.middleware.js';
import PromptLoaderService from './services/promptLoader.service.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.use('/api', routes);

io.use(socketAuthMiddleware);

chatSocket(io);

const PORT = process.env['PORT'] || 3001;

const startServer = async () => {
  try {
    await connectDatabase();
    console.log(' [MongoDB] Conexão estabelecida');

    await PromptLoaderService.initialize();
    console.log(' [PromptLoader] Prompts do sistema carregados');

    server.listen(PORT, () => {
      console.log(` [Server] Rodando na porta ${PORT}`);
      console.log(` [WebSocket] Aguardando conexões...`);
    });
  } catch (error) {
    console.error('❌ [Server] Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

const gracefulShutdown = (signal: string) => {
  console.log(`\n [Server] Recebido sinal ${signal}, encerrando...`);

  // Fechar todas as conexões WebSocket primeiro
  io.disconnectSockets();
  io.close();

  // Depois fechar o servidor HTTP
  server.close(() => {
    console.log(' [Server] Servidor HTTP fechado');
    console.log(' [WebSocket] Conexões WebSocket fechadas');
    process.exit(0);
  });

  // Timeout mais curto para forçar encerramento
  setTimeout(() => {
    console.error(' [Server] Forçando encerramento após timeout');
    process.exit(1);
  }, 5000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

startServer();
