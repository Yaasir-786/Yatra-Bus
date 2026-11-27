import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import UserModel from '@/models/User';
import {
  attachAuthCookie,
  handleApiError,
  signAuthToken,
} from '@/lib/auth-guard';
import { serializeUser } from '@/lib/serializers';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    const name = body.name?.trim() ?? '';
    const email = body.email?.trim().toLowerCase() ?? '';
    const phone = body.phone?.trim() ?? '';
    const password = body.password ?? '';

    if (!name || !email || !phone || password.length < 6) {
      return NextResponse.json(
        {
          error:
            'Name, email, phone, and a password of at least 6 characters are required.',
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await UserModel.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'user',
      status: 'active',
    });

    const token = await signAuthToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const response = NextResponse.json(
      { user: serializeUser(user) },
      { status: 201 }
    );
    attachAuthCookie(response, token);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
