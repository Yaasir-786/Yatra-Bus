import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import UserModel from '@/models/User';
import {
  attachAuthCookie,
  clearAuthCookie,
  handleApiError,
  signAuthToken,
} from '@/lib/auth-guard';
import { serializeUser } from '@/lib/serializers';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await UserModel.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (user.status === 'blocked') {
      const blockedResponse = NextResponse.json(
        {
          code: 'USER_BLOCKED',
          message: 'Your account has been blocked by admin.',
          error: 'Your account has been blocked by admin.',
          user: serializeUser(user),
        },
        { status: 403 }
      );
      clearAuthCookie(blockedResponse);
      return blockedResponse;
    }

    const token = await signAuthToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const response = NextResponse.json({ user: serializeUser(user) });
    attachAuthCookie(response, token);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
