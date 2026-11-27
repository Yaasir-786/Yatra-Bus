// Seed reference types only — never imported in runtime pages, context, or API routes.
import { BusType } from '@/types';

export interface SeedBusDefinition {
  busName: string;
  busNumber: string;
  busType: BusType;
  totalSeats: number;
  amenities: string[];
}

export const DEFAULT_SEED_CITIES: string[] = [
  'Indore',
  'Bhopal',
  'Mumbai',
  'Pune',
  'Ahmedabad',
];

export const SEED_BUS_DEFINITIONS: SeedBusDefinition[] = [
  {
    busName: 'Malwa Express Travels',
    busNumber: 'MP-09-FA-4521',
    busType: 'AC',
    totalSeats: 32,
    amenities: ['AC', 'Wi-Fi', 'Charging Point', 'Water Bottle', 'Live Tracking'],
  },
  {
    busName: 'Narmada Cruiser',
    busNumber: 'MP-04-PA-7812',
    busType: 'Non-AC',
    totalSeats: 36,
    amenities: ['Reading Light', 'Luggage Space', 'First Aid'],
  },
  {
    busName: 'Deccan Queen Sleeper',
    busNumber: 'MH-12-TR-3309',
    busType: 'Sleeper',
    totalSeats: 24,
    amenities: ['AC Sleeper', 'Blanket', 'Pillow', 'Charging Point', 'Reading Light'],
  },
  {
    busName: 'Sabarmati Volvo',
    busNumber: 'GJ-01-BX-9044',
    busType: 'AC',
    totalSeats: 32,
    amenities: ['AC', 'Recliner Seats', 'Wi-Fi', 'Water Bottle', 'CCTV'],
  },
  {
    busName: 'Sahyadri Highway Express',
    busNumber: 'MH-14-CD-6150',
    busType: 'Sleeper',
    totalSeats: 28,
    amenities: ['Sleeper', 'Charging Point', 'CCTV', 'Live Tracking'],
  },
];
