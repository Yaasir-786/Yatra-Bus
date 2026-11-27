import mongoose, { Document, Model, Schema } from 'mongoose';
import { UserRole, UserStatus } from '@/types';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  },
  { timestamps: true }
);

const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default UserModel;
