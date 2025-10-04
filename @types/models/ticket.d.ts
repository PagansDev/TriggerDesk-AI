import { Document, Types } from 'mongoose';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'reopened' |'archived'|'closed';

export interface ITicket extends Document {
  _id: Types.ObjectId;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  externalUserId: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  subjectId?: Types.ObjectId;
  lastUpdatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  unreadCountUser: number;
  unreadCountSupport: number;
  unreadCountAdmin: number;
}

export interface TicketInput {
  title: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  externalUserId: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  subjectId?: Types.ObjectId;
  lastUpdatedBy?: Types.ObjectId;
  unreadCountUser?: number;
  unreadCountSupport?: number;
  unreadCountAdmin?: number;
}
