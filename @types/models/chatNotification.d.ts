import { Types } from 'mongoose';

export interface IChatNotification {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  conversationId: Types.ObjectId;
  ticketId?: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  senderRole: 'user' | 'support' | 'admin';
  title: string;
  message: string;
  messagePreview: string;
  messageType: 'text' | 'image';
  isRead: boolean;
  readAt?: Date;
  metadata?: {
    subject?: string;
    priority?: string;
    imageUrl?: string;
    imageId?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

