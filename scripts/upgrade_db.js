import { pool } from '../src/db.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sqlPath = join(__dirname, 'upgrade_db.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function runMigration() {
  try {
    console.log('🔄 Ma\'lumotlar bazasini yangilash boshlandi...');
    await pool.query(sql);
    console.log('✅ Baza muvaffaqiyatli yangilandi! (Indexlar va flagged ustuni qo\'shildi)');
  } catch (error) {
    console.error('❌ Xatolik yuz berdi:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigration();
