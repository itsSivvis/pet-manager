import { Router } from 'express';
import { ApiError } from '../lib/errors.js';
import { parse, idParam } from '../lib/validate.js';
import { foodSchema, catalogMedicationSchema } from './schemas.js';

const KINDS = {
  foods: { table: 'catalog_foods', schema: foodSchema },
  medications: { table: 'catalog_medications', schema: catalogMedicationSchema },
};

/** Shared food/medication catalog: everyone may read, only admins may write. */
export function catalogRouter({ pool, auth }) {
  const router = Router();

  for (const [kind, { table, schema }] of Object.entries(KINDS)) {
    router.get(`/${kind}`, async (_req, res) => {
      const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY lower(name)`);
      res.json(rows);
    });

    router.post(`/${kind}`, auth.requireAdmin, async (req, res) => {
      const data = parse(schema, req.body);
      const cols = Object.keys(data);
      const { rows } = await pool.query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
        cols.map((c) => data[c]),
      );
      res.status(201).json(rows[0]);
    });

    router.patch(`/${kind}/:id`, auth.requireAdmin, async (req, res) => {
      const id = parse(idParam, req.params.id);
      const data = parse(schema.partial(), req.body);
      const cols = Object.keys(data);
      if (!cols.length) throw new ApiError(400, 'VALIDATION_FAILED', 'Nothing to update');
      const { rows } = await pool.query(
        `UPDATE ${table} SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1 RETURNING *`,
        [id, ...cols.map((c) => data[c])],
      );
      if (!rows[0]) throw new ApiError(404, 'CATALOG_ITEM_NOT_FOUND', 'item not found');
      res.json(rows[0]);
    });

    router.delete(`/${kind}/:id`, auth.requireAdmin, async (req, res) => {
      const id = parse(idParam, req.params.id);
      const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      if (!rowCount) throw new ApiError(404, 'CATALOG_ITEM_NOT_FOUND', 'item not found');
      res.status(204).end();
    });
  }
  return router;
}
