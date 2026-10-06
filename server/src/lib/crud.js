import { Router } from 'express';
import { ApiError } from './errors.js';
import { parse, idParam } from './validate.js';

/**
 * Builds a router for a resource that belongs to a pet
 * (mounted at /api/pets/:petId/<resource>).
 *
 * Column names are taken exclusively from the zod schema's keys (a fixed
 * whitelist defined in code); all values are passed as query parameters.
 */
export function petResourceRouter({ pool, table, schema, orderBy, code }) {
  const router = Router({ mergeParams: true });
  const updateSchema = schema.partial();

  async function assertPet(petId) {
    const { rowCount } = await pool.query('SELECT 1 FROM pets WHERE id = $1', [petId]);
    if (!rowCount) throw new ApiError(404, 'PET_NOT_FOUND', 'pet not found');
  }

  router.get('/', async (req, res) => {
    const petId = parse(idParam, req.params.petId);
    await assertPet(petId);
    const { rows } = await pool.query(
      `SELECT * FROM ${table} WHERE pet_id = $1 ORDER BY ${orderBy}`,
      [petId],
    );
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const petId = parse(idParam, req.params.petId);
    await assertPet(petId);
    const data = parse(schema, req.body);
    const cols = Object.keys(data);
    const { rows } = await pool.query(
      `INSERT INTO ${table} (pet_id${cols.map((c) => `, ${c}`).join('')})
       VALUES ($1${cols.map((_, i) => `, $${i + 2}`).join('')}) RETURNING *`,
      [petId, ...cols.map((c) => data[c])],
    );
    res.status(201).json(rows[0]);
  });

  router.get('/:id', async (req, res) => {
    const row = await findOne(req);
    res.json(row);
  });

  router.patch('/:id', async (req, res) => {
    const { petId, id } = ids(req);
    const data = parse(updateSchema, req.body);
    const cols = Object.keys(data);
    if (!cols.length) return res.json(await findOne(req));
    const { rows } = await pool.query(
      `UPDATE ${table} SET ${cols.map((c, i) => `${c} = $${i + 3}`).join(', ')}
       WHERE id = $1 AND pet_id = $2 RETURNING *`,
      [id, petId, ...cols.map((c) => data[c])],
    );
    if (!rows[0]) throw notFound();
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    const { petId, id } = ids(req);
    const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE id = $1 AND pet_id = $2`, [
      id,
      petId,
    ]);
    if (!rowCount) throw notFound();
    res.status(204).end();
  });

  function ids(req) {
    return { petId: parse(idParam, req.params.petId), id: parse(idParam, req.params.id) };
  }

  function notFound() {
    return new ApiError(404, `${code}_NOT_FOUND`, `${code.toLowerCase()} not found`);
  }

  async function findOne(req) {
    const { petId, id } = ids(req);
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1 AND pet_id = $2`, [
      id,
      petId,
    ]);
    if (!rows[0]) throw notFound();
    return rows[0];
  }

  router.findOne = findOne;
  return router;
}
