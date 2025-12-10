import { Document, Types } from 'mongoose';

export interface IInternalRoomMessage extends Document {
  _id: Types.ObjectId;
  internalConversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  isEdited: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface InternalRoomMessageInput {
  internalConversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
}
