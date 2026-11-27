'use client';

import React from 'react';
import { Disc } from 'lucide-react';
import { BusType } from '@/types';
import { SEAT_COLUMNS } from '@/lib/seats';

interface SeatMapProps {
  totalSeats: number;
  bookedSeats: string[];
  selectedSeats: string[];
  busType?: BusType;
  onToggleSeat: (seatNumber: string) => void;
}

export default function SeatMap({
  totalSeats,
  bookedSeats,
  selectedSeats,
  busType = 'AC',
  onToggleSeat,
}: SeatMapProps) {
  const rowCount = Math.ceil(totalSeats / 4);
  const bookedSet = new Set(bookedSeats);
  const selectedSet = new Set(selectedSeats);

  const rows = Array.from({ length: rowCount }, (_, rowIdx) => {
    const rowNum = rowIdx + 1;
    return SEAT_COLUMNS.map((col, colIdx) => {
      const seatIndex = rowIdx * 4 + colIdx;
      if (seatIndex >= totalSeats) return null;
      return `${rowNum}${col}`;
    });
  });

  const renderSeatButton = (seatLabel: string | null, key: string) => {
    if (!seatLabel) {
      return <div key={key} className="h-11 w-12" />;
    }

    const isBooked = bookedSet.has(seatLabel);
    const isSelected = selectedSet.has(seatLabel);
    const isSleeper = busType === 'Sleeper';

    return (
      <button
        key={seatLabel}
        type="button"
        disabled={isBooked}
        onClick={() => onToggleSeat(seatLabel)}
        aria-label={`Seat ${seatLabel} ${
          isBooked ? 'booked' : isSelected ? 'selected' : 'available'
        }`}
        className={`relative flex ${
          isSleeper ? 'h-14 w-12' : 'h-11 w-12'
        } flex-col items-center justify-center rounded-lg border text-xs font-semibold transition-all ${
          isBooked
            ? 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400'
            : isSelected
            ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
            : 'border-emerald-300 bg-emerald-50/60 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-100'
        }`}
      >
        <span>{seatLabel}</span>
        {isSleeper && (
          <span
            className={`mt-0.5 h-1 w-5 rounded-full ${
              isBooked
                ? 'bg-slate-300'
                : isSelected
                ? 'bg-indigo-200'
                : 'bg-emerald-400'
            }`}
          />
        )}
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Legend */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded border border-emerald-400 bg-emerald-50" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded border border-indigo-600 bg-indigo-600" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded border border-slate-300 bg-slate-200" />
            <span>Booked</span>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          2×2 {busType} Layout
        </span>
      </div>

      {/* Bus Deck Frame */}
      <div className="mx-auto max-w-xs rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-4">
        {/* Driver Cabin */}
        <div className="mb-4 flex items-center justify-between border-b border-dashed border-slate-300 pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Front Entry
          </span>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-200/80 px-2.5 py-1 text-xs font-medium text-slate-600">
            <Disc className="h-4 w-4 text-slate-700" />
            <span>Driver</span>
          </div>
        </div>

        {/* 2x2 Seat Grid */}
        <div className="space-y-2.5">
          {rows.map((rowSeats, rowIndex) => (
            <div key={rowIndex} className="flex items-center justify-between gap-2">
              {/* Left Pair (A, B) */}
              <div className="flex gap-2">
                {renderSeatButton(rowSeats[0], `empty-${rowIndex}-0`)}
                {renderSeatButton(rowSeats[1], `empty-${rowIndex}-1`)}
              </div>

              {/* Center Aisle */}
              <div className="w-6 text-center text-[10px] font-medium text-slate-300">
                {rowIndex + 1}
              </div>

              {/* Right Pair (C, D) */}
              <div className="flex gap-2">
                {renderSeatButton(rowSeats[2], `empty-${rowIndex}-2`)}
                {renderSeatButton(rowSeats[3], `empty-${rowIndex}-3`)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
