import { Router } from 'express';
import { petResourceRouter } from '../lib/crud.js';
import { ApiError } from '../lib/errors.js';
import { parse, idParam } from '../lib/validate.js';
import { illnessSchema, illnessEntrySchema } from './schemas.js';

export function illnessesRouter({ pool }) {
  const router = petResourceRouter({
    pool,
    table: 'illnesses',
    schema: illnessSchema,
    orderBy: "status = 'resolved', started_on DESC",
    code: 'ILLNESS',
  });

  const entries = Router({ mergeParams: true });
  const entryUpdate = illnessEntrySchema.partial();

  entries.get('/', async (req, res) => {
    const illness = await router.findOne(req);
    const { rows } = await pool.query(
      'SELECT * FROM illness_entries WHERE illness_id = $1 ORDER BY date, id',
      [illness.id],
    );
    res.json(rows);
  });

  entries.post('/', async (req, res) => {
    const illness = await router.findOne(req);
    const d = parse(illnessEntrySchema, req.body);
    const { rows } = await pool.query(
      `INSERT INTO illness_entries (illness_id, date, severity, temperature_c, symptoms, treatment, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        illness.id,
        d.date,
        d.severity ?? null,
        d.temperature_c ?? null,
        d.symptoms ?? null,
        d.treatment ?? null,
        d.notes ?? null,
      ],
    );
    res.status(201).json(rows[0]);
  });

  entries.patch('/:entryId', async (req, res) => {
    const illness = await router.findOne(req);
    const entryId = parse(idParam, req.params.entryId);
    const d = parse(entryUpdate, req.body);
    const cols = Object.keys(d);
    if (!cols.length) throw new ApiError(400, 'VALIDATION_FAILED', 'Nothing to update');
    const { rows } = await pool.query(
      `UPDATE illness_entries SET ${cols.map((c, i) => `${c} = $${i + 3}`).join(', ')}
       WHERE id = $1 AND illness_id = $2 RETURNING *`,
      [entryId, illness.id, ...cols.map((c) => d[c])],
    );
    if (!rows[0]) throw new ApiError(404, 'ILLNESS_ENTRY_NOT_FOUND', 'entry not found');
    res.json(rows[0]);
  });

  entries.delete('/:entryId', async (req, res) => {
    const illness = await router.findOne(req);
    const entryId = parse(idParam, req.params.entryId);
    const { rowCount } = await pool.query(
      'DELETE FROM illness_entries WHERE id = $1 AND illness_id = $2',
      [entryId, illness.id],
    );
    if (!rowCount) throw new ApiError(404, 'ILLNESS_ENTRY_NOT_FOUND', 'entry not found');
    res.status(204).end();
  });

  router.use('/:id/entries', entries);
  return router;
}
