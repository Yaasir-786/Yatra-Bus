# YatraBus — Bus Ticket Booking & Admin Management System

A full-stack intercity bus ticket booking platform and admin operations portal built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **MongoDB + Mongoose**, and **Vercel AI SDK (`@ai-sdk/google`)**.

## Features

- **User Portal:**
  - Search buses across 120+ Indian cities with autocomplete and date/fare/type/time-window filters.
  - Per-date seat inventory with interactive 2×2 seat map (`1A`–`nD`) and atomic MongoDB seat locking.
  - Instant E-Tickets, booking history (`/my-bookings`), and idempotent ticket cancellation.
  - Floating **AI Trip Assistant** (`/api/ai/chat`) with live MongoDB tool calling.
- **Authentication & Security:**
  - HTTP-only JWT session cookies (`jose`) + `bcryptjs` password hashing.
  - Live `user.status` (`active` / `blocked`) enforcement on every protected request.
- **Admin Panel (`/admin`):**
  - Dashboard KPIs (active future/today schedules, users, revenue) and **AI Operations Insights**.
  - Schedule generator: create concrete dated schedules across `1–90` days matching selected operating days (`Mon`–`Sun`), with automatic return trips and auto-calculated trip duration.
  - Protected schedule deletion (blocks deleting schedules with confirmed bookings unless `?force=true`).
  - User management (block/unblock users) and booking management.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env.local` and fill in your values:
   - `MONGODB_URI` — MongoDB connection string
   - `JWT_SECRET` — Random secret string (must be **32+ characters** in production)
   - `GOOGLE_GENERATIVE_AI_API_KEY` — Google Gemini API key
   - `GEMINI_MODEL` *(optional)* — Override default Gemini model (`gemini-3.8-flash`)

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Production build:**
   ```bash
   npm run build
   npm start
   ```

## MongoDB Atlas Notes

- Ensure your current IP address (or `0.0.0.0/0` for development) is allowed in **Atlas Network Access (IP Allowlist)**.
- If your local network or ISP blocks DNS SRV lookups (`querySrv ECONNREFUSED` / `ENOTFOUND` on `mongodb+srv://`), switch `MONGODB_URI` in `.env.local` to the **standard non-SRV connection string** (`mongodb://...`) from MongoDB Atlas ("Connect" -> "Drivers" -> older Node.js driver string).

## Creating the First Admin Account

There is no pre-seeded data or default admin account. To create your first administrator:

1. Register a normal user account in the app at `/register`.
2. Connect to your MongoDB database using `mongosh` or **MongoDB Compass** and promote that user:
   ```js
   db.users.updateOne(
     { email: "your@email.com" },
     { $set: { role: "admin" } }
   )
   ```
3. Log out and log back in to access `/admin`.
