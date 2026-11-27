import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireAdmin } from '@/lib/auth-guard';
import ScheduleModel from '@/models/Schedule';
import BookingModel from '@/models/Booking';
import UserModel from '@/models/User';

export async function POST() {
  try {
    await requireAdmin();
    await connectDB();

    const [schedules, bookings, users] = await Promise.all([
      ScheduleModel.find().lean(),
      BookingModel.find().lean(),
      UserModel.find().lean(),
    ]);

    const routeStats = schedules.map((s) => {
      const bookedCount = s.bookedSeats?.length ?? 0;
      const occupancyPct = Math.round(
        (bookedCount / Math.max(s.totalSeats, 1)) * 100
      );
      return {
        route: `${s.origin} -> ${s.destination}`,
        busName: s.busName,
        busType: s.busType,
        travelDate: s.travelDate,
        fare: s.fare,
        occupancyPct,
        bookedCount,
        totalSeats: s.totalSeats,
      };
    });

    const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
    const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');
    const totalRevenue = confirmedBookings.reduce(
      (sum, b) => sum + b.totalAmount,
      0
    );

    const cancellationsByUser = new Map<
      string,
      { name: string; email: string; cancelled: number; total: number }
    >();
    for (const b of bookings) {
      const key = b.userId.toString();
      const entry = cancellationsByUser.get(key) ?? {
        name: b.userName,
        email: b.userEmail,
        cancelled: 0,
        total: 0,
      };
      entry.total += 1;
      if (b.status === 'cancelled') entry.cancelled += 1;
      cancellationsByUser.set(key, entry);
    }

    const highCancellationUsers = Array.from(cancellationsByUser.values())
      .filter((u) => u.cancelled > 0)
      .sort((a, b) => b.cancelled - a.cancelled)
      .slice(0, 5);

    const summarySnapshot = {
      totalUsers: users.length,
      blockedUsers: users.filter((u) => u.status === 'blocked').length,
      totalSchedules: schedules.length,
      confirmedBookings: confirmedBookings.length,
      cancelledBookings: cancelledBookings.length,
      totalRevenueINR: totalRevenue,
      routeStats,
      highCancellationUsers,
    };

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'GOOGLE_GENERATIVE_AI_API_KEY is not configured in environment variables.',
          metrics: summarySnapshot,
        },
        { status: 503 }
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: `You are an operations analyst for YatraBus. Given the live MongoDB metrics below, provide a concise, actionable 4-bullet executive summary covering:
1. Top performing / highest occupancy routes and capacity recommendations
2. Revenue & cancellation rate observations
3. User risk / high-cancellation monitoring
4. Pricing or schedule optimization tip

Keep it crisp and data-backed using ₹ for currency.

Live MongoDB Data:
${JSON.stringify(summarySnapshot, null, 2)}`,
    });

    return NextResponse.json({
      insights: text,
      metrics: summarySnapshot,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
