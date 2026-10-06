import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../lib/errors.js';
import { parse, idParam } from '../lib/validate.js';
import { detectImageType } from '../lib/image.js';
import { petSchema } from './schemas.js';

export function petsRouter({ pool, config }) {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadBytes, files: 1, fields: 0 },
  });

  router.get('/', async (req, res) => {
    const archived = req.query.archived === 'true';
    const { rows } = await pool.query(
      `SELECT p.*,
         (SELECT weight_kg FROM health_entries h
           WHERE h.pet_id = p.id AND h.weight_kg IS NOT NULL ORDER BY date DESC, id DESC LIMIT 1) AS last_weight_kg,
         (SELECT count(*)::int FROM illnesses i WHERE i.pet_id = p.id AND i.status <> 'resolved') AS open_illnesses
       FROM pets p WHERE p.archived = $1 ORDER BY lower(p.name)`,
      [archived],
    );
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const data = parse(petSchema, req.body);
    const cols = Object.keys(data);
    const { rows } = await pool.query(
      `INSERT INTO pets (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      cols.map((c) => data[c]),
    );
    res.status(201).json(rows[0]);
  });

  router.get('/:id', async (req, res) => {
    res.json(await findPet(parse(idParam, req.params.id)));
  });

  router.patch('/:id', async (req, res) => {
    const id = parse(idParam, req.params.id);
    const data = parse(petSchema.partial(), req.body);
    const cols = Object.keys(data);
    if (!cols.length) return res.json(await findPet(id));
    const { rows } = await pool.query(
      `UPDATE pets SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')}, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, ...cols.map((c) => data[c])],
    );
    if (!rows[0]) throw new ApiError(404, 'PET_NOT_FOUND', 'pet not found');
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    const id = parse(idParam, req.params.id);
    const { rows } = await pool.query('DELETE FROM pets WHERE id = $1 RETURNING photo', [id]);
    if (!rows[0]) throw new ApiError(404, 'PET_NOT_FOUND', 'pet not found');
    await removePhoto(rows[0].photo);
    res.status(204).end();
  });

  router.post(
    '/:id/photo',
    (req, res, next) => {
      upload.single('photo')(req, res, (err) => {
        if (err?.code === 'LIMIT_FILE_SIZE') {
          return next(
            new ApiError(413, 'UPLOAD_TOO_LARGE', 'File too large', {
              maxBytes: config.maxUploadBytes,
            }),
          );
        }
        if (err) return next(new ApiError(400, 'UPLOAD_INVALID', err.message));
        next();
      });
    },
    async (req, res) => {
      const id = parse(idParam, req.params.id);
      const pet = await findPet(id);
      if (!req.file) throw new ApiError(400, 'UPLOAD_MISSING', 'No file uploaded');
      const kind = detectImageType(req.file.buffer);
      if (!kind)
        throw new ApiError(
          415,
          'UPLOAD_UNSUPPORTED_TYPE',
          'Only JPEG, PNG, WebP and GIF images are allowed',
        );
      // Random, unguessable file name; the original name is never used on disk.
      const filename = `${randomUUID()}.${kind.ext}`;
      await writeFile(path.join(config.uploadDir, filename), req.file.buffer, { mode: 0o640 });
      const { rows } = await pool.query(
        'UPDATE pets SET photo = $2, updated_at = now() WHERE id = $1 RETURNING *',
        [id, filename],
      );
      await removePhoto(pet.photo);
      res.json(rows[0]);
    },
  );

  router.delete('/:id/photo', async (req, res) => {
    const id = parse(idParam, req.params.id);
    const pet = await findPet(id);
    const { rows } = await pool.query(
      'UPDATE pets SET photo = NULL, updated_at = now() WHERE id = $1 RETURNING *',
      [id],
    );
    await removePhoto(pet.photo);
    res.json(rows[0]);
  });

  async function findPet(id) {
    const { rows } = await pool.query('SELECT * FROM pets WHERE id = $1', [id]);
    if (!rows[0]) throw new ApiError(404, 'PET_NOT_FOUND', 'pet not found');
    return rows[0];
  }

  async function removePhoto(filename) {
    if (!filename || !/^[\w-]+\.(jpg|png|webp|gif)$/.test(filename)) return;
    await unlink(path.join(config.uploadDir, filename)).catch(() => {});
  }

  return router;
}
