'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, UserX } from 'lucide-react';
import { useAppState } from '@/context/AppStateContext';

export default function BlockedPage() {
  const { currentUser, lastBlockedUser, logoutUser } = useAppState();

  const affectedUser =
    currentUser?.status === 'blocked' ? currentUser : lastBlockedUser;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
          <UserX className="h-3.5 w-3.5" />
          Account Suspended
        </span>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Access Restricted
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Your account has been blocked by an administrator in MongoDB. While
          suspended, booking tickets and accessing protected services are
          disabled.
        </p>

        {affectedUser && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Affected Account
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">
                  {affectedUser.name}
                </div>
                <div className="text-xs text-slate-500">
                  {affectedUser.email}
                </div>
              </div>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                Blocked
              </span>
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void logoutUser()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Login
          </button>

          <Link
            href="/"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Browse Schedules
          </Link>
        </div>
      </div>
    </div>
  );
}
