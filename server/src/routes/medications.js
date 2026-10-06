import { petResourceRouter } from '../lib/crud.js';
import { withTransaction } from '../db/pool.js';
import { ApiError } from '../lib/errors.js';
import { parse, idParam } from '../lib/validate.js';
import { medicationSchema, doseSchema } from './schemas.js';

export function medicationsRouter({ pool }) {
  const router = petResourceRouter({
    pool,
    table: 'medications',
    schema: medicationSchema,
    orderBy: 'end_date IS NOT NULL AND end_date < CURRENT_DATE, lower(name)',
    code: 'MEDICATION',
  });

  router.get('/:id/doses', async (req, res) => {
    const med = await router.findOne(req);
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const { rows } = await pool.query(
      `SELECT d.*, u.display_name AS given_by_name FROM medication_doses d
       LEFT JOIN users u ON u.id = d.given_by
       WHERE d.medication_id = $1 ORDER BY d.given_at DESC LIMIT $2`,
      [med.id, limit],
    );
    res.json(rows);
  });

  // Records a dose that was actually given and decrements the stock.
  router.post('/:id/doses', async (req, res) => {
    const med = await router.findOne(req);
    const data = parse(doseSchema, req.body ?? {});
    const amount = data.amount ?? med.dose ?? null;
    const result = await withTransaction(pool, async (client) => {
      const { rows } = await client.query(
        `INSERT INTO medication_doses (medication_id, given_at, amount, given_by, notes)
         VALUES ($1, COALESCE($2, now()), $3, $4, $5) RETURNING *`,
        [med.id, data.given_at ?? null, amount, req.user.id, data.notes ?? null],
      );
      const updated = await client.query(
        `UPDATE medications
         SET stock = CASE WHEN stock IS NULL THEN NULL ELSE GREATEST(stock - COALESCE($2, 0), 0) END,
             updated_at = now()
         WHERE id = $1 RETURNING *`,
        [med.id, amount],
      );
      return { dose: rows[0], medication: updated.rows[0] };
    });
    res.status(201).json(result);
  });

  // Undo: deleting a dose puts the amount back into stock.
  router.delete('/:id/doses/:doseId', async (req, res) => {
    const med = await router.findOne(req);
    const doseId = parse(idParam, req.params.doseId);
    await withTransaction(pool, async (client) => {
      const { rows } = await client.query(
        'DELETE FROM medication_doses WHERE id = $1 AND medication_id = $2 RETURNING amount',
        [doseId, med.id],
      );
      if (!rows[0]) throw new ApiError(404, 'DOSE_NOT_FOUND', 'dose not found');
      if (med.stock != null && rows[0].amount != null) {
        await client.query('UPDATE medications SET stock = stock + $2 WHERE id = $1', [
          med.id,
          rows[0].amount,
        ]);
      }
    });
    res.status(204).end();
  });

  return router;
}
