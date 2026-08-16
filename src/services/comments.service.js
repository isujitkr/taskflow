const { query } = require("../config/db");
const ApiError = require("../utils/apiError");

async function assertTaskInOrg(orgId, taskId) {
  const { rows } = await query(
    "SELECT id FROM tasks WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL",
    [taskId, orgId]
  );
  if (rows.length === 0) throw ApiError.notFound("TASK_NOT_FOUND", "Task not found");
}

async function list(orgId, taskId) {
  await assertTaskInOrg(orgId, taskId);
  const { rows } = await query(
    `SELECT c.id, c.body, c.created_at, u.id AS user_id, u.name AS user_name
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.task_id = $1 ORDER BY c.created_at`,
    [taskId]
  );
  return rows;
}

async function create(orgId, taskId, userId, body) {
  await assertTaskInOrg(orgId, taskId);
  const { rows } = await query(
    "INSERT INTO comments (task_id, user_id, body) VALUES ($1,$2,$3) RETURNING *",
    [taskId, userId, body]
  );
  return rows[0];
}

module.exports = { list, create };
