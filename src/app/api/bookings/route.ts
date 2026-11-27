import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireActiveUser } from '@/lib/auth-guard';
import ScheduleModel from '@/models/Schedule';
import BookingModel from '@/models/Booking';
import { serializeBooking } from '@/lib/serializers';
import { Passenger } from '@/types';

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

    for (const p of passengers) {
      if (!p.name?.trim() || !p.seatNumber?.trim() || !p.age || p.age < 1) {
        return NextResponse.json(
          { error: 'All passengers require valid name, age, and seat number.' },
          { status: 400 }
        );
      }
    }

    const seatNumbers = passengers.map((p) => p.seatNumber.trim());

    await connectDB();

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
      const exists = await ScheduleModel.exists({ _id: scheduleId });
      if (!exists) {
        return NextResponse.json(
          { error: 'Schedule not found.' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          error:
            'One or more selected seats were just booked by another user.',
        },
        { status: 409 }
      );
    }

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
      travelDate:
        updatedSchedule.travelDate || new Date().toISOString().slice(0, 10),
      departureTime: updatedSchedule.departureTime,
      arrivalTime: updatedSchedule.arrivalTime,
      passengers: passengers.map((p) => ({
        name: p.name.trim(),
        age: Number(p.age),
        gender: p.gender,
        seatNumber: p.seatNumber.trim(),
      })),
      totalAmount,
      status: 'confirmed',
    });

    return NextResponse.json(
      { booking: serializeBooking(booking) },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
