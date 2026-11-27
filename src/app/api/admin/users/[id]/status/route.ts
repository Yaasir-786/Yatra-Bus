import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { handleApiError, requireAdmin } from '@/lib/auth-guard';
import UserModel from '@/models/User';
import { serializeUser } from '@/lib/serializers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID.' }, { status: 400 });
    }

    await connectDB();
    const user = await UserModel.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (user._id.toString() === admin._id.toString() || user.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin accounts cannot be blocked.' },
        { status: 400 }
      );
    }

    let explicitStatus: 'active' | 'blocked' | undefined;
    try {
      const body = (await request.json()) as { status?: 'active' | 'blocked' };
      if (body.status === 'active' || body.status === 'blocked') {
        explicitStatus = body.status;
      }
    } catch {
      // Optional body — toggle if omitted
    }

    user.status =
      explicitStatus ?? (user.status === 'active' ? 'blocked' : 'active');
    await user.save();

    return NextResponse.json({ user: serializeUser(user) });
  } catch (error) {
    return handleApiError(error);
  }
}
