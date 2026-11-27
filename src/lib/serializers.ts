import { Booking, Bus, Schedule, User } from '@/types';

export function serializeUser(
  doc: {
    _id: { toString(): string };
    name: string;
    email: string;
    phone: string;
    role: 'user' | 'admin';
    status: 'active' | 'blocked';
    createdAt?: Date | string;
  },
  bookingCount?: number
): User {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    role: doc.role,
    status: doc.status,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
    ...(typeof bookingCount === 'number' ? { bookingCount } : {}),
  };
}

export function serializeBus(doc: {
  _id: { toString(): string };
  busName: string;
  busNumber: string;
  busType: 'AC' | 'Non-AC' | 'Sleeper';
  totalSeats: number;
  amenities?: string[];
}): Bus {
  return {
    id: doc._id.toString(),
    busName: doc.busName,
    busNumber: doc.busNumber,
    busType: doc.busType,
    totalSeats: doc.totalSeats,
    amenities: doc.amenities ?? [],
  };
}

export function serializeSchedule(doc: {
  _id: { toString(): string };
  busId: { toString(): string };
  busName: string;
  busNumber: string;
  busType: 'AC' | 'Non-AC' | 'Sleeper';
  origin: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  duration?: string;
  fare: number;
  totalSeats: number;
  bookedSeats?: string[];
}): Schedule {
  return {
    id: doc._id.toString(),
    busId: doc.busId.toString(),
    busName: doc.busName,
    busNumber: doc.busNumber,
    busType: doc.busType,
    origin: doc.origin,
    destination: doc.destination,
    travelDate: doc.travelDate,
    departureTime: doc.departureTime,
    arrivalTime: doc.arrivalTime,
    duration: doc.duration ?? '4h 00m',
    fare: doc.fare,
    totalSeats: doc.totalSeats,
    bookedSeats: doc.bookedSeats ?? [],
  };
}

export function serializeBooking(doc: {
  _id: { toString(): string };
  bookingRef: string;
  userId: { toString(): string };
  userName: string;
  userEmail: string;
  scheduleId: { toString(): string };
  busName: string;
  busNumber: string;
  origin: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime?: string;
  passengers: Booking['passengers'];
  totalAmount: number;
  status: 'confirmed' | 'cancelled';
  createdAt?: Date | string;
}): Booking {
  return {
    id: doc._id.toString(),
    bookingRef: doc.bookingRef,
    userId: doc.userId.toString(),
    userName: doc.userName,
    userEmail: doc.userEmail,
    scheduleId: doc.scheduleId.toString(),
    busName: doc.busName,
    busNumber: doc.busNumber,
    origin: doc.origin,
    destination: doc.destination,
    travelDate: doc.travelDate,
    departureTime: doc.departureTime,
    arrivalTime: doc.arrivalTime,
    passengers: doc.passengers,
    totalAmount: doc.totalAmount,
    status: doc.status,
    bookedAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
  };
}
