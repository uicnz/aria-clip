import pkg from '../../package.json' with { type: 'json' };
import { z } from 'zod';

const VersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

export const VERSION = VersionSchema.parse(pkg.version);
export const PROTOCOL = '1' as const;
