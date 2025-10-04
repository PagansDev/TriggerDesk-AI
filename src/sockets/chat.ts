import { Server, Socket } from 'socket.io';
import { ChatController } from '../controllers/chat.controller.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  userEmail?: string;
  userRole?: string;
}

const chatSocket = (io: Server) => {
  const controller = new ChatController(io);

  io.on('connection', async (socket: AuthenticatedSocket) => {
    await controller.handleConnection(socket);

    socket.on(
      'send_message',
      async (data: { content: string; supportContext?: any }) => {
        await controller.handleMessage(
          socket,
          data.content,
          data.supportContext
        );
      }
    );

    socket.on('disconnect', () => {
      controller.handleDisconnect(socket);
    });
  });
};

export default chatSocket;
