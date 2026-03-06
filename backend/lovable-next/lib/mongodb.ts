import { MongoClient, ServerApiVersion, Db } from "mongodb";

const uri = process.env.MONGODB_URI as string;

if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

interface CachedConnection {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<MongoClient> | null;
}

const cached: CachedConnection = {
  client: null,
  db: null,
  promise: null,
};

declare global {
  var _mongoClient: CachedConnection | undefined;
}

export async function getClient(): Promise<MongoClient> {
  if (cached.client) {
    return cached.client;
  }

  if (!cached.promise) {
    cached.promise = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).connect();
  }

  cached.client = await cached.promise;
  return cached.client;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db("lovable");
}

export async function closeConnection(): Promise<void> {
  if (cached.client) {
    await cached.client.close();
    cached.client = null;
    cached.db = null;
    cached.promise = null;
  }
}

// For backward compatibility with existing code using default export
export default getClient();