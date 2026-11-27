import { NextRequest, NextResponse } from 'next/server';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { getOptionalUser } from '@/lib/auth-guard';
import ScheduleModel from '@/models/Schedule';
import BookingModel from '@/models/Booking';

const COLUMNS = ['A', 'B', 'C', 'D'] as const;

function buildAllSeatLabels(totalSeats: number): string[] {
  const labels: string[] = [];
  const rows = Math.ceil(totalSeats / 4);
  for (let r = 1; r <= rows; r++) {
    for (let c = 0; c < 4; c++) {
      const idx = (r - 1) * 4 + c;
      if (idx < totalSeats) {
        labels.push(`${r}${COLUMNS[c]}`);
      }
    }
  }
  return labels;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'GOOGLE_GENERATIVE_AI_API_KEY is not configured in environment variables.',
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { messages?: UIMessage[] };
    const uiMessages = Array.isArray(body.messages) ? body.messages : [];

    await connectDB();
    const currentUser = await getOptionalUser();

    if (currentUser?.status === 'blocked') {
      return NextResponse.json(
        { error: 'Account blocked', code: 'USER_BLOCKED' },
        { status: 403 }
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: `You are the YatraBus AI Trip Assistant for an Indian intercity bus booking platform.
Always use your tools to inspect live MongoDB data before answering questions about buses, schedules, fares, seat availability, or user bookings.
When recommending a schedule, always include the schedule ID and suggest clicking the booking link /book/<scheduleId>, along with fares in ₹, departure/arrival times, bus type, and available seat counts.
Be concise, friendly, and accurate.`,
      messages: await convertToModelMessages(uiMessages),
      stopWhen: stepCountIs(5),
      tools: {
        searchBusesTool: tool({
          description:
            'Search live bus schedules in MongoDB by origin city, destination city, travelDate (YYYY-MM-DD), busType (AC, Non-AC, Sleeper), or maxFare.',
          inputSchema: z.object({
            origin: z.string().optional(),
            destination: z.string().optional(),
            travelDate: z.string().optional(),
            busType: z.enum(['AC', 'Non-AC', 'Sleeper']).optional(),
            maxFare: z.number().optional(),
          }),
          execute: async ({
            origin,
            destination,
            travelDate,
            busType,
            maxFare,
          }) => {
            const query: Record<string, unknown> = {};
            if (origin) {
              query.origin = new RegExp(`^${origin.trim()}$`, 'i');
            }
            if (destination) {
              query.destination = new RegExp(`^${destination.trim()}$`, 'i');
            }
            if (travelDate) {
              query.travelDate = travelDate.trim();
            }
            if (busType) {
              query.busType = busType;
            }
            if (typeof maxFare === 'number' && maxFare > 0) {
              query.fare = { $lte: maxFare };
            }

            const docs = await ScheduleModel.find(query)
              .sort({ fare: 1, travelDate: 1 })
              .limit(10)
              .lean();

            return docs.map((s) => ({
              scheduleId: s._id.toString(),
              bookingPath: `/book/${s._id.toString()}`,
              busName: s.busName,
              busNumber: s.busNumber,
              busType: s.busType,
              origin: s.origin,
              destination: s.destination,
              travelDate: s.travelDate,
              departureTime: s.departureTime,
              arrivalTime: s.arrivalTime,
              duration: s.duration,
              fare: s.fare,
              totalSeats: s.totalSeats,
              availableSeatsCount: Math.max(
                s.totalSeats - (s.bookedSeats?.length ?? 0),
                0
              ),
            }));
          },
        }),
        checkSeatAvailabilityTool: tool({
          description:
            'Inspect live available and booked seats (including window A/D vs aisle B/C seats) for a specific scheduleId.',
          inputSchema: z.object({
            scheduleId: z.string(),
          }),
          execute: async ({ scheduleId }) => {
            if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
              return { error: 'Invalid scheduleId format.' };
            }
            const schedule = await ScheduleModel.findById(scheduleId).lean();
            if (!schedule) {
              return { error: 'Schedule not found.' };
            }

            const allSeats = buildAllSeatLabels(schedule.totalSeats);
            const bookedSet = new Set(schedule.bookedSeats ?? []);
            const openSeats = allSeats.filter((seat) => !bookedSet.has(seat));
            const windowSeats = openSeats.filter(
              (seat) => seat.endsWith('A') || seat.endsWith('D')
            );
            const aisleSeats = openSeats.filter(
              (seat) => seat.endsWith('B') || seat.endsWith('C')
            );

            return {
              scheduleId: schedule._id.toString(),
              bookingPath: `/book/${schedule._id.toString()}`,
              route: `${schedule.origin} -> ${schedule.destination}`,
              busName: schedule.busName,
              travelDate: schedule.travelDate,
              departureTime: schedule.departureTime,
              fare: schedule.fare,
              totalSeats: schedule.totalSeats,
              bookedCount: bookedSet.size,
              openCount: openSeats.length,
              openWindowSeats: windowSeats,
              openAisleSeats: aisleSeats,
            };
          },
        }),
        getMyBookingsTool: tool({
          description:
            'Fetch the currently authenticated user bookings (upcoming confirmed and cancelled tickets) from MongoDB.',
          inputSchema: z.object({}),
          execute: async () => {
            if (!currentUser) {
              return {
                authenticated: false,
                message: 'User is not logged in. Ask them to sign in at /login.',
              };
            }

            const bookings = await BookingModel.find({
              userId: currentUser._id,
            })
              .sort({ createdAt: -1 })
              .limit(10)
              .lean();

            return {
              authenticated: true,
              userName: currentUser.name,
              bookings: bookings.map((b) => ({
                bookingRef: b.bookingRef,
                route: `${b.origin} -> ${b.destination}`,
                travelDate: b.travelDate,
                departureTime: b.departureTime,
                busName: b.busName,
                seats: b.passengers.map((p) => p.seatNumber),
                totalAmount: b.totalAmount,
                status: b.status,
              })),
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('AI Chat error:', error);
    const message =
      error instanceof Error ? error.message : 'AI assistant error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
