'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import { parseApiResponse } from '@/lib/client-api';
import { User } from '@/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>(
    'all'
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        credentials: 'include',
        cache: 'no-store',
      });
      const { ok, data } = await parseApiResponse<{ users: User[] }>(res);
      if (!ok) {
        setError(data.error ?? 'Failed to load users.');
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError('Network error while loading users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (userId: string) => {
    setTogglingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const { ok, data } = await parseApiResponse<{ user: User }>(res);
      if (!ok || !data.user) {
        setError(data.error ?? 'Failed to update user status.');
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...data.user!, bookingCount: u.bookingCount } : u
        )
      );
    } catch {
      setError('Network error while updating user status.');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          User Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Inspect registered MongoDB passengers and block or unblock accounts in
          real time
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(['all', 'active', 'blocked'] as const).map((status) => (
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

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            Loading users...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Bookings</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Joined</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const isBlocked = user.status === 'blocked';
                  const isAdmin = user.role === 'admin';
                  const isBusy = togglingId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {user.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {user.phone}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isAdmin
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isAdmin && <ShieldCheck className="h-3 w-3" />}
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                        {user.bookingCount ?? 0}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isBlocked
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isBlocked ? (
                            <UserX className="h-3 w-3" />
                          ) : (
                            <UserCheck className="h-3 w-3" />
                          )}
                          {isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin ? (
                          <span className="text-xs font-medium text-slate-400">
                            Protected Admin
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleToggleStatus(user.id)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                              isBlocked
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isBlocked ? (
                              <UserCheck className="h-3.5 w-3.5" />
                            ) : (
                              <UserX className="h-3.5 w-3.5" />
                            )}
                            {isBlocked ? 'Unblock' : 'Block'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No users match your search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
