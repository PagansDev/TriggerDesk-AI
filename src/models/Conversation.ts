import mongoose, { Schema } from 'mongoose';
import type { IConversation } from '../../@types/models/conversation';

const ConversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    externalUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: false,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'archived'],
      default: 'active',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    hasInternalMessages: {
      type: Boolean,
      default: false,
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
    spamCount: {
      type: Number,
      default: 0,
    },
    needHumanAttention: {
      type: Boolean,
      default: false,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

ConversationSchema.index({ userId: 1 });
ConversationSchema.index({ status: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model<IConversation>(
  'Conversation',
  ConversationSchema
);

export default Conversation;
