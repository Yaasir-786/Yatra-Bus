'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Bus as BusIcon,
  Calendar,
  Clock,
  Filter,
  Loader2,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react';
import CityAutocomplete from '@/components/CityAutocomplete';
import { parseApiResponse } from '@/lib/client-api';
import { Bus, BusType, Schedule } from '@/types';

type DepartureWindow = 'all' | 'morning' | 'afternoon' | 'night';

function BusesContent() {
  const searchParams = useSearchParams();

  const [originFilter, setOriginFilter] = useState(
    searchParams.get('origin') ?? ''
  );
  const [destinationFilter, setDestinationFilter] = useState(
    searchParams.get('destination') ?? ''
  );
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') ?? '');
  const [selectedTypes, setSelectedTypes] = useState<BusType[]>([]);
  const [maxFare, setMaxFare] = useState<number | null>(null);
  const [departureWindow, setDepartureWindow] =
    useState<DepartureWindow>('all');

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const highestFare = useMemo(() => {
    if (schedules.length === 0) return 2000;
    return Math.max(...schedules.map((s) => s.fare), 500);
  }, [schedules]);

  const effectiveMaxFare = maxFare ?? highestFare;

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (originFilter) params.set('origin', originFilter);
      if (destinationFilter) params.set('destination', destinationFilter);
      if (dateFilter) params.set('travelDate', dateFilter);

      const res = await fetch(`/api/schedules?${params.toString()}`, {
        cache: 'no-store',
      });
      const { ok, data } = await parseApiResponse<{
        schedules: Schedule[];
        buses: Bus[];
      }>(res);

      if (!ok) {
        setError(data.error ?? 'Failed to load schedules from MongoDB.');
        return;
      }

      setSchedules(data.schedules ?? []);
      setBuses(data.buses ?? []);
    } catch {
      setError('Network error while loading schedules.');
    } finally {
      setLoading(false);
    }
  }, [originFilter, destinationFilter, dateFilter]);

  useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

  const busMap = useMemo(() => new Map(buses.map((b) => [b.id, b])), [buses]);

  const toggleBusType = (type: BusType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const resetFilters = () => {
    setOriginFilter('');
    setDestinationFilter('');
    setDateFilter('');
    setSelectedTypes([]);
    setMaxFare(null);
    setDepartureWindow('all');
  };

  const filteredResults = useMemo(() => {
    return schedules.filter((schedule) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(schedule.busType)) {
        return false;
      }
      if (schedule.fare > effectiveMaxFare) {
        return false;
      }
      if (departureWindow !== 'all') {
        const hour = Number.parseInt(schedule.departureTime.split(':')[0], 10);
        if (departureWindow === 'morning' && !(hour >= 6 && hour < 12)) {
          return false;
        }
        if (departureWindow === 'afternoon' && !(hour >= 12 && hour < 18)) {
          return false;
        }
        if (departureWindow === 'night' && !(hour >= 18 || hour < 6)) {
          return false;
        }
      }
      return true;
    });
  }, [schedules, selectedTypes, effectiveMaxFare, departureWindow]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Route Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <CityAutocomplete
              id="filter-origin"
              label="Origin"
              value={originFilter}
              onChange={setOriginFilter}
              placeholder="Any origin..."
              iconColor="text-indigo-600"
              allowAny
            />
          </div>

          <div>
            <CityAutocomplete
              id="filter-destination"
              label="Destination"
              value={destinationFilter}
              onChange={setDestinationFilter}
              placeholder="Any destination..."
              iconColor="text-rose-500"
              allowAny
            />
          </div>

          <div>
            <label
              htmlFor="filter-date"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500"
            >
              Travel Date
            </label>
            <input
              id="filter-date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              <RotateCcw className="h-4 w-4" />
              Show All Buses
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Filter Sidebar */}
        <aside className="lg:col-span-3">
          <div className="sticky top-24 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Filter className="h-4 w-4 text-indigo-600" />
                Filters
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Reset
              </button>
            </div>

            <div>
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Bus Type
              </h3>
              <div className="space-y-2">
                {(['AC', 'Non-AC', 'Sleeper'] as BusType[]).map((type) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleBusType(type)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Max Fare
                </h3>
                <span className="text-sm font-bold text-indigo-600">
                  ₹{effectiveMaxFare}
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={highestFare}
                step={50}
                value={effectiveMaxFare}
                onChange={(e) => setMaxFare(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                <span>₹100</span>
                <span>₹{highestFare}</span>
              </div>
            </div>

            <div>
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Departure Window
              </h3>
              <div className="space-y-1.5">
                {[
                  { value: 'all', label: 'Any Time' },
                  { value: 'morning', label: 'Morning (06:00 - 12:00)' },
                  { value: 'afternoon', label: 'Afternoon (12:00 - 18:00)' },
                  { value: 'night', label: 'Night (18:00 - 06:00)' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setDepartureWindow(opt.value as DepartureWindow)
                    }
                    className={`w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      departureWindow === opt.value
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Results Column */}
        <section className="space-y-4 lg:col-span-9">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900">
              {loading
                ? 'Searching MongoDB Schedules...'
                : `${filteredResults.length} Bus${
                    filteredResults.length === 1 ? '' : 'es'
                  } Found`}
            </h1>
            {(originFilter || destinationFilter || dateFilter) && (
              <span className="text-xs font-medium text-slate-500">
                Showing matches for{' '}
                <strong className="text-slate-700">
                  {originFilter || 'Any'} → {destinationFilter || 'Any'}
                </strong>
                {dateFilter ? ` on ${dateFilter}` : ''}
              </span>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              Loading bus schedules...
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <BusIcon className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-3 text-base font-bold text-slate-900">
                No matching buses found
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Try clearing the date filter or adjusting bus type and max fare
                filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredResults.map((schedule) => {
              const bus = busMap.get(schedule.busId);
              const availableSeats =
                schedule.totalSeats - (schedule.bookedSeats?.length ?? 0);
              const amenities = bus?.amenities ?? [schedule.busType];

              return (
                <div
                  key={schedule.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {schedule.busName}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            schedule.busType === 'AC'
                              ? 'bg-sky-100 text-sky-700'
                              : schedule.busType === 'Sleeper'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {schedule.busType}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          {schedule.busNumber}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-6">
                        <div>
                          <div className="text-lg font-extrabold text-slate-900">
                            {schedule.departureTime}
                          </div>
                          <div className="text-xs font-medium text-slate-500">
                            {schedule.origin}
                          </div>
                        </div>

                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-medium text-slate-400">
                            {schedule.duration}
                          </span>
                          <div className="my-1 flex items-center gap-1 text-indigo-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            <span className="h-px w-14 bg-indigo-200" />
                            <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {schedule.travelDate}
                          </span>
                        </div>

                        <div>
                          <div className="text-lg font-extrabold text-slate-900">
                            {schedule.arrivalTime}
                          </div>
                          <div className="text-xs font-medium text-slate-500">
                            {schedule.destination}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {amenities.map((amenity) => (
                          <span
                            key={amenity}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                          >
                            <Sparkles className="h-2.5 w-2.5 text-indigo-500" />
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 md:flex-col md:items-end md:border-l md:border-t-0 md:pl-6 md:pt-0">
                      <div className="md:text-right">
                        <div className="text-2xl font-extrabold text-slate-900">
                          ₹{schedule.fare}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-emerald-600 md:justify-end">
                          <Users className="h-3.5 w-3.5" />
                          {availableSeats} seats left
                        </div>
                      </div>

                      <Link
                        href={`/book/${schedule.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
                      >
                        <Clock className="hidden h-4 w-4 sm:inline" />
                        Select Seats
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

export default function BusesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-slate-500">
          Loading bus schedules...
        </div>
      }
    >
      <BusesContent />
    </Suspense>
  );
}
