'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Bus as BusIcon,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  LogIn,
  Ticket,
  XCircle,
} from 'lucide-react';
import TicketModal from '@/components/TicketModal';
import { useAppState } from '@/context/AppStateContext';
import { parseApiResponse } from '@/lib/client-api';
import { Booking } from '@/types';

function MyBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, authLoading, cancelBooking, handleBlockedResponse } =
    useAppState();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'confirmed' | 'cancelled'
  >('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const justBookedRef = searchParams.get('booked');

  const fetchMyBookings = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/bookings/my', {
        credentials: 'include',
        cache: 'no-store',
      });
      const { ok, status, data } = await parseApiResponse<{
        bookings: Booking[];
      }>(res);

      if (status === 403 && data.code === 'USER_BLOCKED') {
        handleBlockedResponse(currentUser);
        return;
      }

      if (!ok) {
        setError(data.error ?? 'Failed to fetch your bookings.');
        return;
      }

      setBookings(data.bookings ?? []);
    } catch {
      setError('Network error while loading bookings.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, handleBlockedResponse]);

  useEffect(() => {
    if (authLoading) return;
    if (currentUser?.status === 'blocked') {
      router.replace('/blocked');
      return;
    }
    if (currentUser) {
      void fetchMyBookings();
    } else {
      setLoading(false);
    }
  }, [authLoading, currentUser, router, fetchMyBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) =>
      statusFilter === 'all' ? true : b.status === statusFilter
    );
  }, [bookings, statusFilter]);

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    setError(null);
    const result = await cancelBooking(bookingId);
    setCancellingId(null);

    if (!result.success) {
      setError(result.error ?? 'Could not cancel ticket.');
      return;
    }

    if (result.booking) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? result.booking! : b))
      );
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        Checking session...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
          <Ticket className="mx-auto h-10 w-10 text-indigo-500" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">
            Sign in to view your bookings
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Access your confirmed E-Tickets, seat details, and cancellation
            options stored in MongoDB.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <LogIn className="h-4 w-4" />
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (currentUser.status === 'blocked') {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Bookings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage upcoming bus journeys and download E-Tickets for{' '}
            <span className="font-semibold text-slate-700">
              {currentUser.name}
            </span>
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
          {(['all', 'confirmed', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {justBookedRef && (
        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>
            Booking confirmed! Your reference is{' '}
            <strong className="font-bold">{justBookedRef}</strong>. Your seats
            are now saved in MongoDB.
          </span>
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          Loading your bookings...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Ticket className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            No bookings found
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Search available intercity buses to book your next trip.
          </p>
          <Link
            href="/buses"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Search Buses
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredBookings.map((booking) => {
            const isConfirmed = booking.status === 'confirmed';
            const isCancelling = cancellingId === booking.id;

            return (
              <div
                key={booking.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {booking.bookingRef}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isConfirmed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isConfirmed ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        {isConfirmed ? 'Confirmed' : 'Cancelled'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900">
                      <span>{booking.origin}</span>
                      <ArrowRight className="h-4 w-4 text-indigo-600" />
                      <span>{booking.destination}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <BusIcon className="h-3.5 w-3.5 text-slate-400" />
                        {booking.busName} ({booking.busNumber})
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {booking.travelDate}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {booking.departureTime}
                        {booking.arrivalTime ? ` - ${booking.arrivalTime}` : ''}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                      <span className="font-medium text-slate-500">Seats:</span>
                      {booking.passengers.map((p) => (
                        <span
                          key={p.seatNumber}
                          className="rounded-md bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700"
                        >
                          {p.seatNumber} ({p.name.split(' ')[0]})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                    <div className="sm:text-right">
                      <div className="text-xs text-slate-400">Total Fare</div>
                      <div className="text-xl font-extrabold text-slate-900">
                        ₹{booking.totalAmount.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View E-Ticket
                      </button>

                      {isConfirmed && (
                        <button
                          type="button"
                          disabled={isCancelling}
                          onClick={() => void handleCancel(booking.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
                        >
                          {isCancelling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {isCancelling ? 'Cancelling...' : 'Cancel Ticket'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TicketModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-slate-500">
          Loading your bookings...
        </div>
      }
    >
      <MyBookingsContent />
    </Suspense>
  );
}
