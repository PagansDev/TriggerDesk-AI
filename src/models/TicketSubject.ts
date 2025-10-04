import mongoose, { Schema } from 'mongoose';
import type { ITicketSubject } from '../../@types/models/ticketSubject';

const TicketSubjectSchema = new Schema<ITicketSubject>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    priority: {
      type: Number,
      default: 2,
    },
  },
  {
    timestamps: true,
    collection: 'ticketSubjects',
  }
);

TicketSubjectSchema.index({ priority: 1 });

const TicketSubject = mongoose.model<ITicketSubject>('TicketSubject', TicketSubjectSchema);

export default TicketSubject;
