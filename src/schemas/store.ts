import { z } from 'zod';

export const StoreSchema = z.record(z.string(), z.json());
export const ChunksSchema = z.array(z.string());
export const IdsSchema = z.array(z.string().min(1));

export type Store = z.infer<typeof StoreSchema>;
