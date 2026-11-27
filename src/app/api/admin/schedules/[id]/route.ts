import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireAdmin } from '@/lib/auth-guard';
import ScheduleModel from '@/models/Schedule';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid schedule ID.' },
        { status: 400 }
      );
    }

    await connectDB();
    const deleted = await ScheduleModel.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Schedule not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return handleApiError(error);
  }
}
