import mongoose, { Schema } from 'mongoose';
import type { IChatNotification } from '../../@types/models/chatNotification';

const ChatNotificationSchema = new Schema<IChatNotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
    senderName: {
      type: String,
      required: true,
      maxlength: 100,
    },
    senderRole: {
      type: String,
      enum: ['user', 'support', 'admin'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
    },
    messagePreview: {
      type: String,
      required: true,
      maxlength: 150,
    },
    messageType: {
      type: String,
      enum: ['text', 'image'],
      default: 'text',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

// Índices para otimizar consultas
ChatNotificationSchema.index({ userId: 1, isRead: 1 });
ChatNotificationSchema.index({ conversationId: 1 });
ChatNotificationSchema.index({ createdAt: -1 });
ChatNotificationSchema.index({ userId: 1, createdAt: -1 });

const ChatNotification = mongoose.model<IChatNotification>(
  'ChatNotification',
  ChatNotificationSchema
);

export default ChatNotification;

