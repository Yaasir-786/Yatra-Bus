import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import UserModel from '@/models/User';
import BusModel from '@/models/Bus';
import ScheduleModel from '@/models/Schedule';
import BookingModel from '@/models/Booking';

export async function POST() {
  try {
    await connectDB();

    const existingUsers = await UserModel.countDocuments();
    const existingBuses = await BusModel.countDocuments();
    const existingSchedules = await ScheduleModel.countDocuments();

    if (existingUsers > 0 && existingBuses > 0 && existingSchedules > 0) {
      return NextResponse.json({
        seeded: false,
        message: 'Database already contains seed data.',
      });
    }

    // Seed Users idempotently
    const [adminHash, userHash, blockedHash] = await Promise.all([
      bcrypt.hash('admin123', 10),
      bcrypt.hash('user123', 10),
      bcrypt.hash('blocked123', 10),
    ]);

    const seedUsers = [
      {
        name: 'Aarav Sharma',
        email: 'admin@bus.com',
        phone: '+91 98260 11001',
        password: adminHash,
        role: 'admin',
        status: 'active',
      },
      {
        name: 'Priya Patel',
        email: 'user@bus.com',
        phone: '+91 98260 22002',
        password: userHash,
        role: 'user',
        status: 'active',
      },
      {
        name: 'Kabir Mehta',
        email: 'blocked@bus.com',
        phone: '+91 98260 66006',
        password: blockedHash,
        role: 'user',
        status: 'blocked',
      },
      {
        name: 'Rohan Verma',
        email: 'rohan@bus.com',
        phone: '+91 98260 33003',
        password: userHash,
        role: 'user',
        status: 'active',
      },
      {
        name: 'Sneha Kulkarni',
        email: 'sneha@bus.com',
        phone: '+91 98260 44004',
        password: userHash,
        role: 'user',
        status: 'active',
      },
    ];

    for (const u of seedUsers) {
      await UserModel.updateOne(
        { email: u.email },
        { $setOnInsert: u },
        { upsert: true }
      );
    }

    const activeUser = await UserModel.findOne({ email: 'user@bus.com' });
    const rohanUser = await UserModel.findOne({ email: 'rohan@bus.com' });
    const snehaUser = await UserModel.findOne({ email: 'sneha@bus.com' });

    // Seed Buses idempotently
    const seedBuses = [
      {
        busName: 'Malwa Express Travels',
        busNumber: 'MP-09-FA-4521',
        busType: 'AC' as const,
        totalSeats: 32,
        amenities: ['AC', 'Wi-Fi', 'Charging Point', 'Water Bottle', 'Live Tracking'],
      },
      {
        busName: 'Narmada Cruiser',
        busNumber: 'MP-04-PA-7812',
        busType: 'Non-AC' as const,
        totalSeats: 36,
        amenities: ['Reading Light', 'Luggage Space', 'First Aid'],
      },
      {
        busName: 'Deccan Queen Sleeper',
        busNumber: 'MH-12-TR-3309',
        busType: 'Sleeper' as const,
        totalSeats: 24,
        amenities: ['AC Sleeper', 'Blanket', 'Pillow', 'Charging Point', 'Reading Light'],
      },
      {
        busName: 'Sabarmati Volvo',
        busNumber: 'GJ-01-BX-9044',
        busType: 'AC' as const,
        totalSeats: 32,
        amenities: ['AC', 'Recliner Seats', 'Wi-Fi', 'Water Bottle', 'CCTV'],
      },
      {
        busName: 'Sahyadri Highway Express',
        busNumber: 'MH-14-CD-6150',
        busType: 'Sleeper' as const,
        totalSeats: 28,
        amenities: ['Sleeper', 'Charging Point', 'CCTV', 'Live Tracking'],
      },
    ];

    for (const b of seedBuses) {
      await BusModel.updateOne(
        { busNumber: b.busNumber },
        { $setOnInsert: b },
        { upsert: true }
      );
    }

    const busDocs = await BusModel.find();
    const busMap = new Map(busDocs.map((b) => [b.busNumber, b]));

    let createdSchedules: Awaited<ReturnType<typeof ScheduleModel.find>> = [];
    if (existingSchedules === 0) {
      const b1 = busMap.get('MP-09-FA-4521')!;
      const b2 = busMap.get('MP-04-PA-7812')!;
      const b3 = busMap.get('MH-12-TR-3309')!;
      const b4 = busMap.get('GJ-01-BX-9044')!;
      const b5 = busMap.get('MH-14-CD-6150')!;

      const seedSchedules = [
        {
          busId: b1._id,
          busName: b1.busName,
          busNumber: b1.busNumber,
          busType: b1.busType,
          totalSeats: b1.totalSeats,
          origin: 'Indore',
          destination: 'Bhopal',
          travelDate: '2026-11-27',
          departureTime: '07:00',
          arrivalTime: '10:45',
          duration: '3h 45m',
          fare: 480,
          bookedSeats: ['1A', '1B', '2C', '4D'],
        },
        {
          busId: b2._id,
          busName: b2.busName,
          busNumber: b2.busNumber,
          busType: b2.busType,
          totalSeats: b2.totalSeats,
          origin: 'Indore',
          destination: 'Bhopal',
          travelDate: '2026-11-27',
          departureTime: '14:30',
          arrivalTime: '18:30',
          duration: '4h 00m',
          fare: 320,
          bookedSeats: ['2A', '2B', '5C'],
        },
        {
          busId: b3._id,
          busName: b3.busName,
          busNumber: b3.busNumber,
          busType: b3.busType,
          totalSeats: b3.totalSeats,
          origin: 'Indore',
          destination: 'Mumbai',
          travelDate: '2026-11-27',
          departureTime: '21:00',
          arrivalTime: '07:30',
          duration: '10h 30m',
          fare: 1250,
          bookedSeats: ['1A', '2B', '3A', '3B', '4C'],
        },
        {
          busId: b4._id,
          busName: b4.busName,
          busNumber: b4.busNumber,
          busType: b4.busType,
          totalSeats: b4.totalSeats,
          origin: 'Mumbai',
          destination: 'Pune',
          travelDate: '2026-11-27',
          departureTime: '08:15',
          arrivalTime: '11:45',
          duration: '3h 30m',
          fare: 550,
          bookedSeats: ['1C', '1D', '3A'],
        },
        {
          busId: b5._id,
          busName: b5.busName,
          busNumber: b5.busNumber,
          busType: b5.busType,
          totalSeats: b5.totalSeats,
          origin: 'Pune',
          destination: 'Mumbai',
          travelDate: '2026-11-27',
          departureTime: '22:30',
          arrivalTime: '02:30',
          duration: '4h 00m',
          fare: 680,
          bookedSeats: ['2C', '2D'],
        },
        {
          busId: b4._id,
          busName: b4.busName,
          busNumber: b4.busNumber,
          busType: b4.busType,
          totalSeats: b4.totalSeats,
          origin: 'Indore',
          destination: 'Ahmedabad',
          travelDate: '2026-11-27',
          departureTime: '20:15',
          arrivalTime: '05:00',
          duration: '8h 45m',
          fare: 920,
          bookedSeats: ['1A', '2A', '6B'],
        },
        {
          busId: b1._id,
          busName: b1.busName,
          busNumber: b1.busNumber,
          busType: b1.busType,
          totalSeats: b1.totalSeats,
          origin: 'Bhopal',
          destination: 'Indore',
          travelDate: '2026-11-28',
          departureTime: '09:30',
          arrivalTime: '13:15',
          duration: '3h 45m',
          fare: 490,
          bookedSeats: ['1B', '3D'],
        },
        {
          busId: b3._id,
          busName: b3.busName,
          busNumber: b3.busNumber,
          busType: b3.busType,
          totalSeats: b3.totalSeats,
          origin: 'Ahmedabad',
          destination: 'Mumbai',
          travelDate: '2026-11-28',
          departureTime: '21:45',
          arrivalTime: '06:30',
          duration: '8h 45m',
          fare: 1150,
          bookedSeats: ['1C', '2D', '4A'],
        },
      ];

      createdSchedules = await ScheduleModel.insertMany(seedSchedules);
    } else {
      createdSchedules = await ScheduleModel.find();
    }

    const existingBookings = await BookingModel.countDocuments();
    if (
      existingBookings === 0 &&
      activeUser &&
      rohanUser &&
      snehaUser &&
      createdSchedules.length >= 4
    ) {
      const s1 = createdSchedules[0];
      const s2 = createdSchedules[1];
      const s3 = createdSchedules[2];
      const s4 = createdSchedules[3];

      await BookingModel.insertMany([
        {
          bookingRef: 'YTB-2026-1042',
          userId: activeUser._id,
          userName: activeUser.name,
          userEmail: activeUser.email,
          scheduleId: s1._id,
          busName: s1.busName,
          busNumber: s1.busNumber,
          origin: s1.origin,
          destination: s1.destination,
          travelDate: s1.travelDate,
          departureTime: s1.departureTime,
          arrivalTime: s1.arrivalTime,
          passengers: [
            { name: 'Priya Patel', age: 27, gender: 'Female', seatNumber: '1A' },
            { name: 'Ananya Patel', age: 24, gender: 'Female', seatNumber: '1B' },
          ],
          totalAmount: 960,
          status: 'confirmed',
        },
        {
          bookingRef: 'YTB-2026-1089',
          userId: rohanUser._id,
          userName: rohanUser.name,
          userEmail: rohanUser.email,
          scheduleId: s3._id,
          busName: s3.busName,
          busNumber: s3.busNumber,
          origin: s3.origin,
          destination: s3.destination,
          travelDate: s3.travelDate,
          departureTime: s3.departureTime,
          arrivalTime: s3.arrivalTime,
          passengers: [
            { name: 'Rohan Verma', age: 31, gender: 'Male', seatNumber: '3A' },
            { name: 'Meera Verma', age: 29, gender: 'Female', seatNumber: '3B' },
          ],
          totalAmount: 2500,
          status: 'confirmed',
        },
        {
          bookingRef: 'YTB-2026-1120',
          userId: snehaUser._id,
          userName: snehaUser.name,
          userEmail: snehaUser.email,
          scheduleId: s4._id,
          busName: s4.busName,
          busNumber: s4.busNumber,
          origin: s4.origin,
          destination: s4.destination,
          travelDate: s4.travelDate,
          departureTime: s4.departureTime,
          arrivalTime: s4.arrivalTime,
          passengers: [
            { name: 'Sneha Kulkarni', age: 26, gender: 'Female', seatNumber: '1C' },
            { name: 'Aditya Kulkarni', age: 28, gender: 'Male', seatNumber: '1D' },
          ],
          totalAmount: 1100,
          status: 'confirmed',
        },
        {
          bookingRef: 'YTB-2026-1155',
          userId: activeUser._id,
          userName: activeUser.name,
          userEmail: activeUser.email,
          scheduleId: s2._id,
          busName: s2.busName,
          busNumber: s2.busNumber,
          origin: s2.origin,
          destination: s2.destination,
          travelDate: s2.travelDate,
          departureTime: s2.departureTime,
          arrivalTime: s2.arrivalTime,
          passengers: [
            { name: 'Priya Patel', age: 27, gender: 'Female', seatNumber: '7A' },
          ],
          totalAmount: 320,
          status: 'cancelled',
        },
      ]);
    }

    return NextResponse.json(
      {
        seeded: true,
        message: 'Database seeded successfully.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Seed error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to seed database.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
