import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ScheduleModel from '@/models/Schedule';
import BusModel from '@/models/Bus';
import { handleApiError } from '@/lib/auth-guard';
import { serializeBus, serializeSchedule } from '@/lib/serializers';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin')?.trim();
    const destination = searchParams.get('destination')?.trim();
    const travelDate = searchParams.get('travelDate')?.trim();
    const busType = searchParams.get('busType')?.trim();
    const maxFareParam = searchParams.get('maxFare')?.trim();

    const query: Record<string, unknown> = {};
    if (origin) {
      query.origin = new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    }
    if (destination) {
      query.destination = new RegExp(
        `^${destination.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        'i'
      );
    }
    if (travelDate) {
      query.travelDate = travelDate;
    }
    if (busType && ['AC', 'Non-AC', 'Sleeper'].includes(busType)) {
      query.busType = busType;
    }
    if (maxFareParam) {
      const maxFare = Number(maxFareParam);
      if (!Number.isNaN(maxFare) && maxFare > 0) {
        query.fare = { $lte: maxFare };
      }
    }

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
