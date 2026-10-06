import { loadConfig } from '../config.js';
import { createPool } from './pool.js';
import { migrate } from './migrate.js';
import { seed } from './seed.js';

const command = process.argv[2];
const config = loadConfig();
const pool = createPool(config.databaseUrl);

try {
  await migrate(pool, { log: console.log });
  if (command === 'seed') {
    const result = await seed(pool, { force: process.argv.includes('--force') });
    console.log(result);
  } else if (command !== 'migrate') {
    console.error('Usage: node src/db/cli.js <migrate|seed> [--force]');
    process.exitCode = 1;
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
