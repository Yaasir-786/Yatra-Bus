'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bus as BusIcon,
  Calendar,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import CityAutocomplete from '@/components/CityAutocomplete';
import { parseApiResponse } from '@/lib/client-api';
import { addDaysIST, getTodayIST, getWeekdayIST } from '@/lib/date-ist';
import { useAppState } from '@/context/AppStateContext';
import { BusType, DAYS_OF_WEEK, DayOfWeek, Schedule } from '@/types';

const WEEKDAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKENDS: DayOfWeek[] = ['Sat', 'Sun'];

function calculateTripDuration(
  departureTime: string,
  arrivalTime: string
): string {
  const [depH, depM] = departureTime.split(':').map(Number);
  const [arrH, arrM] = arrivalTime.split(':').map(Number);
  if (
    Number.isNaN(depH) ||
    Number.isNaN(depM) ||
    Number.isNaN(arrH) ||
    Number.isNaN(arrM)
  ) {
    return '4h 00m';
  }
  const startMins = depH * 60 + depM;
  let endMins = arrH * 60 + arrM;
  if (endMins <= startMins) {
    endMins += 24 * 60;
  }
  const diff = endMins - startMins;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

export default function AdminBusesPage() {
  const { addBusAndSchedule, deleteSchedule } = useAppState();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Onward trip fields (no pre-filled demo values)
  const [busName, setBusName] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [busType, setBusType] = useState<BusType>('AC');
  const [totalSeats, setTotalSeats] = useState('32');
  const [amenitiesText, setAmenitiesText] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [fare, setFare] = useState('');
  const [operatingDays, setOperatingDays] = useState<DayOfWeek[]>([
    ...DAYS_OF_WEEK,
  ]);
  const [startDate, setStartDate] = useState(() => getTodayIST());
  const [daysAhead, setDaysAhead] = useState('30');

  // Return trip fields
  const [createReturn, setCreateReturn] = useState(true);
  const [returnDepartureTime, setReturnDepartureTime] = useState('');
  const [returnArrivalTime, setReturnArrivalTime] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  const autoDuration = useMemo(() => {
    if (!departureTime || !arrivalTime) return '--';
    return calculateTripDuration(departureTime, arrivalTime);
  }, [departureTime, arrivalTime]);

  const returnAutoDuration = useMemo(() => {
    const dep = returnDepartureTime || departureTime;
    const arr = returnArrivalTime || arrivalTime;
    if (!dep || !arr) return '--';
    return calculateTripDuration(dep, arr);
  }, [returnDepartureTime, returnArrivalTime, departureTime, arrivalTime]);

  const plannedTripStats = useMemo(() => {
    const parsedDays = Number.parseInt(daysAhead, 10);
    const countDays = Number.isFinite(parsedDays)
      ? Math.min(Math.max(parsedDays, 1), 90)
      : 0;
    if (!startDate || countDays <= 0 || operatingDays.length === 0) {
      return { onward: 0, total: 0 };
    }
    const daySet = new Set(operatingDays);
    let onward = 0;
    for (let i = 0; i < countDays; i++) {
      const weekday = getWeekdayIST(addDaysIST(startDate, i));
      if (weekday && daySet.has(weekday)) onward++;
    }
    return {
      onward,
      total: createReturn ? onward * 2 : onward,
    };
  }, [startDate, daysAhead, operatingDays, createReturn]);

  const toggleDay = (day: DayOfWeek) => {
    setOperatingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

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
    if (!origin.trim() || !destination.trim()) {
      setFormError('Please select both origin and destination cities.');
      return;
    }
    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setFormError('Origin and destination cities must be different.');
      return;
    }
    if (!departureTime || !arrivalTime) {
      setFormError('Please select both departure and arrival times.');
      return;
    }
    if (operatingDays.length === 0) {
      setFormError('Please select at least one operating day.');
      return;
    }

    const parsedSeats = Number.parseInt(totalSeats, 10);
    const parsedFare = Number.parseInt(fare, 10);
    const parsedDaysAhead = Number.parseInt(daysAhead, 10);

    if (Number.isNaN(parsedSeats) || parsedSeats < 12 || parsedSeats > 60) {
      setFormError('Total seats must be between 12 and 60.');
      return;
    }
    if (Number.isNaN(parsedFare) || parsedFare < 100) {
      setFormError('Fare must be at least ₹100.');
      return;
    }
    if (
      Number.isNaN(parsedDaysAhead) ||
      parsedDaysAhead < 1 ||
      parsedDaysAhead > 90
    ) {
      setFormError('Number of days must be between 1 and 90.');
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
      departureTime,
      arrivalTime,
      duration: autoDuration === '--' ? '4h 00m' : autoDuration,
      fare: parsedFare,
      operatingDays,
      startDate,
      daysAhead: parsedDaysAhead,
      createReturn,
      returnDepartureTime: createReturn
        ? returnDepartureTime || departureTime
        : undefined,
      returnArrivalTime: createReturn
        ? returnArrivalTime || arrivalTime
        : undefined,
    });
    setSaving(false);

    if (!result.success) {
      setFormError(result.error ?? 'Could not save bus and schedule.');
      return;
    }

    setBusName('');
    setBusNumber('');
    setOrigin('');
    setDestination('');
    setDepartureTime('');
    setArrivalTime('');
    setFare('');
    setReturnDepartureTime('');
    setReturnArrivalTime('');
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
            Buses &amp; Schedules
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor per-date seat occupancy in MongoDB, delete schedules, or
            launch new routes
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
            const booked = schedule.bookedSeats?.length ?? 0;
            const occupancyPct = Math.min(
              Math.round((booked / Math.max(total, 1)) * 100),
              100
            );
            const isDeleting = deletingId === schedule.id;
            const days =
              schedule.operatingDays && schedule.operatingDays.length > 0
                ? schedule.operatingDays
                : DAYS_OF_WEEK;

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
                      {schedule.travelDate && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {schedule.travelDate}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {schedule.departureTime} → {schedule.arrivalTime} (
                        {schedule.duration})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="mr-1 text-[11px] font-semibold text-slate-400">
                        Runs:
                      </span>
                      {days.length === 7 ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Everyday
                        </span>
                      ) : (
                        days.map((d) => (
                          <span
                            key={d}
                            className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700"
                          >
                            {d}
                          </span>
                        ))
                      )}
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                Add Bus &amp; Schedule
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
              {/* Bus Info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Bus / Operator Name
                  </label>
                  <input
                    type="text"
                    value={busName}
                    onChange={(e) => setBusName(e.target.value)}
                    placeholder="Enter operator or bus name"
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
                    placeholder="e.g. MH-01-AB-1234"
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
                    Total Seats (12–60)
                  </label>
                  <input
                    type="number"
                    min={12}
                    max={60}
                    value={totalSeats}
                    onChange={(e) => setTotalSeats(e.target.value)}
                    placeholder="32"
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
                    placeholder="e.g. 850"
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
                  placeholder="AC, Wi-Fi, Charging Point, Water Bottle"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Operating Days & Date Range */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Operating Days &amp; Schedule Window
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOperatingDays([...DAYS_OF_WEEK])}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      Everyday
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperatingDays([...WEEKDAYS])}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      Weekdays
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperatingDays([...WEEKENDS])}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      Weekends
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const selected = operatingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                          selected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Number of days (1–90)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={daysAhead}
                      onChange={(e) => setDaysAhead(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex h-[38px] w-full items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 text-xs font-bold text-indigo-700">
                      {plannedTripStats.total} trip
                      {plannedTripStats.total === 1 ? '' : 's'} will be created
                    </div>
                  </div>
                </div>
              </div>

              {/* Onward Route */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Onward Trip
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <CityAutocomplete
                    id="admin-origin"
                    label="Origin"
                    value={origin}
                    onChange={setOrigin}
                    placeholder="Select origin city..."
                    iconColor="text-indigo-600"
                  />
                  <CityAutocomplete
                    id="admin-destination"
                    label="Destination"
                    value={destination}
                    onChange={setDestination}
                    placeholder="Select destination city..."
                    iconColor="text-rose-500"
                  />
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Departure Time
                    </label>
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Duration
                    </label>
                    <div className="flex h-[38px] items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 text-sm font-bold text-indigo-700">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>{autoDuration}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Return Trip Toggle */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={createReturn}
                    onChange={(e) => setCreateReturn(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900">
                      Also create return trip
                    </span>
                    <span className="ml-2 text-xs text-slate-500">
                      ({destination || 'Dest'} → {origin || 'Origin'})
                    </span>
                  </div>
                  <RefreshCw className="ml-auto h-4 w-4 text-indigo-600" />
                </label>

                {createReturn && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Return Departure
                      </label>
                      <input
                        type="time"
                        value={returnDepartureTime}
                        onChange={(e) => setReturnDepartureTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Return Arrival
                      </label>
                      <input
                        type="time"
                        value={returnArrivalTime}
                        onChange={(e) => setReturnArrivalTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Duration
                      </label>
                      <div className="flex h-[38px] items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 text-sm font-bold text-indigo-700">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{returnAutoDuration}</span>
                      </div>
                    </div>
                  </div>
                )}
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
                  {saving
                    ? 'Saving...'
                    : `Create ${plannedTripStats.total} Schedule${
                        plannedTripStats.total === 1 ? '' : 's'
                      }`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
