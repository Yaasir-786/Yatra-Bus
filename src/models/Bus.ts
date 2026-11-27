import mongoose, { Document, Model, Schema } from 'mongoose';
import { BusType } from '@/types';

export interface IBus extends Document {
  busName: string;
  busNumber: string;
  busType: BusType;
  totalSeats: number;
  amenities: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BusSchema = new Schema<IBus>(
  {
    busName: { type: String, required: true, trim: true },
    busNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    busType: {
      type: String,
      enum: ['AC', 'Non-AC', 'Sleeper'],
      required: true,
    },
    totalSeats: { type: Number, required: true, min: 12, max: 60 },
    amenities: { type: [String], default: [] },
  },
  { timestamps: true }
);

const BusModel: Model<IBus> =
  mongoose.models.Bus || mongoose.model<IBus>('Bus', BusSchema);

export default BusModel;
