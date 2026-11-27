import dns from 'node:dns';
import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is not defined. Please configure it in .env.local.'
    );
  }

  // Use public DNS resolvers to avoid local DNS resolution issues with MongoDB Atlas SRV records.
  if (mongoUri.startsWith('mongodb+srv://')) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(mongoUri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;

    const message = error instanceof Error ? error.message : String(error);

    // Provide a clear, actionable error for Atlas SRV DNS resolution failures.
    if (
      message.includes('querySrv') ||
      message.includes('ECONNREFUSED') ||
      message.includes('getaddrinfo') ||
      message.includes('Server selection failed')
    ) {
      throw new Error(
        `MongoDB connection failed: ${message}. ` +
          'If using MongoDB Atlas (mongodb+srv://), your network may be blocking ' +
          'outbound DNS (port 53) or SRV record resolution. Try using a direct ' +
          'connection string (mongodb://...) from your Atlas cluster connection ' +
          'string instead, or ensure DNS lookups are allowed in your network.'
      );
    }

    throw error;
  }

  return cached.conn;
}
