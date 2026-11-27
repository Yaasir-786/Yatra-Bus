'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import TicketModal from '@/components/TicketModal';
import { useAppState } from '@/context/AppStateContext';
import { parseApiResponse } from '@/lib/client-api';
import { Booking } from '@/types';

export default function AdminBookingsPage() {
  const { cancelBooking } = useAppState();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'confirmed' | 'cancelled'
  >('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/admin/bookings?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const { ok, data } = await parseApiResponse<{ bookings: Booking[] }>(res);
      if (!ok) {
        setError(data.error ?? 'Failed to load bookings.');
        return;
      }
      setBookings(data.bookings ?? []);
    } catch {
      setError('Network error while loading bookings.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    setError(null);
    const result = await cancelBooking(bookingId);
    setCancellingId(null);

    if (!result.success) {
      setError(result.error ?? 'Could not cancel booking.');
      return;
    }

    if (result.booking) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? result.booking! : b))
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          All Bookings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Inspect MongoDB tickets across all passengers, view E-Tickets, or
          cancel bookings to free seats
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Status Filter */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by booking ref, user, or city..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(['all', 'confirmed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            Loading bookings...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Booking Ref</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Route & Date</th>
                  <th className="px-6 py-3.5">Seats</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((booking) => {
                  const isConfirmed = booking.status === 'confirmed';
                  const isCancelling = cancellingId === booking.id;

                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {booking.bookingRef}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">
                          {booking.userName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {booking.userEmail}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">
                          {booking.origin} → {booking.destination}
                        </div>
                        <div className="text-xs text-slate-400">
                          {booking.travelDate} • {booking.departureTime}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-indigo-700">
                        {booking.passengers.map((p) => p.seatNumber).join(', ')}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        ₹{booking.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isConfirmed
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isConfirmed ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {isConfirmed ? 'Confirmed' : 'Cancelled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(booking)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ticket
                          </button>
                          {isConfirmed && (
                            <button
                              type="button"
                              disabled={isCancelling}
                              onClick={() => void handleCancel(booking.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                            >
                              {isCancelling ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                              Cancel Ticket
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {bookings.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TicketModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
