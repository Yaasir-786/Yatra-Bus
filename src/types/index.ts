export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'blocked';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  bookingCount?: number;
}

export type BusType = 'AC' | 'Non-AC' | 'Sleeper';

export interface Bus {
  id: string;
  busName: string;
  busNumber: string;
  busType: BusType;
  totalSeats: number;
  amenities: string[];
}

export interface Schedule {
  id: string;
  busId: string;
  busName: string;
  busNumber: string;
  busType: BusType;
  origin: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  fare: number;
  totalSeats: number;
  bookedSeats: string[];
}

export type PassengerGender = 'Male' | 'Female' | 'Other';

export interface Passenger {
  name: string;
  age: number;
  gender: PassengerGender;
  seatNumber: string;
}

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  bookingRef: string;
  userId: string;
  userName: string;
  userEmail: string;
  scheduleId: string;
  busName: string;
  busNumber: string;
  origin: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime?: string;
  passengers: Passenger[];
  totalAmount: number;
  status: BookingStatus;
  bookedAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface AuthActionResult {
  success: boolean;
  error?: string;
  code?: string;
  user?: User;
  redirectTo?: string;
}

export interface BookingActionResult {
  success: boolean;
  error?: string;
  code?: string;
  booking?: Booking;
  redirectTo?: string;
}

export interface AddBusScheduleInput {
  busName: string;
  busNumber: string;
  busType: BusType;
  totalSeats: number;
  amenities: string[];
  origin: string;
  destination: string;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  fare: number;
  // Return trip fields
  createReturn?: boolean;
  returnDate?: string;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
}

export interface AdminStats {
  totalUsers: number;
  blockedUsers: number;
  activeSchedules: number;
  totalRevenue: number;
  recentBookings: Booking[];
}
