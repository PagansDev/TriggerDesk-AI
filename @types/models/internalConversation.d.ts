import { Document, Types } from 'mongoose';

export interface IInternalConversation extends Document {
  _id: Types.ObjectId;
  title: string;
  participants: Types.ObjectId[];
  isGeneral: boolean;
  createdBy: Types.ObjectId;
  lastMessageAt: Date;
  unreadCount: number;
  unreadCountByUser?: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InternalConversationInput {
  title: string;
  participants: Types.ObjectId[];
  isGeneral?: boolean;
  createdBy: Types.ObjectId;
}
