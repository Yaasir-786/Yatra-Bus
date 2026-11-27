import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireActiveUser } from '@/lib/auth-guard';
import BookingModel from '@/models/Booking';
import { serializeBooking } from '@/lib/serializers';

export async function GET() {
  try {
    const user = await requireActiveUser();
    await connectDB();

    const bookings = await BookingModel.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      bookings: bookings.map(serializeBooking),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
