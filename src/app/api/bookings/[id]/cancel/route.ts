import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireActiveUser } from '@/lib/auth-guard';
import BookingModel from '@/models/Booking';
import ScheduleModel from '@/models/Schedule';
import { serializeBooking } from '@/lib/serializers';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireActiveUser();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid booking ID.' },
        { status: 400 }
      );
    }

    await connectDB();
    const booking = await BookingModel.findById(id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found.' },
        { status: 404 }
      );
    }

    const isOwner = booking.userId.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to cancel this booking.' },
        { status: 403 }
      );
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ booking: serializeBooking(booking) });
    }

    booking.status = 'cancelled';
    await booking.save();

    const seatsToFree = booking.passengers.map((p) => p.seatNumber);
    if (seatsToFree.length > 0) {
      await ScheduleModel.findByIdAndUpdate(booking.scheduleId, {
        $pull: { bookedSeats: { $in: seatsToFree } },
      });
    }

    return NextResponse.json({ booking: serializeBooking(booking) });
  } catch (error) {
    return handleApiError(error);
  }
}
