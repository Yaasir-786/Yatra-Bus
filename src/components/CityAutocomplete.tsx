'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import INDIAN_CITIES from '@/data/indianCities';

interface CityAutocompleteProps {
  id?: string;
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  iconColor?: string;
  className?: string;
  label?: string;
  allowAny?: boolean; // allow "Any" / empty value option
}

export default function CityAutocomplete({
  id,
  value,
  onChange,
  placeholder = 'Search city...',
  iconColor = 'text-indigo-600',
  className = '',
  label,
  allowAny = false,
}: CityAutocompleteProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlighted, setHighlighted] = useState(-1);

  // Keep local query in sync when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim().length === 0
    ? INDIAN_CITIES.slice(0, 8)
    : INDIAN_CITIES.filter((city) =>
        city.toLowerCase().includes(query.trim().toLowerCase())
      ).slice(0, 10);

  const handleSelect = (city: string) => {
    setQuery(city);
    onChange(city);
    setOpen(false);
    setHighlighted(-1);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setOpen(true);
    setHighlighted(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const opts = allowAny ? ['', ...filtered] : filtered;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, opts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0 && opts[highlighted] !== undefined) {
        handleSelect(opts[highlighted]);
      } else if (filtered.length > 0) {
        handleSelect(filtered[0]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <MapPin
          className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${iconColor}`}
        />
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
            setHighlighted(-1);
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-8 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${inputId}-list`}
        />
        {query && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-700"
            aria-label="Clear city"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (filtered.length > 0 || allowAny) && (
        <ul
          id={`${inputId}-list`}
          ref={listRef}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {allowAny && (
            <li
              role="option"
              aria-selected={value === ''}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect('');
              }}
              className={`cursor-pointer px-4 py-2.5 text-sm text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 ${
                highlighted === 0 ? 'bg-indigo-50 text-indigo-700' : ''
              }`}
            >
              Any city
            </li>
          )}
          {filtered.map((city, idx) => {
            const hIdx = allowAny ? idx + 1 : idx;
            return (
              <li
                key={city}
                role="option"
                aria-selected={city === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(city);
                }}
                className={`cursor-pointer px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 ${
                  highlighted === hIdx
                    ? 'bg-indigo-50 text-indigo-700'
                    : city === value
                    ? 'bg-indigo-50/50 font-semibold text-indigo-700'
                    : ''
                }`}
              >
                {city}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
