import { z } from 'zod';
import { ApiError } from './errors.js';

/** Parses `data` with a zod schema or throws a VALIDATION_FAILED ApiError. */
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(
      400,
      'VALIDATION_FAILED',
      'Request validation failed',
      result.error.issues.map((i) => ({
        path: i.path.join('.'),
        code: i.code,
        message: i.message,
      })),
    );
  }
  return result.data;
}

const emptyToNull = (v) => (v === '' || v === undefined ? null : v);

// Reusable field helpers. Empty strings from HTML forms become null.
export const optionalText = (max = 2000) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable()).optional();
export const requiredText = (max = 200) => z.string().trim().min(1).max(max);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
export const optionalDate = z.preprocess(emptyToNull, isoDate.nullable()).optional();
export const optionalNumber = (schema = z.number()) =>
  z
    .preprocess(
      (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
      schema.nullable(),
    )
    .optional();
export const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM');
export const idParam = z.coerce.number().int().positive();
