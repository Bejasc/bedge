import mongoose from 'mongoose';

export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

export function disconnectDatabase(): Promise<void> {
  return mongoose.disconnect();
}
