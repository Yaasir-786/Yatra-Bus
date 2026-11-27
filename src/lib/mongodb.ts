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

function isSrvDnsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('querySrv') ||
    message.includes('ENOTFOUND') ||
    message.includes('ECONNREFUSED')
  );
}

async function connectOnce(mongoUri: string): Promise<typeof mongoose> {
  return mongoose.connect(mongoUri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is not defined. Please configure it in .env.local.'
    );
  }

  if (!cached.promise) {
    cached.promise = connectOnce(mongoUri).catch(async (firstError) => {
      if (mongoUri.startsWith('mongodb+srv://') && isSrvDnsError(firstError)) {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        return connectOnce(mongoUri);
      }
      throw firstError;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;

    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes('querySrv') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      message.includes('getaddrinfo') ||
      message.includes('Server selection failed') ||
      message.includes('timed out')
    ) {
      throw new Error(
        `MongoDB connection failed: ${message}. ` +
          'If using MongoDB Atlas (mongodb+srv://), check your IP allowlist or use a direct ' +
          'connection string (mongodb://...) if DNS blocks SRV lookups.'
      );
    }

    throw error;
  }

  return cached.conn;
}
