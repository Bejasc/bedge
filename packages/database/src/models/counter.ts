import mongoose, { Schema } from 'mongoose';

interface CounterDocument {
  key: string;
  seq: number;
}

const CounterSchemaMongoose = new Schema<CounterDocument>({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

export const CounterModel = mongoose.model<CounterDocument>('Counter', CounterSchemaMongoose);

export async function nextSequence(key: string): Promise<number> {
  const counter = await CounterModel.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return counter.seq;
}
