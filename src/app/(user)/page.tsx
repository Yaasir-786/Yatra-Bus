'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  ArrowRight,
  Calendar,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Zap,
} from 'lucide-react';
import CityAutocomplete from '@/components/CityAutocomplete';
import { useAppState } from '@/context/AppStateContext';

export default function HomePage() {
  const router = useRouter();
  const { schedules, schedulesLoading } = useAppState();
  const [origin, setOrigin] = useState('Indore');
  const [destination, setDestination] = useState('Bhopal');
  const [travelDate, setTravelDate] = useState('2026-11-27');

  const popularRoutes = useMemo(() => {
    const routeMap = new Map<
      string,
      { origin: string; destination: string; startingFare: number; duration: string }
    >();
    for (const s of schedules) {
      const key = `${s.origin}::${s.destination}`;
      const existing = routeMap.get(key);
      if (!existing || s.fare < existing.startingFare) {
        routeMap.set(key, {
          origin: s.origin,
          destination: s.destination,
          startingFare: s.fare,
          duration: s.duration || '4h 00m',
        });
      }
    }
    return Array.from(routeMap.values()).slice(0, 8);
  }, [schedules]);

  const uniqueBusCount = useMemo(
    () => new Set(schedules.map((s) => s.busId)).size,
    [schedules]
  );

  const handleSwapCities = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (origin) params.set('origin', origin);
    if (destination) params.set('destination', destination);
    if (travelDate) params.set('date', travelDate);
    router.push(`/buses?${params.toString()}`);
  };

  const openAiDrawer = () => {
    window.dispatchEvent(new Event('open-ai-assistant'));
  };

  return (
    <div className="pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 py-14 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-indigo-100 backdrop-blur-xs">
              <Zap className="h-3.5 w-3.5" />
              {schedulesLoading
                ? 'Loading live MongoDB schedules...'
                : `${schedules.length} Live Schedules Across ${uniqueBusCount} Verified Buses`}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Book Intercity Bus Tickets Across India
            </h1>
            <p className="mt-3 text-base text-indigo-100 sm:text-lg">
              Choose your preferred seat on an interactive 2×2 map, get instant
              E-Tickets, and travel seamlessly with trusted operators.
            </p>
          </div>

          {/* Search Card */}
          <form
            onSubmit={handleSearch}
            className="mt-8 rounded-2xl bg-white p-4 text-slate-900 shadow-xl sm:p-6"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
              <div className="md:col-span-4">
                <CityAutocomplete
                  id="home-origin"
                  label="From"
                  value={origin}
                  onChange={setOrigin}
                  placeholder="Origin city..."
                  iconColor="text-indigo-600"
                />
              </div>

              <div className="flex justify-center md:col-span-1">
                <button
                  type="button"
                  onClick={handleSwapCities}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                  title="Swap origin and destination"
                  aria-label="Swap origin and destination"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
              </div>

              <div className="md:col-span-4">
                <CityAutocomplete
                  id="home-destination"
                  label="To"
                  value={destination}
                  onChange={setDestination}
                  placeholder="Destination city..."
                  iconColor="text-rose-500"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="home-date"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Journey Date
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="home-date"
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-1">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                Tip: Try <strong className="text-slate-700">Indore → Bhopal</strong> or{' '}
                <strong className="text-slate-700">Indore → Mumbai</strong>, or{' '}
                <Link href="/buses" className="font-semibold text-indigo-600 hover:underline">
                  browse all schedules
                </Link>
                .
              </span>
              <button
                type="button"
                onClick={openAiDrawer}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ask AI Trip Assistant
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Popular Routes from MongoDB — up to 8 routes, 2 rows of 4 */}
      <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Popular Bus Routes
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Live corridors loaded from MongoDB with AC, Non-AC, and Sleeper options
            </p>
          </div>
          <Link
            href="/buses"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all buses →
          </Link>
        </div>

        {schedulesLoading ? (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            Loading routes from MongoDB...
          </div>
        ) : popularRoutes.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            No schedules found in MongoDB yet.{' '}
            <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
              Seed demo data on the Login page
            </Link>{' '}
            or add schedules in the Admin Panel.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popularRoutes.map((route) => (
              <Link
                key={`${route.origin}-${route.destination}`}
                href={`/buses?origin=${encodeURIComponent(
                  route.origin
                )}&destination=${encodeURIComponent(route.destination)}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {route.duration}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
                </div>

                <div className="mt-4 flex items-center gap-2 text-base font-bold text-slate-900">
                  <span>{route.origin}</span>
                  <span className="text-slate-400">→</span>
                  <span>{route.destination}</span>
                </div>

                <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">Starting from</span>
                  <span className="text-lg font-extrabold text-indigo-600">
                    ₹{route.startingFare}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Feature Highlights + AI Banner */}
      <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Ticket className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Atomic 2×2 Seat Locking
            </h3>
            <p className="mt-1.5 text-sm text-slate-500">
              Pick exact window or aisle seats backed by atomic MongoDB updates
              to prevent double-bookings.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">
              Instant E-Tickets &amp; Easy Cancel
            </h3>
            <p className="mt-1.5 text-sm text-slate-500">
              View printable E-Tickets immediately after checkout and cancel
              anytime to release your seats in MongoDB.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-indigo-200 bg-indigo-50/70 p-6">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                AI Trip Assistant
              </h3>
              <p className="mt-1.5 text-sm text-slate-600">
                Ask Gemini with live MongoDB tool calling to compare fares,
                sleeper coaches, and open window seats.
              </p>
            </div>
            <button
              type="button"
              onClick={openAiDrawer}
              className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Open Trip Assistant
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
