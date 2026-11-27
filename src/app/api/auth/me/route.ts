import { NextResponse } from 'next/server';
import {
  clearAuthCookie,
  getOptionalUser,
  handleApiError,
} from '@/lib/auth-guard';
import { serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getOptionalUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    if (user.status === 'blocked') {
      const response = NextResponse.json(
        {
          code: 'USER_BLOCKED',
          error: 'Your account has been blocked by admin.',
          user: serializeUser(user),
        },
        { status: 403 }
      );
      clearAuthCookie(response);
      return response;
    }

    return NextResponse.json({ user: serializeUser(user) });
  } catch (error) {
    return handleApiError(error);
  }
}
