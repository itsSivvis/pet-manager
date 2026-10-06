// Wipes the e2e database before the server starts (the server migrates on start-up).
// Never point E2E_DATABASE_URL at a database with real data.
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
await client.end();
