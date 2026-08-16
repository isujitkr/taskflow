const { query } = require("../config/db");
const ApiError = require("../utils/apiError");
const { parsePagination, buildPaginatedResponse } = require("../utils/pagination");

async function list(orgId, reqQuery) {
  const { page, limit, offset } = parsePagination(reqQuery);

  const { rows: countRows } = await query(
    "SELECT COUNT(*) FROM projects WHERE org_id = $1 AND deleted_at IS NULL",
    [orgId]
  );
  const total = parseInt(countRows[0].count, 10);

  const { rows } = await query(
    `SELECT id, name, description, created_by, created_at, updated_at
     FROM projects WHERE org_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [orgId, limit, offset]
  );

  return buildPaginatedResponse(rows, total, page, limit);
}

async function getById(orgId, projectId) {
  const { rows } = await query(
    "SELECT * FROM projects WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL",
    [projectId, orgId]
  );
  if (rows.length === 0) throw ApiError.notFound("PROJECT_NOT_FOUND", "Project not found");
  return rows[0];
}

async function create(orgId, userId, data) {
  const { rows } = await query(
    `INSERT INTO projects (org_id, name, description, created_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [orgId, data.name, data.description || null, userId]
  );
  return rows[0];
}

async function update(orgId, projectId, data) {
  await getById(orgId, projectId);

  const fields = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(data)) {
    fields.push(`${key} = $${i++}`);
    values.push(val);
  }
  if (fields.length === 0) return getById(orgId, projectId);

  values.push(projectId, orgId);
  const { rows } = await query(
    `UPDATE projects SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${i++} AND org_id = $${i} RETURNING *`,
    values
  );
  return rows[0];
}

async function remove(orgId, projectId) {
  const { rowCount } = await query(
    "UPDATE projects SET deleted_at = now() WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL",
    [projectId, orgId]
  );
  if (rowCount === 0) throw ApiError.notFound("PROJECT_NOT_FOUND", "Project not found");
}

async function dashboard(orgId, projectId) {
  await getById(orgId, projectId);
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS count FROM tasks
     WHERE project_id = $1 AND org_id = $2 AND deleted_at IS NULL
     GROUP BY status`,
    [projectId, orgId]
  );
  const counts = { todo: 0, in_progress: 0, review: 0, done: 0 };
  rows.forEach((r) => (counts[r.status] = r.count));
  return counts;
}

module.exports = { list, getById, create, update, remove, dashboard };
