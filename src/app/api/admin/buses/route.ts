import { NextRequest, NextResponse } from 'next/server';
import { HydratedDocument } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireAdmin } from '@/lib/auth-guard';
import { addDaysIST, getTodayIST, getWeekdayIST } from '@/lib/date-ist';
import BusModel from '@/models/Bus';
import ScheduleModel, { ISchedule } from '@/models/Schedule';
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

async function insertSchedulesSkippingDuplicates(
  docs: Record<string, unknown>[]
): Promise<HydratedDocument<ISchedule>[]> {
  if (docs.length === 0) return [];
  try {
    return (await ScheduleModel.insertMany(docs, {
      ordered: false,
    })) as HydratedDocument<ISchedule>[];
  } catch (err: unknown) {
    // Mongoose/MongoDB ordered:false throws BulkWriteError on duplicate keys (code 11000)
    // while still inserting all non-duplicate docs.
    if (
      typeof err === 'object' &&
      err !== null &&
      'insertedDocs' in err &&
      Array.isArray((err as { insertedDocs?: unknown[] }).insertedDocs)
    ) {
      return (err as { insertedDocs: HydratedDocument<ISchedule>[] })
        .insertedDocs;
    }
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: unknown }).code === 11000
    ) {
      return [];
    }
    throw err;
  }
}

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const [buses, schedules] = await Promise.all([
      BusModel.find().sort({ createdAt: -1 }).lean(),
      ScheduleModel.find().sort({ travelDate: 1, departureTime: 1 }).lean(),
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
      departureTime?: string;
      arrivalTime?: string;
      duration?: string;
      fare?: number;
      operatingDays?: string[];
      startDate?: string;
      daysAhead?: number;
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

    const startDate = body.startDate?.trim() || getTodayIST();
    const rawDaysAhead = Number(body.daysAhead ?? 30);
    const daysAhead = Number.isFinite(rawDaysAhead)
      ? Math.min(Math.max(Math.trunc(rawDaysAhead), 1), 90)
      : 30;

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

    if (origin.toLowerCase() === destination.toLowerCase()) {
      return NextResponse.json(
        { error: 'Origin and destination cities must be different.' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(totalSeats) || totalSeats < 12 || totalSeats > 60) {
      return NextResponse.json(
        { error: 'Total seats must be between 12 and 60.' },
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

    const daySet = new Set<DayOfWeek>(operatingDays);
    const onwardDocs: Record<string, unknown>[] = [];
    for (let i = 0; i < daysAhead; i++) {
      const dateStr = addDaysIST(startDate, i);
      const weekday = getWeekdayIST(dateStr);
      if (weekday && daySet.has(weekday)) {
        onwardDocs.push({
          busId: bus._id,
          busName: bus.busName,
          busNumber: bus.busNumber,
          busType: bus.busType,
          totalSeats: bus.totalSeats,
          origin,
          destination,
          travelDate: dateStr,
          departureTime,
          arrivalTime,
          duration,
          fare,
          bookedSeats: [],
          operatingDays,
        });
      }
    }

    const insertedOnward = await insertSchedulesSkippingDuplicates(onwardDocs);

    let insertedReturn: Awaited<ReturnType<typeof insertSchedulesSkippingDuplicates>> = [];
    if (body.createReturn) {
      const rStart = body.returnDate?.trim() || startDate;
      const rDep = body.returnDepartureTime?.trim() || departureTime;
      const rArr = body.returnArrivalTime?.trim() || arrivalTime;
      const rDuration = calculateTripDuration(rDep, rArr);

      const returnDocs: Record<string, unknown>[] = [];
      for (let i = 0; i < daysAhead; i++) {
        const dateStr = addDaysIST(rStart, i);
        const weekday = getWeekdayIST(dateStr);
        if (weekday && daySet.has(weekday)) {
          returnDocs.push({
            busId: bus._id,
            busName: bus.busName,
            busNumber: bus.busNumber,
            busType: bus.busType,
            totalSeats: bus.totalSeats,
            origin: destination,
            destination: origin,
            travelDate: dateStr,
            departureTime: rDep,
            arrivalTime: rArr,
            duration: rDuration,
            fare,
            bookedSeats: [],
            operatingDays,
          });
        }
      }

      insertedReturn = await insertSchedulesSkippingDuplicates(returnDocs);
    }

    return NextResponse.json(
      {
        bus: serializeBus(bus),
        schedule: insertedOnward[0] ? serializeSchedule(insertedOnward[0]) : null,
        schedulesCount: insertedOnward.length,
        returnSchedulesCount: insertedReturn.length,
        totalCreated: insertedOnward.length + insertedReturn.length,
        createdReturn: insertedReturn.length > 0,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
