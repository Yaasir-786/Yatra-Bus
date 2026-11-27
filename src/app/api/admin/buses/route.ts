import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireAdmin } from '@/lib/auth-guard';
import BusModel from '@/models/Bus';
import ScheduleModel from '@/models/Schedule';
import { serializeBus, serializeSchedule } from '@/lib/serializers';
import { BusType, DAYS_OF_WEEK, DayOfWeek } from '@/types';

function calculateTripDuration(
  departureTime: string,
  arrivalTime: string
): string {
  const [depH, depM] = departureTime.split(':').map(Number);
  const [arrH, arrM] = arrivalTime.split(':').map(Number);
  if (
    Number.isNaN(depH) ||
    Number.isNaN(depM) ||
    Number.isNaN(arrH) ||
    Number.isNaN(arrM)
  ) {
    return '4h 00m';
  }
  const startMins = depH * 60 + depM;
  let endMins = arrH * 60 + arrM;
  if (endMins <= startMins) {
    endMins += 24 * 60;
  }
  const diff = endMins - startMins;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

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
      operatingDays?: string[];
      createReturn?: boolean;
      returnDate?: string;
      returnDepartureTime?: string;
      returnArrivalTime?: string;
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
    const duration =
      body.duration?.trim() ||
      calculateTripDuration(departureTime, arrivalTime);
    const fare = Number(body.fare ?? 0);

    const parsedDays = Array.isArray(body.operatingDays)
      ? body.operatingDays.filter((d): d is DayOfWeek =>
          (DAYS_OF_WEEK as readonly string[]).includes(d)
        )
      : [];
    const operatingDays: DayOfWeek[] =
      parsedDays.length > 0 ? parsedDays : [...DAYS_OF_WEEK];

    if (
      !busName ||
      !busNumber ||
      !origin ||
      !destination ||
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
      operatingDays,
    });

    let returnSchedule = null;
    if (body.createReturn) {
      const rDate = body.returnDate?.trim() ?? '';
      const rDep = body.returnDepartureTime?.trim() || departureTime;
      const rArr = body.returnArrivalTime?.trim() || arrivalTime;
      const rDuration = calculateTripDuration(rDep, rArr);

      returnSchedule = await ScheduleModel.create({
        busId: bus._id,
        busName: bus.busName,
        busNumber: bus.busNumber,
        busType: bus.busType,
        totalSeats: bus.totalSeats,
        origin: destination,
        destination: origin,
        travelDate: rDate,
        departureTime: rDep,
        arrivalTime: rArr,
        duration: rDuration,
        fare,
        bookedSeats: [],
        operatingDays,
      });
    }

    return NextResponse.json(
      {
        bus: serializeBus(bus),
        schedule: serializeSchedule(schedule),
        returnSchedule: returnSchedule ? serializeSchedule(returnSchedule) : null,
        createdReturn: !!returnSchedule,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
