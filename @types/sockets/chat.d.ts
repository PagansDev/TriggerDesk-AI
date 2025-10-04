import { Socket } from 'socket.io';

export interface ChatSocket extends Socket {
  userId?: string;
  conversationId?: string;
}

export interface JoinConversationData {
  userId: string;
  conversationId: string;
}

export interface SendMessageData {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
}
