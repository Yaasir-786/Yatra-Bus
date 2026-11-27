import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireAdmin } from '@/lib/auth-guard';
import UserModel from '@/models/User';
import BookingModel from '@/models/Booking';
import { serializeUser } from '@/lib/serializers';

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const [users, bookingCounts] = await Promise.all([
      UserModel.find().sort({ createdAt: -1 }).lean(),
      BookingModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: { $toString: '$userId' }, count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(bookingCounts.map((b) => [b._id, b.count]));

    return NextResponse.json({
      users: users.map((u) =>
        serializeUser(u, countMap.get(u._id.toString()) ?? 0)
      ),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
