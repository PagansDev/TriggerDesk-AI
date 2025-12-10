import mongoose, { Schema } from 'mongoose';
import type { IInternalConversation } from '../../@types/models/internalConversation';

const InternalConversationSchema = new Schema<IInternalConversation>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    isGeneral: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    unreadCountByUser: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  {
    timestamps: true,
    collection: 'internalConversations',
  }
);

InternalConversationSchema.index({ isGeneral: 1 });
InternalConversationSchema.index({ participants: 1 });
InternalConversationSchema.index({ lastMessageAt: -1 });

const InternalConversation = mongoose.model<IInternalConversation>(
  'InternalConversation',
  InternalConversationSchema
);

export default InternalConversation;
