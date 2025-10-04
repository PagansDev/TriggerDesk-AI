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
    spamCount: {
      type: Number,
      default: 0,
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
