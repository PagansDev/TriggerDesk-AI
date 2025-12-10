import { Server } from 'socket.io';
import { IAuthenticatedSocket, ISupportContext } from '../../../@types/controllers/chat.controller.d.js';
import { handleConnection } from './handlers/connection.handler.js';
import { handleMessage } from './handlers/message.handler.js';
import { handleSupportMessage } from './handlers/support-message.handler.js';
import { handleInternalMessage } from './handlers/internal-message.handler.js';
import {
  handleInternalRoomJoin,
  handleInternalRoomMessage,
} from './handlers/internal-room.handler.js';
import { handleTyping } from './handlers/typing.handler.js';
import { handleConversationJoin } from './handlers/conversation-join.handler.js';
import { handleDisconnect } from './handlers/disconnect.handler.js';
import { handleTicketViewing, handleTicketLeft } from './handlers/ticket-tracking.handler.js';
import {
  handleNotificationMarkAsRead,
  handleNotificationMarkConversationAsRead,
  handleNotificationDelete,
  handleNotificationGetUnread,
} from './handlers/notification.handler.js';

export class ChatController {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  async handleConnection(socket: IAuthenticatedSocket) {
    return handleConnection(this.io, socket);
  }

  async handleMessage(
    socket: IAuthenticatedSocket,
    content: string,
    supportContext?: ISupportContext,
    imageUrl?: string,
    messageType?: 'text' | 'image',
    metadata?: any
  ) {
    return handleMessage(this.io, socket, content, supportContext, imageUrl, messageType, metadata);
  }

  async handleSupportMessage(
    socket: IAuthenticatedSocket,
    content: string,
    imageUrl?: string,
    messageType?: 'text' | 'image',
    metadata?: any
  ) {
    return handleSupportMessage(this.io, socket, content, imageUrl, messageType, metadata);
  }

  async handleInternalMessage(
    socket: IAuthenticatedSocket,
    content: string,
    imageUrl?: string,
    messageType?: 'text' | 'image',
    metadata?: any
  ) {
    return handleInternalMessage(this.io, socket, content, imageUrl, messageType, metadata);
  }

  async handleTyping(socket: IAuthenticatedSocket, isTyping: boolean) {
    return handleTyping(this.io, socket, isTyping);
  }

  async handleConversationJoin(
    socket: IAuthenticatedSocket,
    conversationId: string
  ) {
    return handleConversationJoin(this.io, socket, conversationId);
  }

  async handleInternalRoomJoin(socket: IAuthenticatedSocket, roomId: string) {
    return handleInternalRoomJoin(this.io, socket, roomId);
  }

  async handleInternalRoomMessage(
    socket: IAuthenticatedSocket,
    data: {
      roomId: string;
      content: string;
      imageUrl?: string;
      messageType?: 'text' | 'image';
      metadata?: any;
    }
  ) {
    return handleInternalRoomMessage(this.io, socket, data);
  }

  async handleDisconnect(socket: IAuthenticatedSocket) {
    return handleDisconnect(this.io, socket);
  }

  async handleTicketViewing(
    socket: IAuthenticatedSocket,
    ticketId: string,
    conversationId: string
  ) {
    return handleTicketViewing(this.io, socket, ticketId, conversationId);
  }

  async handleTicketLeft(
    socket: IAuthenticatedSocket,
    ticketId: string,
    conversationId: string
  ) {
    return handleTicketLeft(this.io, socket, ticketId, conversationId);
  }

  async handleNotificationMarkAsRead(
    socket: IAuthenticatedSocket,
    data: { notificationId?: string; notificationIds?: string[] }
  ) {
    return handleNotificationMarkAsRead(this.io, socket, data);
  }

  async handleNotificationDelete(
    socket: IAuthenticatedSocket,
    data: { notificationId: string }
  ) {
    return handleNotificationDelete(this.io, socket, data);
  }

  async handleNotificationGetUnread(socket: IAuthenticatedSocket) {
    return handleNotificationGetUnread(this.io, socket);
  }

  async handleNotificationMarkConversationAsRead(
    socket: IAuthenticatedSocket,
    data: { conversationId: string }
  ) {
    return handleNotificationMarkConversationAsRead(this.io, socket, data);
  }
}

