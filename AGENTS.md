# AGENTS.md — Bus Ticket Booking & Admin Management System

## Project Overview

A full-stack Bus Ticket Booking web application built with **Next.js 15 (App Router)**, **TypeScript**, and **Tailwind CSS v4**.

- **User Portal:** Search buses, view interactive seat maps, book/cancel tickets, and use an AI Trip Assistant.
- **Admin Panel (`/admin`):** Manage buses/schedules, inspect/cancel tickets, and **block/unblock users**.

## Tech Stack & Conventions

- **Framework:** Next.js 15+ (App Router, `src/` directory)
- **Language:** TypeScript (strict mode; all shared interfaces live in `src/types/index.ts`)
- **Styling:** Tailwind CSS only (clean, minimal utility classes; no external heavy UI component libraries unless specified; use `lucide-react` for icons)
- **AI Layer:** Vercel AI SDK (`ai` v7, `@ai-sdk/google`, `@ai-sdk/react`) via `/api/ai/chat` and `/api/ai/admin-insights`
- **Database:** MongoDB with Mongoose (`src/lib/mongodb.ts`, `src/models/*`)

## Strict Architecture Rules

1. **Zero Mock Fallback:** All users, buses, schedules, and bookings must come exclusively from MongoDB via Mongoose (`src/lib/mongodb.ts` and `src/models/*`). Never include mock data, fallback corridors, or seed routes.
2. **Environment Variables:** Use `MONGODB_URI`, `GOOGLE_GENERATIVE_AI_API_KEY`, `JWT_SECRET` (32+ chars required in production), and optional `GEMINI_MODEL`.
3. **Persistent Auth & Live Block:** Login, register, logout, and session restore hit `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, and `/api/auth/me` backed by MongoDB and HTTP-only JWT cookies. Always verify latest `user.status` from MongoDB (`active` vs `blocked`).
4. **Per-Date Schedules & Seat Inventory:**
   - Every schedule created by admin (`POST /api/admin/buses`) generates concrete dated `Schedule` documents (`travelDate: YYYY-MM-DD`) for each date in `[startDate, startDate + daysAhead)` matching `operatingDays`, with a unique index on `{ busId, origin, destination, travelDate, departureTime }`.
   - Seat labels (`1A`..`nD`) are defined in one place: `src/lib/seats.ts` (`buildAllSeatLabels`), shared by `SeatMap.tsx`, `POST /api/bookings`, and `/api/ai/chat`.
   - Schedule search filters are built in one place: `src/lib/schedule-query.ts` (`buildScheduleQuery`), shared by `GET /api/schedules` and `/api/ai/chat` `searchBusesTool` (escaping all regex inputs).
5. **Pan-India Cities Dataset:** Search inputs and admin route selectors use `src/data/indianCities.ts` with `CityAutocomplete.tsx`.
6. **Auto Return-Trip Schedule:** When an admin creates schedules (`POST /api/admin/buses`) with "Also create return trip" enabled (default `true`), the backend generates the reverse dated schedules (`destination -> origin`) automatically.
7. **AI Model & Chat Stability:** `/api/ai/chat` and `/api/ai/admin-insights` use `@ai-sdk/google` with `getGeminiModelName()` (`GEMINI_MODEL` env or default Flash model), `convertToModelMessages`, `stepCountIs(5)`, a 25s abort timeout, and clean error mapping via `src/lib/ai-error.ts`.
8. **Performance & Instant Navigation:**
   - MongoDB indexes on `Schedule` (`{ origin: 1, destination: 1, travelDate: 1 }` and unique `{ busId, origin, destination, travelDate, departureTime }`).
   - Do not block the public app shell (`/`, `/buses`) on auth checks; fetch `/api/auth/me` non-blockingly.

## Directory Structure

```text
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/register/page.tsx
│   ├── (auth)/blocked/page.tsx
│   ├── (user)/page.tsx                    # Server-rendered initial schedules + HomeClient
│   ├── (user)/buses/page.tsx              # Filtered search results
│   ├── (user)/book/[scheduleId]/page.tsx  # Interactive seat map + passenger checkout
│   ├── (user)/my-bookings/page.tsx        # User tickets + cancel action
│   ├── admin/
│   │   ├── layout.tsx                     # Admin sidebar + role guard
│   │   ├── page.tsx                       # Dashboard metrics + AI insights
│   │   ├── users/page.tsx                 # User table + Block/Unblock toggle
│   │   ├── buses/page.tsx                 # Bus & Schedule generator + delete guard
│   │   └── bookings/page.tsx              # All tickets + Admin cancel action
│   └── api/                               # Auth, Schedules, Bookings, Admin, AI routes
├── components/
│   ├── Navbar.tsx
│   ├── HomeClient.tsx
│   ├── CityAutocomplete.tsx
│   ├── SeatMap.tsx
│   ├── AiChatDrawer.tsx
│   └── TicketModal.tsx
├── context/
│   └── AppStateContext.tsx                # Auth & schedule client state backed by APIs
├── data/
│   └── indianCities.ts                    # 120+ Indian cities for autocomplete
├── lib/
│   ├── mongodb.ts                         # Cached Mongoose connection with SRV fallback
│   ├── auth-guard.ts                      # JWT cookie auth + Mongoose error mapping
│   ├── ai-error.ts                        # Gemini model config & 401/404/429 mapping
│   ├── date-ist.ts                        # Asia/Kolkata date/time helpers
│   ├── schedule-query.ts                  # Shared MongoDB schedule filter builder
│   ├── seats.ts                           # Single source of truth for 2x2 seat labels
│   ├── serializers.ts
│   └── client-api.ts
├── models/                                # Mongoose schemas (User, Bus, Schedule, Booking)
└── types/
    └── index.ts                           # Shared TypeScript interfaces
```
