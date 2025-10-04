import mongoose, { Schema } from 'mongoose';
import type { ITicket } from '../../@types/models/ticket';

const TicketSchema = new Schema<ITicket>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'reopened', 'archived', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    externalUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'TicketSubject',
      default: null,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    unreadCountUser: {
      type: Number,
      default: 0,
      min: 0,
    },
    unreadCountSupport: {
      type: Number,
      default: 0,
      min: 0,
    },
    unreadCountAdmin: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'tickets',
  }
);

TicketSchema.index({ externalUserId: 1 });
TicketSchema.index({ subjectId: 1 });
TicketSchema.index({ priority: 1 });
TicketSchema.index({ status: 1 });
TicketSchema.index({ createdAt: -1 });

const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema);

export default Ticket;
