# AGENTS.md — Bus Ticket Booking & Admin Management System

## Project Overview

A full-stack Bus Ticket Booking web application built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

- **User Portal:** Search buses, view interactive seat maps, book/cancel tickets, and use an AI Trip Assistant.
- **Admin Panel (`/admin`):** Manage buses/schedules, inspect/cancel tickets, and **block/unblock users**.

## Tech Stack & Conventions

- **Framework:** Next.js 15+ (App Router, `src/` directory)
- **Language:** TypeScript (strict mode; all shared interfaces live in `src/types/index.ts`)
- **Styling:** Tailwind CSS only (clean, minimal utility classes; no external heavy UI component libraries unless specified; use `lucide-react` for icons)
- **AI Layer (Phase 2):** Vercel AI SDK (`ai`) via `/api/ai/chat`
- **Database (Phase 3):** MongoDB with Mongoose (`src/lib/mongodb.ts`, `src/models/`)

## Current Build Phase

- **ACTIVE PHASE: Complete MongoDB + Auth + AI Integration (No Mock Data Fallback)**
- **STRICT RULES:**
  1. **Zero Mock Fallback:** Do NOT use `src/data/mockData.ts` anywhere in runtime pages, context, or API routes. Every user, bus, schedule, and booking must come from MongoDB via Mongoose (`src/lib/mongodb.ts` and `src/models/*`).
  2. **Environment Variables:** Use only `MONGODB_URI`, `GOOGLE_GENERATIVE_AI_API_KEY`, and `JWT_SECRET` from environment variables.
  3. **Persistent Auth & Live Block:** Login, register, logout, and page-refresh session restore must hit `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, and `/api/auth/me` backed by MongoDB and HTTP-only JWT cookies. Always verify latest `user.status` from MongoDB (`active` vs `blocked`).

## Directory Structure

```text
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/register/page.tsx
│   ├── (auth)/blocked/page.tsx
│   ├── (user)/page.tsx                    # Search hero + popular routes
│   ├── (user)/buses/page.tsx              # Filtered search results
│   ├── (user)/book/[scheduleId]/page.tsx  # Interactive seat map + passenger checkout
│   ├── (user)/my-bookings/page.tsx        # User tickets + cancel action
│   └── admin/
│       ├── layout.tsx                     # Admin sidebar + view switcher
│       ├── page.tsx                       # Dashboard metrics & recent activity
│       ├── users/page.tsx                 # User table + Block/Unblock toggle
│       ├── buses/page.tsx                 # Bus & Schedule CRUD
│       └── bookings/page.tsx              # All tickets + Admin cancel action
├── components/
│   ├── Navbar.tsx                         # User top nav + simulated role/user switcher
│   ├── SeatMap.tsx                        # Reusable 2x2 bus seat selector
│   ├── AiChatDrawer.tsx                   # Floating AI assistant UI shell (Phase 1 placeholder, wired in Phase 2)
│   └── TicketModal.tsx                    # Printable/viewable E-Ticket modal
├── context/
│   └── AppStateContext.tsx                # Global mock state (users, buses, schedules, bookings, currentUser)
├── data/
│   └── mockData.ts                        # Realistic Indian routes (e.g., Indore, Bhopal, Mumbai, Pune), buses, users
└── types/
    └── index.ts                           # Shared TypeScript interfaces (User, Bus, Schedule, Booking)
```
