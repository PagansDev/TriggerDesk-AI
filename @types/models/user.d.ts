import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  externalUserId: string;
  role: 'user' | 'support' | 'admin';
  email?: string;
  isOnline: boolean;
  isBanned: boolean;
  bannedAt?: Date;
  bannedUntil?: Date;
  banReason?: string;
  imageUploadWarnings?: number;
  lastImageWarningAt?: Date;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInput {
  username: string;
  externalUserId: string;
  isBanned?: boolean;
  bannedAt?: Date;
  bannedUntil?: Date;
  isOnline?: boolean;
  lastSeen?: Date;
}
