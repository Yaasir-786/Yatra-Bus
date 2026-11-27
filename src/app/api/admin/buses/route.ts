import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireAdmin } from '@/lib/auth-guard';
import BusModel from '@/models/Bus';
import ScheduleModel from '@/models/Schedule';
import { serializeBus, serializeSchedule } from '@/lib/serializers';
import { BusType } from '@/types';

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const [buses, schedules] = await Promise.all([
      BusModel.find().sort({ createdAt: -1 }).lean(),
      ScheduleModel.find().sort({ createdAt: -1 }).lean(),
    ]);

    return NextResponse.json({
      buses: buses.map(serializeBus),
      schedules: schedules.map(serializeSchedule),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      busName?: string;
      busNumber?: string;
      busType?: BusType;
      totalSeats?: number;
      amenities?: string[];
      origin?: string;
      destination?: string;
      travelDate?: string;
      departureTime?: string;
      arrivalTime?: string;
      duration?: string;
      fare?: number;
    };

    const busName = body.busName?.trim() ?? '';
    const busNumber = body.busNumber?.trim().toUpperCase() ?? '';
    const busType: BusType = body.busType ?? 'AC';
    const totalSeats = Number(body.totalSeats ?? 32);
    const amenities = Array.isArray(body.amenities) ? body.amenities : [busType];
    const origin = body.origin?.trim() ?? '';
    const destination = body.destination?.trim() ?? '';
    const travelDate = body.travelDate?.trim() ?? '';
    const departureTime = body.departureTime?.trim() ?? '';
    const arrivalTime = body.arrivalTime?.trim() ?? '';
    const duration = body.duration?.trim() || '4h 00m';
    const fare = Number(body.fare ?? 0);

    if (
      !busName ||
      !busNumber ||
      !origin ||
      !destination ||
      !travelDate ||
      !departureTime ||
      !arrivalTime ||
      fare < 1
    ) {
      return NextResponse.json(
        { error: 'Please complete all required bus and schedule fields.' },
        { status: 400 }
      );
    }

    await connectDB();

    let bus = await BusModel.findOne({ busNumber });
    if (!bus) {
      bus = await BusModel.create({
        busName,
        busNumber,
        busType,
        totalSeats,
        amenities,
      });
    }

    const schedule = await ScheduleModel.create({
      busId: bus._id,
      busName: bus.busName,
      busNumber: bus.busNumber,
      busType: bus.busType,
      totalSeats: bus.totalSeats,
      origin,
      destination,
      travelDate,
      departureTime,
      arrivalTime,
      duration,
      fare,
      bookedSeats: [],
    });

    return NextResponse.json(
      {
        bus: serializeBus(bus),
        schedule: serializeSchedule(schedule),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
