import { z } from 'zod';
import {
  optionalText,
  requiredText,
  isoDate,
  optionalDate,
  optionalNumber,
  timeOfDay,
} from '../lib/validate.js';

export const SPECIES = [
  'dog',
  'cat',
  'rabbit',
  'rodent',
  'bird',
  'fish',
  'reptile',
  'horse',
  'other',
];

export const petSchema = z.object({
  name: requiredText(100),
  species: z.enum(SPECIES).default('other'),
  breed: optionalText(100),
  sex: z
    .preprocess((v) => (v === '' ? null : v), z.enum(['male', 'female', 'unknown']).nullable())
    .optional(),
  neutered: z.boolean().optional(),
  birth_date: optionalDate,
  color: optionalText(100),
  microchip: optionalText(50),
  notes: optionalText(5000),
  archived: z.boolean().optional(),
});

export const healthSchema = z.object({
  date: isoDate,
  type: z.enum(['weight', 'vet_visit', 'vaccination', 'observation', 'other']),
  title: optionalText(200),
  weight_kg: optionalNumber(z.number().positive().max(5000)),
  notes: optionalText(5000),
});

const times = z.array(timeOfDay).max(12).default([]);

export const medicationSchema = z.object({
  catalog_id: optionalNumber(z.number().int().positive()),
  name: requiredText(200),
  dose: optionalNumber(z.number().positive().max(100000)),
  unit: optionalText(30),
  times,
  interval_days: z.coerce.number().int().min(1).max(365).default(1),
  start_date: isoDate,
  end_date: optionalDate,
  stock: optionalNumber(z.number().min(0).max(1000000)),
  low_stock_threshold: optionalNumber(z.number().min(0).max(1000000)),
  reminders_enabled: z.boolean().default(true),
  notes: optionalText(5000),
});

export const doseSchema = z.object({
  given_at: z.string().datetime({ offset: true }).optional(),
  amount: optionalNumber(z.number().positive().max(100000)),
  notes: optionalText(1000),
});

export const appointmentSchema = z.object({
  title: requiredText(200),
  starts_at: z.string().datetime({ offset: true }),
  location: optionalText(300),
  notes: optionalText(5000),
  remind_minutes_before: optionalNumber(z.number().int().min(0).max(20160)),
  done: z.boolean().optional(),
});

export const feedingSchema = z.object({
  food_id: optionalNumber(z.number().int().positive()),
  food_name: requiredText(200),
  amount: optionalNumber(z.number().positive().max(100000)),
  unit: optionalText(30),
  times,
  notes: optionalText(2000),
});

export const preventionSchema = z.object({
  type: z.enum(['deworming', 'flea_tick', 'vaccination', 'dental', 'grooming', 'other']),
  product: optionalText(200),
  last_date: optionalDate,
  interval_days: optionalNumber(z.number().int().min(1).max(3650)),
  notes: optionalText(2000),
});

export const illnessSchema = z.object({
  title: requiredText(200),
  status: z.enum(['active', 'chronic', 'resolved']).default('active'),
  started_on: isoDate,
  ended_on: optionalDate,
  diagnosis: optionalText(2000),
  notes: optionalText(5000),
});

export const illnessEntrySchema = z.object({
  date: isoDate,
  severity: optionalNumber(z.number().int().min(1).max(5)),
  temperature_c: optionalNumber(z.number().min(20).max(50)),
  symptoms: optionalText(5000),
  treatment: optionalText(5000),
  notes: optionalText(5000),
});

export const foodSchema = z.object({
  name: requiredText(200),
  brand: optionalText(200),
  kcal_per_100g: optionalNumber(z.number().min(0).max(10000)),
  notes: optionalText(2000),
});

export const catalogMedicationSchema = z.object({
  name: requiredText(200),
  active_ingredient: optionalText(200),
  default_dose: optionalNumber(z.number().positive().max(100000)),
  unit: optionalText(30),
  notes: optionalText(2000),
});
