import { Document, Types } from 'mongoose';

export type ConversationStatus = 'active' | 'closed' | 'archived';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  externalUserId: Types.ObjectId;
  title: string;
  status: ConversationStatus;
  lastMessageAt: Date;
  hasInternalMessages: boolean;
  spamCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationInput {
  userId: Types.ObjectId;
  externalUserId: Types.ObjectId;
  title: string;
  status?: ConversationStatus;
  lastMessageAt?: Date;
  hasInternalMessages?: boolean;
  spamCount?: number;
}
