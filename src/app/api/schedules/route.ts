import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ScheduleModel from '@/models/Schedule';
import BusModel from '@/models/Bus';
import { handleApiError } from '@/lib/auth-guard';
import { buildScheduleQuery } from '@/lib/schedule-query';
import { serializeBus, serializeSchedule } from '@/lib/serializers';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const maxFareParam = searchParams.get('maxFare')?.trim();
    const maxFare = maxFareParam ? Number(maxFareParam) : undefined;

    const query = buildScheduleQuery({
      origin: searchParams.get('origin') ?? undefined,
      destination: searchParams.get('destination') ?? undefined,
      travelDate: searchParams.get('travelDate') ?? undefined,
      busType: searchParams.get('busType') ?? undefined,
      maxFare,
    });

    const [scheduleDocs, busDocs] = await Promise.all([
      ScheduleModel.find(query).sort({ travelDate: 1, departureTime: 1 }).lean(),
      BusModel.find().lean(),
    ]);

    return NextResponse.json({
      schedules: scheduleDocs.map(serializeSchedule),
      buses: busDocs.map(serializeBus),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
