'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  AddBusScheduleInput,
  AuthActionResult,
  Booking,
  BookingActionResult,
  Passenger,
  RegisterInput,
  Schedule,
  User,
} from '@/types';
import { parseApiResponse } from '@/lib/client-api';

interface AppStateContextValue {
  currentUser: User | null;
  authLoading: boolean;
  lastBlockedUser: User | null;
  schedules: Schedule[];
  schedulesLoading: boolean;
  refreshUser: () => Promise<User | null>;
  refreshSchedules: () => Promise<void>;
  registerUser: (input: RegisterInput) => Promise<AuthActionResult>;
  loginUser: (email: string, password: string) => Promise<AuthActionResult>;
  logoutUser: () => Promise<void>;
  handleBlockedResponse: (blockedUser?: User | null) => void;
  bookSeats: (
    scheduleId: string,
    passengers: Passenger[]
  ) => Promise<BookingActionResult>;
  cancelBooking: (bookingId: string) => Promise<{
    success: boolean;
    booking?: Booking;
    error?: string;
  }>;
  addBusAndSchedule: (input: AddBusScheduleInput) => Promise<{
    success: boolean;
    schedule?: Schedule;
    error?: string;
  }>;
  deleteSchedule: (scheduleId: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [lastBlockedUser, setLastBlockedUser] = useState<User | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState<boolean>(true);

  const handleBlockedResponse = useCallback(
    (blockedUser?: User | null) => {
      setCurrentUser(null);
      if (blockedUser) {
        setLastBlockedUser(blockedUser);
      }
      router.push('/blocked');
    },
    [router]
  );

  const refreshUser = useCallback(async (): Promise<User | null> => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      const { ok, status, data } = await parseApiResponse<{ user: User | null }>(
        res
      );

      if (status === 403 && data.code === 'USER_BLOCKED') {
        handleBlockedResponse(data.user ?? null);
        return null;
      }

      if (ok && data.user) {
        setCurrentUser(data.user);
        setLastBlockedUser(null);
        return data.user;
      }

      setCurrentUser(null);
      return null;
    } catch {
      setCurrentUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, [handleBlockedResponse]);

  const refreshSchedules = useCallback(async () => {
    setSchedulesLoading(true);
    try {
      const res = await fetch('/api/schedules', {
        method: 'GET',
        cache: 'no-store',
      });
      const { ok, data } = await parseApiResponse<{ schedules: Schedule[] }>(
        res
      );
      if (ok && Array.isArray(data.schedules)) {
        setSchedules(data.schedules);
      }
    } catch {
      // Handled by page-level fetches as needed
    } finally {
      setSchedulesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
    void refreshSchedules();
  }, [refreshUser, refreshSchedules]);

  const registerUser = async (
    input: RegisterInput
  ): Promise<AuthActionResult> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });
      const { ok, data } = await parseApiResponse<{ user: User }>(res);

      if (!ok || !data.user) {
        return {
          success: false,
          error: data.error ?? 'Could not complete registration.',
        };
      }

      setCurrentUser(data.user);
      setLastBlockedUser(null);
      router.push('/');
      return {
        success: true,
        user: data.user,
        redirectTo: '/',
      };
    } catch {
      return {
        success: false,
        error: 'Network error while creating your account.',
      };
    }
  };

  const loginUser = async (
    email: string,
    password: string
  ): Promise<AuthActionResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const { ok, status, data } = await parseApiResponse<{
        user?: User;
        message?: string;
      }>(res);

      if (status === 403 && data.code === 'USER_BLOCKED') {
        handleBlockedResponse(data.user ?? null);
        return {
          success: false,
          code: 'USER_BLOCKED',
          error: data.error ?? data.message ?? 'Account blocked',
          user: data.user,
          redirectTo: '/blocked',
        };
      }

      if (!ok || !data.user) {
        return {
          success: false,
          error: data.error ?? 'Invalid email or password.',
        };
      }

      setCurrentUser(data.user);
      setLastBlockedUser(null);
      const redirectTo = data.user.role === 'admin' ? '/admin' : '/';
      router.push(redirectTo);

      return {
        success: true,
        user: data.user,
        redirectTo,
      };
    } catch {
      return {
        success: false,
        error: 'Network error while signing in.',
      };
    }
  };

  const logoutUser = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setCurrentUser(null);
      setLastBlockedUser(null);
      router.push('/login');
    }
  };

  const bookSeats = async (
    scheduleId: string,
    passengers: Passenger[]
  ): Promise<BookingActionResult> => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scheduleId, passengers }),
      });
      const { ok, status, data } = await parseApiResponse<{ booking: Booking }>(
        res
      );

      if (status === 401) {
        setCurrentUser(null);
        router.push('/login');
        return {
          success: false,
          error: data.error ?? 'Please sign in to book seats.',
          redirectTo: '/login',
        };
      }

      if (status === 403 && data.code === 'USER_BLOCKED') {
        handleBlockedResponse(currentUser);
        return {
          success: false,
          code: 'USER_BLOCKED',
          error: data.error ?? 'Your account is blocked.',
          redirectTo: '/blocked',
        };
      }

      if (!ok || !data.booking) {
        return {
          success: false,
          error: data.error ?? 'Could not complete booking.',
        };
      }

      await refreshSchedules();
      return {
        success: true,
        booking: data.booking,
      };
    } catch {
      return {
        success: false,
        error: 'Network error while confirming booking.',
      };
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const { ok, status, data } = await parseApiResponse<{ booking: Booking }>(
        res
      );

      if (status === 403 && data.code === 'USER_BLOCKED') {
        handleBlockedResponse(currentUser);
        return { success: false, error: 'Account blocked.' };
      }

      if (!ok || !data.booking) {
        return {
          success: false,
          error: data.error ?? 'Could not cancel ticket.',
        };
      }

      await refreshSchedules();
      return { success: true, booking: data.booking };
    } catch {
      return { success: false, error: 'Network error while cancelling.' };
    }
  };

  const addBusAndSchedule = async (input: AddBusScheduleInput) => {
    try {
      const res = await fetch('/api/admin/buses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });
      const { ok, status, data } = await parseApiResponse<{
        schedule: Schedule;
      }>(res);

      if (status === 403 && data.code === 'USER_BLOCKED') {
        handleBlockedResponse(currentUser);
        return { success: false, error: 'Account blocked.' };
      }

      if (!ok || !data.schedule) {
        return {
          success: false,
          error: data.error ?? 'Could not save bus schedule.',
        };
      }

      await refreshSchedules();
      return { success: true, schedule: data.schedule };
    } catch {
      return { success: false, error: 'Network error while saving schedule.' };
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    try {
      const res = await fetch(`/api/admin/schedules/${scheduleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const { ok, status, data } = await parseApiResponse<{ success: boolean }>(
        res
      );

      if (status === 403 && data.code === 'USER_BLOCKED') {
        handleBlockedResponse(currentUser);
        return { success: false, error: 'Account blocked.' };
      }

      if (!ok) {
        return {
          success: false,
          error: data.error ?? 'Could not delete schedule.',
        };
      }

      await refreshSchedules();
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while deleting schedule.' };
    }
  };

  const value: AppStateContextValue = {
    currentUser,
    authLoading,
    lastBlockedUser,
    schedules,
    schedulesLoading,
    refreshUser,
    refreshSchedules,
    registerUser,
    loginUser,
    logoutUser,
    handleBlockedResponse,
    bookSeats,
    cancelBooking,
    addBusAndSchedule,
    deleteSchedule,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return ctx;
}
