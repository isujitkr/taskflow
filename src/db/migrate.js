const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

function listMigrations() {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  const names = files
    .filter((f) => f.endsWith(".up.sql"))
    .map((f) => f.replace(".up.sql", ""))
    .sort();
  return names;
}

async function getApplied() {
  const { rows } = await pool.query("SELECT name FROM schema_migrations ORDER BY name");
  return new Set(rows.map((r) => r.name));
}

async function up() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const all = listMigrations();
  const pending = all.filter((n) => !applied.has(n));

  if (pending.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  for (const name of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, `${name}.up.sql`), "utf8");
    console.log(`Applying ${name}...`);
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
      await pool.query("COMMIT");
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  }
  console.log("Migrations up to date.");
}

async function down() {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const all = listMigrations();
  const appliedSorted = all.filter((n) => applied.has(n)).sort();
  const last = appliedSorted[appliedSorted.length - 1];

  if (!last) {
    console.log("Nothing to roll back.");
    return;
  }

  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, `${last}.down.sql`), "utf8");
  console.log(`Reverting ${last}...`);
  await pool.query("BEGIN");
  try {
    await pool.query(sql);
    await pool.query("DELETE FROM schema_migrations WHERE name = $1", [last]);
    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
  console.log(`Reverted ${last}.`);
}

async function main() {
  const cmd = process.argv[2];
  try {
    if (cmd === "up") await up();
    else if (cmd === "down") await down();
    else {
      console.log("Usage: node src/db/migrate.js up|down");
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
