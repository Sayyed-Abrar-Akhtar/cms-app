import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Next.js reuses modules across hot-reloads and serverless invocations, so we
 * cache the connection on the global object. Without this, dev mode would
 * open a new connection on every file save and you'd exhaust Atlas's free
 * tier connection limit fast.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cached;

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error(
      "Missing MONGODB_URI. Add it to .env.local — see .env.example (a free MongoDB Atlas M0 cluster works fine)."
    );
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
