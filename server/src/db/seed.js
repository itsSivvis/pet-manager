// Optional demo data. Everything here is fictional. No user accounts are
// created: register the first account in the UI (it becomes the admin).
// Pets go into the given household, by default the oldest one (created here
// if the instance has none yet; the first account then adopts it).
import { withTransaction } from './pool.js';
import { addDays } from '../services/reminder-schedule.js';

const today = () => new Date().toISOString().slice(0, 10);

export async function seed(pool, { force = false, householdId = null } = {}) {
  const { rows: households } = await pool.query(
    'SELECT id FROM households WHERE $1::int IS NULL OR id = $1 ORDER BY id LIMIT 1',
    [householdId],
  );
  if (householdId != null && !households[0])
    return { skipped: true, reason: `household ${householdId} does not exist` };
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM pets WHERE household_id = $1', [
    households[0]?.id ?? null,
  ]);
  if (rows[0].n > 0 && !force)
    return { skipped: true, reason: 'pets already exist (use --force to add demo data anyway)' };

  const d = (offset) => addDays(today(), offset);
  const at = (dayOffset, hh, mm = 0) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + dayOffset);
    dt.setHours(hh, mm, 0, 0);
    return dt.toISOString();
  };

  return withTransaction(pool, async (c) => {
    const household =
      households[0]?.id ??
      (await c.query("INSERT INTO households (name) VALUES ('Household') RETURNING id")).rows[0].id;
    const insert = async (table, data) => {
      if (table === 'pets') data = { household_id: household, ...data };
      const cols = Object.keys(data);
      const res = await c.query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
        cols.map((k) => data[k]),
      );
      return res.rows[0].id;
    };

    const food1 = await insert('catalog_foods', {
      name: 'Dry food – chicken & rice',
      brand: 'Example Brand',
      kcal_per_100g: 365,
    });
    await insert('catalog_foods', {
      name: 'Wet food – salmon',
      brand: 'Example Brand',
      kcal_per_100g: 95,
    });
    await insert('catalog_foods', {
      name: 'Hay & herbs mix',
      brand: 'Sample Farm',
      kcal_per_100g: 210,
    });
    const medCat = await insert('catalog_medications', {
      name: 'Joint supplement (demo)',
      default_dose: 1,
      unit: 'tablet',
    });
    await insert('catalog_medications', {
      name: 'Ear drops (demo)',
      default_dose: 3,
      unit: 'drops',
    });

    const biscuit = await insert('pets', {
      name: 'Biscuit',
      species: 'dog',
      breed: 'Mixed breed',
      sex: 'male',
      neutered: true,
      birth_date: d(-365 * 6 - 40),
      color: 'Golden',
      microchip: '000000000000001',
      notes: 'Loves long walks and squeaky toys. Fictional demo pet.',
    });
    const mochi = await insert('pets', {
      name: 'Mochi',
      species: 'cat',
      breed: 'Domestic shorthair',
      sex: 'female',
      neutered: true,
      birth_date: d(-365 * 3 - 100),
      color: 'Tabby',
      notes: 'Indoor cat. Fictional demo pet.',
    });
    const pepper = await insert('pets', {
      name: 'Pepper',
      species: 'rabbit',
      breed: 'Dwarf rabbit',
      sex: 'female',
      birth_date: d(-365 * 2),
      color: 'Grey',
    });
    const kiwi = await insert('pets', {
      name: 'Kiwi',
      species: 'bird',
      breed: 'Budgie',
      sex: 'unknown',
      color: 'Green',
    });

    // Weight history for the charts
    const weights = {
      [biscuit]: [24.1, 24.4, 24.0, 23.6, 23.2, 23.0, 22.8],
      [mochi]: [4.1, 4.2, 4.3, 4.3, 4.4, 4.2],
      [pepper]: [1.4, 1.5, 1.5, 1.6],
    };
    for (const [petId, series] of Object.entries(weights)) {
      for (const [i, w] of series.entries()) {
        await insert('health_entries', {
          pet_id: Number(petId),
          date: d(-30 * (series.length - 1 - i)),
          type: 'weight',
          weight_kg: w,
        });
      }
    }
    await insert('health_entries', {
      pet_id: biscuit,
      date: d(-20),
      type: 'vet_visit',
      title: 'Annual check-up',
      notes: 'All good, keep an eye on weight.',
    });
    await insert('health_entries', {
      pet_id: mochi,
      date: d(-60),
      type: 'vaccination',
      title: 'Booster vaccination',
    });
    await insert('health_entries', {
      pet_id: pepper,
      date: d(-5),
      type: 'observation',
      title: 'Eating less hay',
      notes: 'Back to normal after two days.',
    });

    await insert('medications', {
      pet_id: biscuit,
      catalog_id: medCat,
      name: 'Joint supplement (demo)',
      dose: 1,
      unit: 'tablet',
      times: ['08:00', '19:00'],
      interval_days: 1,
      start_date: d(-30),
      stock: 9,
      low_stock_threshold: 10,
    });
    await insert('medications', {
      pet_id: mochi,
      name: 'Ear drops (demo)',
      dose: 3,
      unit: 'drops',
      times: ['09:00'],
      interval_days: 1,
      start_date: d(-3),
      end_date: d(7),
      stock: 40,
      low_stock_threshold: 10,
    });
    await insert('medications', {
      pet_id: pepper,
      name: 'Vitamin paste (demo)',
      dose: 0.5,
      unit: 'ml',
      times: ['18:00'],
      interval_days: 7,
      start_date: d(-14),
    });

    await insert('appointments', {
      pet_id: biscuit,
      title: 'Vaccination appointment',
      starts_at: at(3, 10, 30),
      location: 'Example Vet Clinic',
      remind_minutes_before: 120,
    });
    await insert('appointments', {
      pet_id: mochi,
      title: 'Dental check',
      starts_at: at(12, 15),
      location: 'Example Vet Clinic',
      remind_minutes_before: 1440,
    });
    await insert('appointments', {
      pet_id: pepper,
      title: 'Claw trimming',
      starts_at: at(-10, 11),
      done: true,
    });

    await insert('feeding_plans', {
      pet_id: biscuit,
      food_id: food1,
      food_name: 'Dry food – chicken & rice',
      amount: 180,
      unit: 'g',
      times: ['07:30', '18:30'],
    });
    await insert('feeding_plans', {
      pet_id: mochi,
      food_name: 'Wet food – salmon',
      amount: 85,
      unit: 'g',
      times: ['07:00', '12:00', '19:00'],
    });
    await insert('feeding_plans', {
      pet_id: pepper,
      food_name: 'Hay & herbs mix',
      unit: 'unlimited',
      notes: 'Fresh greens in the evening',
    });
    await insert('feeding_plans', {
      pet_id: kiwi,
      food_name: 'Seed mix',
      amount: 2,
      unit: 'tsp',
      times: ['08:00'],
    });

    await insert('prevention_items', {
      pet_id: biscuit,
      type: 'deworming',
      product: 'Demo dewormer',
      last_date: d(-85),
      interval_days: 90,
    });
    await insert('prevention_items', {
      pet_id: biscuit,
      type: 'flea_tick',
      product: 'Demo spot-on',
      last_date: d(-32),
      interval_days: 30,
    });
    await insert('prevention_items', {
      pet_id: mochi,
      type: 'vaccination',
      last_date: d(-60),
      interval_days: 365,
    });
    await insert('prevention_items', {
      pet_id: pepper,
      type: 'grooming',
      last_date: d(-20),
      interval_days: 28,
    });

    const illness = await insert('illnesses', {
      pet_id: mochi,
      title: 'Ear infection',
      status: 'active',
      started_on: d(-4),
      diagnosis: 'Mild outer ear inflammation (demo)',
    });
    const entries = [
      {
        date: d(-4),
        severity: 3,
        temperature_c: 39.1,
        symptoms: 'Scratching left ear, head shaking',
        treatment: 'Vet visit, ear cleaning',
      },
      {
        date: d(-3),
        severity: 3,
        temperature_c: 38.9,
        symptoms: 'Still scratching',
        treatment: 'Ear drops 3x daily',
      },
      {
        date: d(-1),
        severity: 2,
        temperature_c: 38.6,
        symptoms: 'Less scratching',
        treatment: 'Ear drops',
      },
      {
        date: d(0),
        severity: 1,
        temperature_c: 38.5,
        symptoms: 'Almost no symptoms',
        treatment: 'Ear drops',
      },
    ];
    for (const e of entries) await insert('illness_entries', { illness_id: illness, ...e });
    await insert('illnesses', {
      pet_id: biscuit,
      title: 'Upset stomach',
      status: 'resolved',
      started_on: d(-120),
      ended_on: d(-115),
    });

    return { seeded: true, pets: 4, household };
  });
}
