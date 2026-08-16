const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
const env = require("../config/env");

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "TRUNCATE comments, task_assignments, tasks, projects, org_members, refresh_tokens, organizations, users RESTART IDENTITY CASCADE"
    );

    const passwordHash = await bcrypt.hash("Password@123", env.bcryptCost);

    // --- Users ---
    const userRows = [
      ["alice@taskflow.dev", "Alice Admin"],
      ["bob@taskflow.dev", "Bob Builder"],
      ["carol@taskflow.dev", "Carol Coder"],
      ["dave@taskflow.dev", "Dave Dev"],
      ["erin@taskflow.dev", "Erin Engineer"],
    ];
    const users = [];
    for (const [email, name] of userRows) {
      const { rows } = await client.query(
        "INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id, email",
        [email, passwordHash, name]
      );
      users.push(rows[0]);
    }
    const [alice, bob, carol, dave, erin] = users;

    // --- Organizations ---
    const { rows: orgRows } = await client.query(
      `INSERT INTO organizations (name, slug) VALUES
        ('Acme Corp', 'acme'),
        ('Globex Inc', 'globex')
       RETURNING id, slug`
    );
    const [acme, globex] = orgRows;

    // --- Org members ---

    await client.query(
      `INSERT INTO org_members (org_id, user_id, role) VALUES
        ($1,$2,'org_admin'),
        ($1,$3,'member'),
        ($1,$4,'member'),
        ($5,$6,'org_admin'),
        ($5,$7,'member'),
        ($5,$2,'member')`,
      [acme.id, alice.id, bob.id, carol.id, globex.id, dave.id, erin.id]
    );

    // --- Projects ---
    const { rows: projects } = await client.query(
      `INSERT INTO projects (org_id, name, description, created_by) VALUES
        ($1,'Website Revamp','Marketing site redesign', $2),
        ($1,'Mobile App','iOS/Android client', $3),
        ($4,'Data Pipeline','ETL for analytics', $5),
        ($4,'Customer Portal','Self-serve billing portal', $6)
       RETURNING id, org_id, name`,
      [acme.id, alice.id, bob.id, globex.id, dave.id, erin.id]
    );
    const [website, mobile, pipeline, portal] = projects;

    // --- Tasks 
    const taskDefs = [
      [website.id, acme.id, "Design new homepage hero", "todo", "high", alice.id],
      [website.id, acme.id, "Migrate blog to new CMS", "in_progress", "medium", bob.id],
      [website.id, acme.id, "Fix mobile nav overlap", "review", "urgent", carol.id],
      [website.id, acme.id, "Add newsletter signup", "done", "low", bob.id],
      [mobile.id, acme.id, "Set up CI for iOS build", "todo", "medium", carol.id],
      [mobile.id, acme.id, "Implement push notifications", "in_progress", "high", bob.id],
      [mobile.id, acme.id, "Crash on login screen", "todo", "urgent", alice.id],
      [pipeline.id, globex.id, "Build daily ingestion job", "in_progress", "high", dave.id],
      [pipeline.id, globex.id, "Add data quality checks", "todo", "medium", erin.id],
      [pipeline.id, globex.id, "Backfill historical events", "review", "low", dave.id],
      [portal.id, globex.id, "Stripe webhook handling", "todo", "urgent", erin.id],
      [portal.id, globex.id, "Invoice PDF generation", "done", "medium", dave.id],
    ];
    const tasks = [];
    for (const [projectId, orgId, title, status, priority, createdBy] of taskDefs) {
      const { rows } = await client.query(
        `INSERT INTO tasks (project_id, org_id, title, description, status, priority, due_date, created_by)
         VALUES ($1,$2,$3,$4,$5,$6, now() + interval '7 days', $7)
         RETURNING id, project_id, org_id`,
        [projectId, orgId, title, `${title} - seeded task`, status, priority, createdBy]
      );
      tasks.push(rows[0]);
    }

    // --- Assignments ---
    const acmeMembers = [alice.id, bob.id, carol.id];
    const globexMembers = [dave.id, erin.id, alice.id];
    for (const task of tasks) {
      const pool_ = task.org_id === acme.id ? acmeMembers : globexMembers;
      const assignee = pool_[Math.floor(Math.random() * pool_.length)];
      await client.query(
        "INSERT INTO task_assignments (task_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [task.id, assignee]
      );
    }

    // --- Comments (sample) ---
    await client.query(
      `INSERT INTO comments (task_id, user_id, body) VALUES
        ($1,$2,'Looks good, starting on this today.'),
        ($1,$3,'Blocked on design assets, pinging design team.'),
        ($4,$5,'Fixed in latest commit, ready for review.')`,
      [tasks[0].id, alice.id, bob.id, tasks[2].id, carol.id]
    );

    await client.query("COMMIT");
    console.log("Seed complete.");
    console.log("Login with any of these (password: Password@123):");
    userRows.forEach(([email]) => console.log(`  - ${email}`));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
