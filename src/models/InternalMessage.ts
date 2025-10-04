import mongoose, { Schema } from 'mongoose';
import type { IInternalMessage } from '../../@types/models/InternalMessage';

const InternalMessageSchema = new Schema<IInternalMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: false,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'messages',
  }
);

InternalMessageSchema.index({ conversationId: 1, createdAt: -1 });
InternalMessageSchema.index({ senderId: 1 });
InternalMessageSchema.index({ messageType: 1 });

const InternalMessage = mongoose.model<IInternalMessage>('InternalMessage', InternalMessageSchema);

export default InternalMessage;
