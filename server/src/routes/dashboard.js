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

  router.get('/', async (req, res) => {
    const household = req.user.household_id;
    const tz = config.timezone;
    const now = new Date();
    const today = todayIn(tz, now);
    const startOfDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endOfWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [pets, meds, doses, appts, prevention, illnesses] = await Promise.all([
      pool.query(
        `SELECT id, name, species, photo FROM pets
         WHERE household_id = $1 AND NOT archived ORDER BY lower(name)`,
        [household],
      ),
      pool.query(
        `SELECT m.*, p.name AS pet_name, p.species FROM medications m JOIN pets p ON p.id = m.pet_id
         WHERE p.household_id = $1 AND NOT p.archived AND (m.end_date IS NULL OR m.end_date >= $2)`,
        [household, today],
      ),
      pool.query(
        `SELECT d.medication_id, d.given_at FROM medication_doses d
         JOIN medications m ON m.id = d.medication_id JOIN pets p ON p.id = m.pet_id
         WHERE p.household_id = $1 AND d.given_at >= $2`,
        [household, startOfDay],
      ),
      pool.query(
        `SELECT a.*, p.name AS pet_name, p.species FROM appointments a JOIN pets p ON p.id = a.pet_id
         WHERE p.household_id = $1 AND NOT a.done AND a.starts_at >= now() - interval '1 hour'
           AND a.starts_at < now() + interval '30 days'
         ORDER BY a.starts_at LIMIT 10`,
        [household],
      ),
      pool.query(
        `SELECT i.*, p.name AS pet_name, p.species FROM prevention_items i JOIN pets p ON p.id = i.pet_id
         WHERE p.household_id = $1 AND NOT p.archived`,
        [household],
      ),
      pool.query(
        `SELECT i.id, i.pet_id, i.title, i.status, i.started_on, p.name AS pet_name, p.species
         FROM illnesses i JOIN pets p ON p.id = i.pet_id
         WHERE p.household_id = $1 AND i.status <> 'resolved' AND NOT p.archived
         ORDER BY i.started_on DESC`,
        [household],
      ),
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
