import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireActiveUser } from '@/lib/auth-guard';
import { buildAllSeatLabels } from '@/lib/seats';
import { isScheduleInPastIST } from '@/lib/date-ist';
import ScheduleModel from '@/models/Schedule';
import BookingModel from '@/models/Booking';
import { serializeBooking } from '@/lib/serializers';
import { Passenger, PassengerGender } from '@/types';

const VALID_GENDERS: readonly PassengerGender[] = ['Male', 'Female', 'Other'];
const MAX_SEATS_PER_BOOKING = 6;

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser();
    const body = (await request.json()) as {
      scheduleId?: string;
      passengers?: Passenger[];
    };

    const scheduleId = body.scheduleId?.trim() ?? '';
    const passengers = Array.isArray(body.passengers) ? body.passengers : [];

    if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID.' },
        { status: 400 }
      );
    }

    if (passengers.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one seat.' },
        { status: 400 }
      );
    }

    if (passengers.length > MAX_SEATS_PER_BOOKING) {
      return NextResponse.json(
        { error: `You can book at most ${MAX_SEATS_PER_BOOKING} seats per booking.` },
        { status: 400 }
      );
    }

    const seatNumbers: string[] = [];
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      const name = typeof p.name === 'string' ? p.name.trim() : '';
      const seatNumber =
        typeof p.seatNumber === 'string' ? p.seatNumber.trim().toUpperCase() : '';
      const age = Number(p.age);

      if (!name) {
        return NextResponse.json(
          { error: `Passenger ${i + 1} requires a non-empty name.` },
          { status: 400 }
        );
      }
      if (!Number.isInteger(age) || age < 1 || age > 120) {
        return NextResponse.json(
          { error: `Passenger ${i + 1} age must be an integer between 1 and 120.` },
          { status: 400 }
        );
      }
      if (!VALID_GENDERS.includes(p.gender)) {
        return NextResponse.json(
          { error: `Passenger ${i + 1} gender must be Male, Female, or Other.` },
          { status: 400 }
        );
      }
      if (!seatNumber) {
        return NextResponse.json(
          { error: `Passenger ${i + 1} requires a valid seat number.` },
          { status: 400 }
        );
      }
      seatNumbers.push(seatNumber);
    }

    if (new Set(seatNumbers).size !== seatNumbers.length) {
      return NextResponse.json(
        { error: 'Duplicate seat numbers are not allowed in the same booking.' },
        { status: 400 }
      );
    }

    await connectDB();

    const schedule = await ScheduleModel.findById(scheduleId).lean();
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found.' },
        { status: 404 }
      );
    }

    if (isScheduleInPastIST(schedule.travelDate, schedule.departureTime)) {
      return NextResponse.json(
        { error: 'Cannot book a trip whose departure time has already passed.' },
        { status: 400 }
      );
    }

    const validSeats = new Set(buildAllSeatLabels(schedule.totalSeats));
    const invalidSeats = seatNumbers.filter((s) => !validSeats.has(s));
    if (invalidSeats.length > 0) {
      return NextResponse.json(
        { error: `Invalid seat number(s): ${invalidSeats.join(', ')}.` },
        { status: 400 }
      );
    }

    // Atomic seat lock: only succeeds if NONE of the requested seats are in bookedSeats
    const updatedSchedule = await ScheduleModel.findOneAndUpdate(
      {
        _id: scheduleId,
        bookedSeats: { $nin: seatNumbers },
      },
      {
        $push: { bookedSeats: { $each: seatNumbers } },
      },
      { new: true }
    );

    if (!updatedSchedule) {
      return NextResponse.json(
        {
          error:
            'One or more selected seats were just booked by another user.',
        },
        { status: 409 }
      );
    }

    try {
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const bookingRef = `YTB-${new Date().getFullYear()}-${randomDigits}-${Date.now()
        .toString()
        .slice(-3)}`;

      const totalAmount = passengers.length * updatedSchedule.fare;

      const booking = await BookingModel.create({
        bookingRef,
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        scheduleId: updatedSchedule._id,
        busName: updatedSchedule.busName,
        busNumber: updatedSchedule.busNumber,
        origin: updatedSchedule.origin,
        destination: updatedSchedule.destination,
        travelDate: updatedSchedule.travelDate ?? '',
        departureTime: updatedSchedule.departureTime,
        arrivalTime: updatedSchedule.arrivalTime,
        passengers: passengers.map((p, idx) => ({
          name: p.name.trim(),
          age: Number(p.age),
          gender: p.gender,
          seatNumber: seatNumbers[idx],
        })),
        totalAmount,
        status: 'confirmed',
      });

      return NextResponse.json(
        { booking: serializeBooking(booking) },
        { status: 201 }
      );
    } catch (bookingError) {
      // Compensating rollback: release the seats we just locked
      await ScheduleModel.findByIdAndUpdate(scheduleId, {
        $pull: { bookedSeats: { $in: seatNumbers } },
      }).catch((rollbackErr) => {
        console.error('Seat rollback failed:', rollbackErr);
      });
      throw bookingError;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
