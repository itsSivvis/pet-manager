import pg from 'pg';

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Dates to
// avoid timezone shifts for calendar dates (birthdays, due dates, ...).
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);
// NUMERIC -> JS number (values in this app are small: weights, doses, stock).
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) =>
  value === null ? null : Number(value),
);

export function createPool(databaseUrl) {
  return new pg.Pool({ connectionString: databaseUrl, max: 10 });
}

/** Runs fn inside a transaction on a dedicated client. */
export async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
