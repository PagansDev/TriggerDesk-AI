import mongoose, { Schema } from 'mongoose';
import type { IInternalRoomMessage } from '../../@types/models/internalRoomMessage';

const InternalRoomMessageSchema = new Schema<IInternalRoomMessage>(
  {
    internalConversationId: {
      type: Schema.Types.ObjectId,
      ref: 'InternalConversation',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: false,
      default: '',
      validate: {
        validator: function(this: IInternalRoomMessage, value: string) {
          // Se for imagem, permitir vazio
          if (this.messageType === 'image') {
            return true;
          }
          // Para outros tipos, content não pode estar vazio
          return value != null && value.trim().length > 0;
        },
        message: 'Conteúdo é obrigatório para mensagens de texto',
      },
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
    collection: 'internalRoomMessages',
  }
);

InternalRoomMessageSchema.index({ internalConversationId: 1, createdAt: -1 });
InternalRoomMessageSchema.index({ senderId: 1 });

const InternalRoomMessage = mongoose.model<IInternalRoomMessage>(
  'InternalRoomMessage',
  InternalRoomMessageSchema
);

export default InternalRoomMessage;
