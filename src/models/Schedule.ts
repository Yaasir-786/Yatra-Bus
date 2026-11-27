import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { BusType, DAYS_OF_WEEK, DayOfWeek } from '@/types';

export interface ISchedule extends Document {
  busId: Types.ObjectId;
  busName: string;
  busNumber: string;
  busType: BusType;
  origin: string;
  destination: string;
  travelDate?: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  fare: number;
  totalSeats: number;
  bookedSeats: string[];
  operatingDays: DayOfWeek[];
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleSchema = new Schema<ISchedule>(
  {
    busId: { type: Schema.Types.ObjectId, ref: 'Bus', required: true },
    busName: { type: String, required: true, trim: true },
    busNumber: { type: String, required: true, uppercase: true, trim: true },
    busType: {
      type: String,
      enum: ['AC', 'Non-AC', 'Sleeper'],
      required: true,
    },
    origin: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    travelDate: { type: String, default: '', trim: true },
    departureTime: { type: String, required: true, trim: true },
    arrivalTime: { type: String, required: true, trim: true },
    duration: { type: String, default: '4h 00m', trim: true },
    fare: { type: Number, required: true, min: 0 },
    totalSeats: { type: Number, required: true, min: 12, max: 60 },
    bookedSeats: { type: [String], default: [] },
    operatingDays: {
      type: [String],
      enum: DAYS_OF_WEEK,
      default: [...DAYS_OF_WEEK],
    },
  },
  { timestamps: true }
);

ScheduleSchema.index({ origin: 1, destination: 1, travelDate: 1 });

const ScheduleModel: Model<ISchedule> =
  mongoose.models.Schedule ||
  mongoose.model<ISchedule>('Schedule', ScheduleSchema);

export default ScheduleModel;
