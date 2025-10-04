import { Document, Types } from 'mongoose';

export type MessageType = 'text' | 'image' | 'file' | 'system';

export interface IInternalMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  ticketId?: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: MessageType;
  isEdited: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InternalMessageInput {
  conversationId: Types.ObjectId;
  ticketId?: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType?: MessageType;
  isEdited?: boolean;
  metadata?: Record<string, any>;
}
