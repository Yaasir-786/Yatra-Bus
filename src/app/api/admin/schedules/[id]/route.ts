import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireAdmin } from '@/lib/auth-guard';
import BookingModel from '@/models/Booking';
import ScheduleModel from '@/models/Schedule';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID.' },
        { status: 400 }
      );
    }

    await connectDB();

    const schedule = await ScheduleModel.findById(id);
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found.' },
        { status: 404 }
      );
    }

    const force = new URL(request.url).searchParams.get('force') === 'true';
    const confirmedCount = await BookingModel.countDocuments({
      scheduleId: id,
      status: 'confirmed',
    });

    if (confirmedCount > 0 && !force) {
      return NextResponse.json(
        {
          error: `Cancel the ${confirmedCount} confirmed booking${
            confirmedCount === 1 ? '' : 's'
          } first.`,
        },
        { status: 409 }
      );
    }

    if (confirmedCount > 0 && force) {
      await BookingModel.updateMany(
        { scheduleId: id, status: 'confirmed' },
        { $set: { status: 'cancelled' } }
      );
    }

    await ScheduleModel.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      id,
      cancelledBookings: force ? confirmedCount : 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
