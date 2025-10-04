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
    isOnline: {
      type: Boolean,
      default: false,
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

UserSchema.index({ externalUserId: 1 });

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
