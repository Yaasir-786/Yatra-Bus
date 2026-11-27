import { getNowIST, getWeekdayIST } from '@/lib/date-ist';
import { BusType } from '@/types';

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface ScheduleQueryParams {
  origin?: string;
  destination?: string;
  travelDate?: string;
  busType?: string;
  maxFare?: number;
}

export function buildScheduleQuery(
  params: ScheduleQueryParams
): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  const andConditions: Record<string, unknown>[] = [];

  const origin = params.origin?.trim();
  const destination = params.destination?.trim();
  const travelDate = params.travelDate?.trim();
  const busType = params.busType?.trim();
  const maxFare = params.maxFare;

  if (origin) {
    query.origin = new RegExp(`^${escapeRegex(origin)}$`, 'i');
  }
  if (destination) {
    query.destination = new RegExp(`^${escapeRegex(destination)}$`, 'i');
  }
  if (busType && (['AC', 'Non-AC', 'Sleeper'] as BusType[]).includes(busType as BusType)) {
    query.busType = busType;
  }
  if (typeof maxFare === 'number' && !Number.isNaN(maxFare) && maxFare > 0) {
    query.fare = { $lte: maxFare };
  }

  if (travelDate) {
    const weekday = getWeekdayIST(travelDate);
    andConditions.push({
      $or: [
        { travelDate },
        { travelDate: '' },
        { travelDate: { $exists: false } },
      ],
    });
    if (weekday) {
      andConditions.push({
        $or: [
          { operatingDays: weekday },
          { operatingDays: { $exists: false } },
          { operatingDays: { $size: 0 } },
        ],
      });
    }
  } else {
    // Hide dated schedules whose departure date+time in IST is already in the past;
    // keep legacy recurring docs (travelDate: '' or missing).
    const now = getNowIST();
    andConditions.push({
      $or: [
        { travelDate: '' },
        { travelDate: { $exists: false } },
        { travelDate: { $gt: now.date } },
        { travelDate: now.date, departureTime: { $gt: now.time } },
      ],
    });
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  return query;
}
