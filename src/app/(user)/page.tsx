import React from 'react';
import { connectDB } from '@/lib/mongodb';
import ScheduleModel from '@/models/Schedule';
import { serializeSchedule } from '@/lib/serializers';
import HomeClient from '@/components/HomeClient';
import { Schedule } from '@/types';

export const dynamic = 'force-dynamic';

async function fetchInitialSchedules(): Promise<Schedule[]> {
  await connectDB();
  const docs = await ScheduleModel.find()
    .sort({ travelDate: 1, departureTime: 1 })
    .lean();
  return docs.map(serializeSchedule);
}

export default async function HomePage() {
  let initialSchedules: Schedule[] = [];

  try {
    initialSchedules = await Promise.race([
      fetchInitialSchedules(),
      new Promise<Schedule[]>((resolve) => {
        setTimeout(() => resolve([]), 3000);
      }),
    ]);
  } catch (error) {
    console.error('HomePage initial schedules fetch error:', error);
  }

  return <HomeClient initialSchedules={initialSchedules} />;
}
