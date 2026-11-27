import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireAdmin } from '@/lib/auth-guard';
import BookingModel from '@/models/Booking';
import { serializeBooking } from '@/lib/serializers';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    const q = searchParams.get('q')?.trim();

    const query: Record<string, unknown> = {};
    if (status === 'confirmed' || status === 'cancelled') {
      query.status = status;
    }
    if (q) {
      const regex = new RegExp(
        q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );
      query.$or = [
        { bookingRef: regex },
        { userName: regex },
        { userEmail: regex },
        { origin: regex },
        { destination: regex },
      ];
    }

    const bookings = await BookingModel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      bookings: bookings.map(serializeBooking),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
