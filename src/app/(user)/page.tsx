import React from 'react';
import { connectDB } from '@/lib/mongodb';
import ScheduleModel from '@/models/Schedule';
import { serializeSchedule } from '@/lib/serializers';
import HomeClient from '@/components/HomeClient';
import { Schedule } from '@/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let initialSchedules: Schedule[] = [];

  try {
    await connectDB();
    const docs = await ScheduleModel.find()
      .sort({ travelDate: 1, departureTime: 1 })
      .lean();
    initialSchedules = docs.map(serializeSchedule);
  } catch (error) {
    console.error('HomePage initial schedules fetch error:', error);
  }

  return <HomeClient initialSchedules={initialSchedules} />;
}
