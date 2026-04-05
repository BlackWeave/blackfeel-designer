/**
 * Run: node backend/migrations/migrate_waitlist.js
 * Applies the waitlist_entries table migration using the same DATABASE_URL
 * that the rest of the application uses.
 */
import '../config/env.js';
import pool from '../config/db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = readFileSync(
    path.join(__dirname, 'add_waitlist_entries.sql'),
    'utf8'
);

(async () => {
    const client = await pool.connect();
    try {
        console.log('⏳  Running waitlist migration…');
        await client.query(sql);
        console.log('✅  waitlist_entries table created (or already exists).');
    } catch (err) {
        console.error('❌  Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
})();
