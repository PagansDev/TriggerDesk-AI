import mongoose, { Schema } from 'mongoose';
import type { IMessage } from '../../@types/models/message';

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },
    isFromAI: {
      type: Boolean,
      default: false,
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

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ messageType: 1 });

// Validação customizada para permitir content vazio em mensagens de imagem
MessageSchema.pre('validate', function(next) {
  // Se for mensagem de imagem, garantir que content seja string vazia se não foi fornecido
  if (this.messageType === 'image' && (this.content == null || this.content === '')) {
    this.content = '';
    return next();
  }

  // Para outros tipos de mensagem, garantir que content não esteja vazio
  if (this.messageType !== 'image' && (!this.content || this.content.trim().length === 0)) {
    return next(new Error('Content é obrigatório para mensagens de texto'));
  }

  next();
});

const Message = mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
