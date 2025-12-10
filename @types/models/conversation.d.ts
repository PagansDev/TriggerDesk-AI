import { Document, Types } from 'mongoose';

export type ConversationStatus = 'active' | 'closed' | 'archived';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  externalUserId: Types.ObjectId;
  ticketId?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  title: string;
  status: ConversationStatus;
  lastMessageAt: Date;
  hasInternalMessages: boolean;
  isInternal: boolean;
  needHumanAttention: boolean;
  spamCount: number;
  unreadCount: number;
  metadata?: {
    inactivityWarningSentAt?: Date;
    [key: string]: any;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationInput {
  userId: Types.ObjectId;
  ticketId?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  externalUserId: Types.ObjectId;
  title: string;
  status?: ConversationStatus;
  lastMessageAt?: Date;
  hasInternalMessages?: boolean;
  isInternal?: boolean;
  needHumanAttention?: boolean;
  spamCount?: number;
}
