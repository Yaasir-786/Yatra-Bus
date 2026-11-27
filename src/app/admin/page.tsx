'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Bus,
  CheckCircle2,
  IndianRupee,
  Loader2,
  Sparkles,
  UserX,
  Users,
  XCircle,
} from 'lucide-react';
import { parseApiResponse } from '@/lib/client-api';
import { AdminStats } from '@/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [insights, setInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats', {
        credentials: 'include',
        cache: 'no-store',
      });
      const { ok, data } = await parseApiResponse<AdminStats>(res);
      if (!ok) {
        setError(data.error ?? 'Failed to load dashboard statistics.');
        return;
      }
      setStats(data);
    } catch {
      setError('Network error while loading dashboard stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const handleGenerateInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await fetch('/api/ai/admin-insights', {
        method: 'POST',
        credentials: 'include',
      });
      const { ok, data } = await parseApiResponse<{ insights?: string }>(res);
      if (!ok || !data.insights) {
        setInsightsError(
          data.error ?? 'Could not generate AI operational insights.'
        );
        return;
      }
      setInsights(data.insights);
    } catch {
      setInsightsError('Network error while generating AI insights.');
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
        Loading MongoDB dashboard metrics...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error ?? 'Could not load dashboard metrics.'}</span>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      sub: `${stats.totalUsers - stats.blockedUsers} active accounts`,
      icon: Users,
      tone: 'bg-indigo-100 text-indigo-700',
      href: '/admin/users',
    },
    {
      label: 'Blocked Users',
      value: stats.blockedUsers,
      sub: 'Restricted from booking',
      icon: UserX,
      tone: 'bg-rose-100 text-rose-700',
      href: '/admin/users',
    },
    {
      label: 'Active Schedules',
      value: stats.activeSchedules,
      sub: 'Across Indian corridors',
      icon: Bus,
      tone: 'bg-sky-100 text-sky-700',
      href: '/admin/buses',
    },
    {
      label: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`,
      sub: 'Confirmed ticket sales',
      icon: IndianRupee,
      tone: 'bg-emerald-100 text-emerald-700',
      href: '/admin/bookings',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Live MongoDB overview of users, schedules, and ticket revenue
        </p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {kpi.label}
                </span>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.tone}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-slate-900">
                {kpi.value}
              </div>
              <div className="mt-1 text-xs text-slate-500">{kpi.sub}</div>
            </Link>
          );
        })}
      </div>

      {/* AI Operations Insights Card */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                AI Operations Insights
              </h2>
              <p className="text-xs text-slate-500">
                Analyze live route occupancy, revenue, and cancellation risk via
                Gemini
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={insightsLoading}
            onClick={() => void handleGenerateInsights()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {insightsLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {insightsLoading ? 'Analyzing MongoDB...' : 'Generate AI Insights'}
          </button>
        </div>

        {insightsError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{insightsError}</span>
          </div>
        )}

        {insights && (
          <div className="mt-4 whitespace-pre-wrap rounded-xl border border-indigo-100 bg-white p-4 text-xs leading-relaxed text-slate-700">
            {insights}
          </div>
        )}
      </div>

      {/* Recent Bookings */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Bookings
            </h2>
            <p className="text-xs text-slate-500">
              Latest passenger ticket activity across all routes
            </p>
          </div>
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">Booking Ref</th>
                <th className="px-6 py-3">Passenger / User</th>
                <th className="px-6 py-3">Route & Coach</th>
                <th className="px-6 py-3">Seats</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentBookings.map((booking) => {
                const isConfirmed = booking.status === 'confirmed';

                return (
                  <tr key={booking.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {booking.bookingRef}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-slate-800">
                        {booking.userName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {booking.userEmail}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-slate-800">
                        {booking.origin} → {booking.destination}
                      </div>
                      <div className="text-xs text-slate-400">
                        {booking.busName}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-indigo-700">
                      {booking.passengers.map((p) => p.seatNumber).join(', ')}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      ₹{booking.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-3.5">
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
                  </tr>
                );
              })}

              {stats.recentBookings.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    No bookings recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
