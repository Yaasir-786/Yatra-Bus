import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireAdmin } from '@/lib/auth-guard';
import UserModel from '@/models/User';
import ScheduleModel from '@/models/Schedule';
import BookingModel from '@/models/Booking';
import { serializeBooking } from '@/lib/serializers';

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const [
      totalUsers,
      blockedUsers,
      activeSchedules,
      revenueResult,
      recentBookings,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ status: 'blocked' }),
      ScheduleModel.countDocuments(),
      BookingModel.aggregate<{ total: number }>([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      BookingModel.find().sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    const totalRevenue = revenueResult[0]?.total ?? 0;

    return NextResponse.json({
      totalUsers,
      blockedUsers,
      activeSchedules,
      totalRevenue,
      recentBookings: recentBookings.map(serializeBooking),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
