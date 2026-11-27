'use client';

import React from 'react';
import {
  ArrowRight,
  Bus as BusIcon,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  Ticket,
  X,
  XCircle,
} from 'lucide-react';
import { Booking } from '@/types';

interface TicketModalProps {
  booking: Booking | null;
  onClose: () => void;
}

export default function TicketModal({ booking, onClose }: TicketModalProps) {
  if (!booking) return null;

  const isConfirmed = booking.status === 'confirmed';
  const unitFare = Math.round(
    booking.totalAmount / Math.max(booking.passengers.length, 1)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 text-white ${
            isConfirmed ? 'bg-indigo-600' : 'bg-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Ticket className="h-5 w-5" />
            <div>
              <h2 className="text-base font-bold">YatraBus E-Ticket</h2>
              <p className="text-xs text-white/80">Ref: {booking.bookingRef}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isConfirmed
                  ? 'bg-emerald-400/20 text-emerald-100'
                  : 'bg-rose-500/30 text-rose-100'
              }`}
            >
              {isConfirmed ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {isConfirmed ? 'Confirmed' : 'Cancelled'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-white/80 hover:bg-white/15 hover:text-white"
              aria-label="Close ticket modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="space-y-5 p-6">
          {/* Route & Schedule Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <span>{booking.origin}</span>
                <ArrowRight className="h-4 w-4 text-indigo-600" />
                <span>{booking.destination}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs ring-1 ring-slate-200">
                <BusIcon className="h-3.5 w-3.5 text-indigo-600" />
                {booking.busName}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{booking.travelDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {booking.departureTime}
                  {booking.arrivalTime ? ` - ${booking.arrivalTime}` : ''}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                Bus No:{' '}
                <span className="font-semibold text-slate-800">
                  {booking.busNumber}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Account:{' '}
              <span className="font-medium text-slate-700">
                {booking.userName} ({booking.userEmail})
              </span>
            </p>
          </div>

          {/* Passengers */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Passenger & Seat Details
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5">Passenger</th>
                    <th className="px-4 py-2.5">Age / Gender</th>
                    <th className="px-4 py-2.5 text-right">Seat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {booking.passengers.map((p) => (
                    <tr key={p.seatNumber}>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {p.name}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {p.age} yrs • {p.gender}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                          {p.seatNumber}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fare Breakdown */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>
                Base Fare (₹{unitFare} × {booking.passengers.length} seat
                {booking.passengers.length > 1 ? 's' : ''})
              </span>
              <span>₹{booking.totalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-slate-600">
              <span>Convenience Fee</span>
              <span className="text-emerald-600">Free</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2.5 text-base font-bold text-slate-900">
              <span>Total Paid</span>
              <span>₹{booking.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <span className="text-xs text-slate-500">
            Booked on {new Date(booking.bookedAt).toLocaleDateString('en-IN')}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Ticket
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
