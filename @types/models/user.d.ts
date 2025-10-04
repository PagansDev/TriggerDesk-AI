import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  externalUserId: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInput {
  username: string;
  externalUserId: string;
  isOnline?: boolean;
  lastSeen?: Date;
}
