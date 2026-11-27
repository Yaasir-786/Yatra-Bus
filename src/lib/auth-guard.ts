import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { SignJWT, jwtVerify } from 'jose';
import { connectDB } from '@/lib/mongodb';
import UserModel, { IUser } from '@/models/User';

export const AUTH_COOKIE_NAME = 'yatrabus_token';

export class AuthError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let warnedMissingJwtSecret = false;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET environment variable must be set and at least 32 characters in production.'
      );
    }
    return new TextEncoder().encode(secret);
  }

  if (!secret || secret.length < 32) {
    if (!warnedMissingJwtSecret) {
      console.warn(
        '[auth-guard] JWT_SECRET is missing or shorter than 32 characters; using insecure development fallback.'
      );
      warnedMissingJwtSecret = true;
    }
    return new TextEncoder().encode(
      secret || 'yatrabus-dev-jwt-secret-key-change-in-production-2026'
    );
  }

  return new TextEncoder().encode(secret);
}

export async function signAuthToken(payload: {
  userId: string;
  role: 'user' | 'admin';
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyAuthToken(
  token: string
): Promise<{ userId: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.userId !== 'string') return null;
    return {
      userId: payload.userId,
      role: typeof payload.role === 'string' ? payload.role : 'user',
    };
  } catch {
    return null;
  }
}

export function attachAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function getOptionalUser(): Promise<IUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const verified = await verifyAuthToken(token);
  if (!verified) return null;

  await connectDB();
  const user = await UserModel.findById(verified.userId);
  return user;
}

export async function requireActiveUser(): Promise<IUser> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    throw new AuthError(401, 'UNAUTHENTICATED', 'Authentication required.');
  }

  const verified = await verifyAuthToken(token);
  if (!verified) {
    throw new AuthError(401, 'UNAUTHENTICATED', 'Invalid or expired session.');
  }

  await connectDB();
  const user = await UserModel.findById(verified.userId);
  if (!user) {
    throw new AuthError(401, 'UNAUTHENTICATED', 'User account not found.');
  }

  if (user.status === 'blocked') {
    throw new AuthError(
      403,
      'USER_BLOCKED',
      'Your account has been blocked by admin.'
    );
  }

  return user;
}

export async function requireAdmin(): Promise<IUser> {
  const user = await requireActiveUser();
  if (user.role !== 'admin') {
    throw new AuthError(403, 'FORBIDDEN', 'Admin access required.');
  }
  return user;
}

function isDuplicateKeyError(
  error: unknown
): error is { code: number; keyPattern?: Record<string, unknown> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors)
      .map((e) => e.message)
      .filter(Boolean)
      .join('; ');
    return NextResponse.json(
      { error: details || 'Invalid request data.' },
      { status: 400 }
    );
  }

  if (error instanceof mongoose.Error.CastError) {
    return NextResponse.json(
      { error: `Invalid ${error.path || 'identifier'} format.` },
      { status: 400 }
    );
  }

  if (isDuplicateKeyError(error)) {
    const fields = error.keyPattern ? Object.keys(error.keyPattern) : [];
    const fieldLabel = fields.length > 0 ? fields.join(', ') : 'value';
    return NextResponse.json(
      { error: `A record with this ${fieldLabel} already exists.` },
      { status: 409 }
    );
  }

  console.error('API Error:', error);
  const message =
    process.env.NODE_ENV !== 'production' && error instanceof Error
      ? error.message
      : 'Internal server error. Please try again later.';
  return NextResponse.json({ error: message }, { status: 500 });
}
