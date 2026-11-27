'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bus as BusIcon,
  Calendar,
  Clock,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { CITIES, parseApiResponse } from '@/lib/client-api';
import { useAppState } from '@/context/AppStateContext';
import { BusType, Schedule } from '@/types';

export default function AdminBusesPage() {
  const { addBusAndSchedule, deleteSchedule } = useAppState();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busName, setBusName] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [busType, setBusType] = useState<BusType>('AC');
  const [totalSeats, setTotalSeats] = useState('32');
  const [amenitiesText, setAmenitiesText] = useState(
    'AC, Wi-Fi, Charging Point, Water Bottle'
  );
  const [origin, setOrigin] = useState('Indore');
  const [destination, setDestination] = useState('Pune');
  const [travelDate, setTravelDate] = useState('2026-11-28');
  const [departureTime, setDepartureTime] = useState('20:00');
  const [arrivalTime, setArrivalTime] = useState('06:00');
  const [duration, setDuration] = useState('10h 00m');
  const [fare, setFare] = useState('950');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAdminBuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/buses', {
        credentials: 'include',
        cache: 'no-store',
      });
      const { ok, data } = await parseApiResponse<{ schedules: Schedule[] }>(
        res
      );
      if (!ok) {
        setError(data.error ?? 'Failed to load buses and schedules.');
        return;
      }
      setSchedules(data.schedules ?? []);
    } catch {
      setError('Network error while loading schedules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAdminBuses();
  }, [fetchAdminBuses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!busName.trim() || !busNumber.trim()) {
      setFormError('Please provide both bus name and bus number.');
      return;
    }
    if (origin === destination) {
      setFormError('Origin and destination cities must be different.');
      return;
    }

    const parsedSeats = Number.parseInt(totalSeats, 10);
    const parsedFare = Number.parseInt(fare, 10);

    if (Number.isNaN(parsedSeats) || parsedSeats < 12 || parsedSeats > 48) {
      setFormError('Total seats must be between 12 and 48.');
      return;
    }
    if (Number.isNaN(parsedFare) || parsedFare < 100) {
      setFormError('Fare must be at least ₹100.');
      return;
    }

    const amenities = amenitiesText
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    setSaving(true);
    const result = await addBusAndSchedule({
      busName,
      busNumber,
      busType,
      totalSeats: parsedSeats,
      amenities: amenities.length > 0 ? amenities : [busType],
      origin,
      destination,
      travelDate,
      departureTime,
      arrivalTime,
      duration,
      fare: parsedFare,
    });
    setSaving(false);

    if (!result.success) {
      setFormError(result.error ?? 'Could not save bus and schedule.');
      return;
    }

    setBusName('');
    setBusNumber('');
    setIsModalOpen(false);
    await fetchAdminBuses();
  };

  const handleDelete = async (scheduleId: string) => {
    setDeletingId(scheduleId);
    setError(null);
    const result = await deleteSchedule(scheduleId);
    setDeletingId(null);

    if (!result.success) {
      setError(result.error ?? 'Failed to delete schedule.');
      return;
    }
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Buses & Schedules
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor seat occupancy in MongoDB, delete schedules, or launch new
            routes
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Bus / Schedule
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          Loading buses and schedules...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {schedules.map((schedule) => {
            const total = schedule.totalSeats;
            const booked = schedule.bookedSeats.length;
            const occupancyPct = Math.min(
              Math.round((booked / Math.max(total, 1)) * 100),
              100
            );
            const isDeleting = deletingId === schedule.id;

            return (
              <div
                key={schedule.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <BusIcon className="h-4 w-4" />
                      </span>
                      <h2 className="text-base font-bold text-slate-900">
                        {schedule.busName}
                      </h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {schedule.busType}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {schedule.busNumber}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                        {schedule.origin}
                        <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                        {schedule.destination}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {schedule.travelDate}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {schedule.departureTime} → {schedule.arrivalTime} (
                        {schedule.duration})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="w-44">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-500">
                          Occupancy
                        </span>
                        <span className="font-bold text-slate-800">
                          {booked}/{total} ({occupancyPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            occupancyPct >= 75
                              ? 'bg-rose-500'
                              : occupancyPct >= 40
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${occupancyPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Fare</div>
                        <div className="text-lg font-extrabold text-slate-900">
                          ₹{schedule.fare}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void handleDelete(schedule.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
                        aria-label={`Delete schedule ${schedule.origin} to ${schedule.destination}`}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {schedules.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
              No active schedules in MongoDB. Click &ldquo;Add Bus /
              Schedule&rdquo; to create one.
            </div>
          )}
        </div>
      )}

      {/* Add Bus / Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                Add Bus & Schedule
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Bus / Operator Name
                  </label>
                  <input
                    type="text"
                    value={busName}
                    onChange={(e) => setBusName(e.target.value)}
                    placeholder="e.g. Avantika Express"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Bus Number
                  </label>
                  <input
                    type="text"
                    value={busNumber}
                    onChange={(e) => setBusNumber(e.target.value)}
                    placeholder="e.g. MP-09-XY-1234"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Bus Type
                  </label>
                  <select
                    value={busType}
                    onChange={(e) => setBusType(e.target.value as BusType)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  >
                    <option value="AC">AC</option>
                    <option value="Non-AC">Non-AC</option>
                    <option value="Sleeper">Sleeper</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Total Seats
                  </label>
                  <input
                    type="number"
                    min={12}
                    max={48}
                    value={totalSeats}
                    onChange={(e) => setTotalSeats(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Fare (₹)
                  </label>
                  <input
                    type="number"
                    min={100}
                    value={fare}
                    onChange={(e) => setFare(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Amenities (comma-separated)
                </label>
                <input
                  type="text"
                  value={amenitiesText}
                  onChange={(e) => setAmenitiesText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Origin
                  </label>
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Destination
                  </label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Travel Date
                  </label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Departure Time
                  </label>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Arrival Time
                  </label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 4h 15m"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
