import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { BookingStatus, Passenger } from '@/types';

export interface IBooking extends Document {
  bookingRef: string;
  userId: Types.ObjectId;
  userName: string;
  userEmail: string;
  scheduleId: Types.ObjectId;
  busName: string;
  busNumber: string;
  origin: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  passengers: Passenger[];
  totalAmount: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PassengerSchema = new Schema<Passenger>(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 1, max: 120 },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    seatNumber: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const BookingSchema = new Schema<IBooking>(
  {
    bookingRef: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Schedule',
      required: true,
    },
    busName: { type: String, required: true, trim: true },
    busNumber: { type: String, required: true, trim: true },
    origin: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    travelDate: { type: String, required: true, trim: true },
    departureTime: { type: String, required: true, trim: true },
    arrivalTime: { type: String, default: '' },
    passengers: { type: [PassengerSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
);

BookingSchema.index({ userId: 1, createdAt: -1 });

const BookingModel: Model<IBooking> =
  mongoose.models.Booking ||
  mongoose.model<IBooking>('Booking', BookingSchema);

export default BookingModel;
