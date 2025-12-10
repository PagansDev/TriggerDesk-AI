import mongoose, { Schema } from 'mongoose';
import type { IUser } from '../../@types/models/user';

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      maxlength: 100,
    },
    externalUserId: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: ['user', 'support', 'admin'],
      default: 'user',
    },
    email: {
      type: String,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    bannedAt: {
      type: Date,
      default: null,
    },
    bannedUntil: {
      type: Date,
      default: null,
    },
    banReason: {
      type: String,
      default: null,
    },
    imageUploadWarnings: {
      type: Number,
      default: 0,
    },
    lastImageWarningAt: {
      type: Date,
      default: null,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
