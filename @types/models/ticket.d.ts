import { Document, Types } from 'mongoose';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_dev_team'
  | 'resolved'
  | 'reopened'
  | 'archived'
  | 'closed';

export interface ITicket extends Document {
  _id: Types.ObjectId;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  externalUserId: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  subject?: string;
  lastUpdatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  unreadCountUser: number;
  unreadCountSupport: number;
  unreadCountAdmin: number;
  unreadCountByUser?: Map<string, number>;
}

export interface TicketInput {
  title: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  externalUserId: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  subject?: string;
  lastUpdatedBy?: Types.ObjectId;
  unreadCountUser?: number;
  unreadCountSupport?: number;
  unreadCountAdmin?: number;
}
