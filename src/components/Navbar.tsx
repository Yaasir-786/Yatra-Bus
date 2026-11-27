"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bus,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  Ticket,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { useAppState } from "@/context/AppStateContext";

export default function Navbar() {
  const pathname = usePathname();
  const { currentUser, authLoading, logoutUser } = useAppState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/buses", label: "Search Buses" },
    { href: "/my-bookings", label: "My Bookings" },
    ...(currentUser?.role === "admin"
      ? [{ href: "/admin", label: "Admin" }]
      : []),
  ];

  const isActiveLink = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-slate-900 transition-opacity hover:opacity-90">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Bus className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-slate-900">
                YatraBus
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-indigo-600">
                Express Booking
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const active = isActiveLink(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Controls */}
        <div className="hidden items-center gap-3 md:flex">
          {authLoading ? (
            <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking session...
            </div>
          ) : currentUser ? (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <div className="text-right leading-tight">
                <div className="text-sm font-semibold text-slate-800">
                  {currentUser.name}
                </div>
                <div className="flex items-center justify-end gap-1.5 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${
                      currentUser.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                    {currentUser.role === "admin" ? (
                      <ShieldCheck className="h-3 w-3" />
                    ) : (
                      <Ticket className="h-3 w-3" />
                    )}
                    {currentUser.role === "admin" ? "Admin" : "User"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${
                      currentUser.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}>
                    {currentUser.status === "active" ? (
                      <UserCheck className="h-3 w-3" />
                    ) : (
                      <UserX className="h-3 w-3" />
                    )}
                    {currentUser.status === "active" ? "Active" : "Blocked"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void logoutUser()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900">
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                <LogIn className="h-3.5 w-3.5" />
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
                <UserPlus className="h-3.5 w-3.5" />
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Toggle navigation menu">
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const active = isActiveLink(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}>
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            {authLoading ? (
              <div className="text-xs text-slate-500">Checking session...</div>
            ) : currentUser ? (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {currentUser.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {currentUser.role.toUpperCase()} •{" "}
                    {currentUser.status.toUpperCase()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void logoutUser();
                    setMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-xs font-semibold text-slate-700">
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 rounded-lg bg-indigo-600 py-2 text-center text-xs font-semibold text-white">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
