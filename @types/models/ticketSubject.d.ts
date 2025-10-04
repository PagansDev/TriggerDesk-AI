import { Document, Types } from 'mongoose';

export interface ITicketSubject extends Document {
  _id: Types.ObjectId;
  name: string;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketSubjectInput {
  name: string;
  priority: number;
}