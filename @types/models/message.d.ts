import { Document, Types } from 'mongoose';

export type MessageType = 'text' | 'image' | 'file' | 'system';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  ticketId?: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: MessageType;
  isFromAI: boolean;
  isEdited: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageInput {
  conversationId: Types.ObjectId;
  ticketId?: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType?: MessageType;
  isFromAI?: boolean;
  isEdited?: boolean;
  metadata?: Record<string, any>;
}
