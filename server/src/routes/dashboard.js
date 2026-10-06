import { Router } from 'express';
import {
  medicationOccurrences,
  preventionDueDate,
  preventionStatus,
  todayIn,
  isLowStock,
} from '../services/reminder-schedule.js';

export function dashboardRouter({ pool, config }) {
  const router = Router();

  router.get('/', async (_req, res) => {
    const tz = config.timezone;
    const now = new Date();
    const today = todayIn(tz, now);
    const startOfDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endOfWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [pets, meds, doses, appts, prevention, illnesses] = await Promise.all([
      pool.query(
        'SELECT id, name, species, photo FROM pets WHERE NOT archived ORDER BY lower(name)',
      ),
      pool.query(
        `SELECT m.*, p.name AS pet_name, p.species FROM medications m JOIN pets p ON p.id = m.pet_id
                  WHERE NOT p.archived AND (m.end_date IS NULL OR m.end_date >= $1)`,
        [today],
      ),
      pool.query(`SELECT medication_id, given_at FROM medication_doses WHERE given_at >= $1`, [
        startOfDay,
      ]),
      pool.query(`SELECT a.*, p.name AS pet_name, p.species FROM appointments a JOIN pets p ON p.id = a.pet_id
                  WHERE NOT a.done AND a.starts_at >= now() - interval '1 hour'
                    AND a.starts_at < now() + interval '30 days'
                  ORDER BY a.starts_at LIMIT 10`),
      pool.query(`SELECT i.*, p.name AS pet_name, p.species FROM prevention_items i JOIN pets p ON p.id = i.pet_id
                  WHERE NOT p.archived`),
      pool.query(`SELECT i.id, i.pet_id, i.title, i.status, i.started_on, p.name AS pet_name, p.species
                  FROM illnesses i JOIN pets p ON p.id = i.pet_id
                  WHERE i.status <> 'resolved' AND NOT p.archived ORDER BY i.started_on DESC`),
    ]);

    // Doses due from 12 hours ago until 24 hours ahead, with "given" status.
    const givenByMed = new Map();
    for (const d of doses.rows) {
      if (!givenByMed.has(d.medication_id)) givenByMed.set(d.medication_id, []);
      givenByMed.get(d.medication_id).push(d.given_at);
    }
    const from = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const doseSchedule = [];
    for (const med of meds.rows) {
      const given = givenByMed.get(med.id) ?? [];
      for (const occ of medicationOccurrences(med, from, endOfWindow, tz)) {
        const isGiven = given.some((g) => Math.abs(g - occ.at) < 2 * 60 * 60 * 1000);
        doseSchedule.push({
          medication_id: med.id,
          pet_id: med.pet_id,
          pet_name: med.pet_name,
          species: med.species,
          name: med.name,
          dose: med.dose,
          unit: med.unit,
          at: occ.at,
          given: isGiven,
          overdue: !isGiven && occ.at < now,
        });
      }
    }
    doseSchedule.sort((a, b) => a.at - b.at);

    const preventionDue = prevention.rows
      .map((i) => ({ ...i, due_date: preventionDueDate(i), status: preventionStatus(i, today) }))
      .filter((i) => i.status === 'overdue' || i.status === 'due_soon')
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    res.json({
      today,
      timezone: tz,
      pets: pets.rows,
      doses: doseSchedule.filter((d) => !d.given || d.at > from),
      appointments: appts.rows,
      prevention: preventionDue,
      lowStock: meds.rows
        .filter(isLowStock)
        .map(({ id, pet_id, pet_name, name, stock, unit, low_stock_threshold }) => ({
          id,
          pet_id,
          pet_name,
          name,
          stock,
          unit,
          low_stock_threshold,
        })),
      illnesses: illnesses.rows,
    });
  });

  return router;
}
