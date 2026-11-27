import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import ScheduleModel from '@/models/Schedule';
import BusModel from '@/models/Bus';
import { handleApiError } from '@/lib/auth-guard';
import { serializeBus, serializeSchedule } from '@/lib/serializers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID.' },
        { status: 400 }
      );
    }

    await connectDB();
    const schedule = await ScheduleModel.findById(id).lean();
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found.' },
        { status: 404 }
      );
    }

    const bus = await BusModel.findById(schedule.busId).lean();

    return NextResponse.json({
      schedule: serializeSchedule(schedule),
      bus: bus ? serializeBus(bus) : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
