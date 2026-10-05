import fs from 'fs';
import { pool } from '../src/db.js';
const sql = fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');
await pool.query(sql);
console.log('✅ Barcha jadvallar muvaffaqiyatli yaratildi!');
process.exit(0);
