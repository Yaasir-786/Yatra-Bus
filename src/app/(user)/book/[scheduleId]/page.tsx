'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bus as BusIcon,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import SeatMap from '@/components/SeatMap';
import { useAppState } from '@/context/AppStateContext';
import { parseApiResponse } from '@/lib/client-api';
import { Bus, Passenger, PassengerGender, Schedule } from '@/types';

interface PassengerDraft {
  name: string;
  age: string;
  gender: PassengerGender;
}

export default function BookSchedulePage() {
  const params = useParams<{ scheduleId: string }>();
  const router = useRouter();
  const { currentUser, authLoading, bookSeats } = useAppState();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [bus, setBus] = useState<Bus | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengerDrafts, setPassengerDrafts] = useState<
    Record<string, PassengerDraft>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const res = await fetch(`/api/schedules/${params.scheduleId}`, {
        cache: 'no-store',
      });
      const { ok, data } = await parseApiResponse<{
        schedule: Schedule;
        bus: Bus | null;
      }>(res);
      if (ok && data.schedule) {
        setSchedule(data.schedule);
        setBus(data.bus ?? null);
      } else {
        setSchedule(null);
      }
    } catch {
      setSchedule(null);
    } finally {
      setLoadingSchedule(false);
    }
  }, [params.scheduleId]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    if (currentUser.status === 'blocked') {
      router.replace('/blocked');
    }
  }, [authLoading, currentUser, router]);

  if (authLoading || !currentUser || currentUser.status === 'blocked') {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        Verifying session...
      </div>
    );
  }

  if (loadingSchedule) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        Loading live seat map from MongoDB...
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
          <BusIcon className="mx-auto h-10 w-10 text-slate-300" />
          <h1 className="mt-3 text-lg font-bold text-slate-900">
            Schedule not found
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            This bus schedule may have been removed or is no longer active.
          </p>
          <Link
            href="/buses"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bus Search
          </Link>
        </div>
      </div>
    );
  }

  const handleToggleSeat = (seatNumber: string) => {
    setError(null);
    setSelectedSeats((prev) => {
      if (prev.includes(seatNumber)) {
        return prev.filter((s) => s !== seatNumber);
      }
      if (prev.length >= 6) {
        setError('You can book a maximum of 6 seats per transaction.');
        return prev;
      }
      const next = [...prev, seatNumber];
      setPassengerDrafts((drafts) => {
        if (drafts[seatNumber]) return drafts;
        return {
          ...drafts,
          [seatNumber]: {
            name: prev.length === 0 ? currentUser.name : '',
            age: '26',
            gender: 'Male',
          },
        };
      });
      return next;
    });
  };

  const updateDraft = (
    seatNumber: string,
    field: keyof PassengerDraft,
    value: string
  ) => {
    setPassengerDrafts((prev) => ({
      ...prev,
      [seatNumber]: {
        ...(prev[seatNumber] ?? { name: '', age: '26', gender: 'Male' }),
        [field]: value,
      },
    }));
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedSeats.length === 0) {
      setError('Please select at least one seat from the seat map.');
      return;
    }

    const passengers: Passenger[] = [];
    for (const seat of selectedSeats) {
      const draft = passengerDrafts[seat];
      if (!draft || !draft.name.trim()) {
        setError(`Please enter the passenger name for seat ${seat}.`);
        return;
      }
      const parsedAge = Number.parseInt(draft.age, 10);
      if (Number.isNaN(parsedAge) || parsedAge < 1 || parsedAge > 110) {
        setError(`Please enter a valid age (1–110) for seat ${seat}.`);
        return;
      }
      passengers.push({
        name: draft.name.trim(),
        age: parsedAge,
        gender: draft.gender,
        seatNumber: seat,
      });
    }

    setSubmitting(true);
    const result = await bookSeats(schedule.id, passengers);
    setSubmitting(false);

    if (!result.success) {
      if (result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
      setError(result.error ?? 'Could not complete booking.');
      await loadSchedule();
      setSelectedSeats([]);
      return;
    }

    router.push(
      `/my-bookings?booked=${encodeURIComponent(
        result.booking?.bookingRef ?? ''
      )}`
    );
  };

  const totalAmount = selectedSeats.length * schedule.fare;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/buses"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Buses
      </Link>

      {/* Schedule Banner */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {schedule.busName}
              </h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {schedule.busType}
              </span>
              <span className="text-xs text-slate-400">
                {schedule.busNumber}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                {schedule.origin}
                <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                {schedule.destination}
              </span>
              <span className="inline-flex items-center gap-1 text-xs">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {schedule.travelDate}
              </span>
              <span className="inline-flex items-center gap-1 text-xs">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {schedule.departureTime} → {schedule.arrivalTime} (
                {schedule.duration})
              </span>
            </div>
            {bus && bus.amenities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bus.amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="sm:text-right">
            <div className="text-xs text-slate-500">Fare per seat</div>
            <div className="text-2xl font-extrabold text-indigo-600">
              ₹{schedule.fare}
            </div>
          </div>
        </div>
      </div>

      {/* Seat Map + Checkout Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
            1. Select Seats
          </h2>
          <SeatMap
            totalSeats={schedule.totalSeats}
            bookedSeats={schedule.bookedSeats}
            selectedSeats={selectedSeats}
            busType={schedule.busType}
            onToggleSeat={handleToggleSeat}
          />
        </div>

        <form
          onSubmit={(e) => void handleConfirmBooking(e)}
          className="space-y-5 lg:col-span-7"
        >
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            2. Passenger Details & Checkout
          </h2>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {selectedSeats.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Click any green seat on the left to add passenger details and
              proceed to checkout.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSeats.map((seat) => {
                const draft = passengerDrafts[seat] ?? {
                  name: '',
                  age: '26',
                  gender: 'Male' as PassengerGender,
                };
                return (
                  <div
                    key={seat}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                        Seat {seat}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSeat(seat)}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                      <div className="sm:col-span-6">
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Passenger Name
                        </label>
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(e) =>
                            updateDraft(seat, 'name', e.target.value)
                          }
                          placeholder="Full name"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Age
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={110}
                          value={draft.age}
                          onChange={(e) =>
                            updateDraft(seat, 'age', e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-xs font-semibold text-slate-600">
                          Gender
                        </label>
                        <select
                          value={draft.gender}
                          onChange={(e) =>
                            updateDraft(seat, 'gender', e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fare Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Fare Summary</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Selected Seats</span>
                <span className="font-semibold text-slate-900">
                  {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>
                  Base Fare (₹{schedule.fare} × {selectedSeats.length})
                </span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform & Convenience Fee</span>
                <span className="font-medium text-emerald-600">₹0 (Free)</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold text-slate-900">
                <span>Total Payable</span>
                <span className="text-indigo-600">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={selectedSeats.length === 0 || submitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {submitting ? 'Confirming Seats...' : 'Confirm Booking'}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Atomic MongoDB booking • Free seat release on cancellation
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
