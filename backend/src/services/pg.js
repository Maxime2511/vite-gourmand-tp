import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

export const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

export async function bootstrapPasswords() {
  const res = await pool.query("SELECT id FROM users WHERE password_hash='__BOOTSTRAP__'");
  if (res.rowCount === 0) return;
  const hash = await bcrypt.hash("Password123!", 10);
  for (const row of res.rows) {
    await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, row.id]);
  }
}
