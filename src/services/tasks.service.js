const { query } = require("../config/db");
const ApiError = require("../utils/apiError");
const { parsePagination, buildPaginatedResponse } = require("../utils/pagination");
const { enqueueAssignmentEmail } = require("../jobs/queues/emailQueue");

async function assertProjectInOrg(orgId, projectId) {
  const { rows } = await query(
    "SELECT id FROM projects WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL",
    [projectId, orgId]
  );
  if (rows.length === 0) throw ApiError.notFound("PROJECT_NOT_FOUND", "Project not found");
}

async function list(orgId, reqQuery) {
  const { page, limit, offset } = parsePagination(reqQuery);
  const where = ["t.org_id = $1", "t.deleted_at IS NULL"];
  const values = [orgId];
  let i = 2;

  if (reqQuery.status) {
    where.push(`t.status = $${i++}`);
    values.push(reqQuery.status);
  }
  if (reqQuery.priority) {
    where.push(`t.priority = $${i++}`);
    values.push(reqQuery.priority);
  }
  if (reqQuery.assignee) {
    where.push(
      `EXISTS (SELECT 1 FROM task_assignments a WHERE a.task_id = t.id AND a.user_id = $${i++})`
    );
    values.push(reqQuery.assignee);
  }
  if (reqQuery.dueFrom) {
    where.push(`t.due_date >= $${i++}`);
    values.push(reqQuery.dueFrom);
  }
  if (reqQuery.dueTo) {
    where.push(`t.due_date <= $${i++}`);
    values.push(reqQuery.dueTo);
  }

  const whereClause = where.join(" AND ");

  const { rows: countRows } = await query(
    `SELECT COUNT(*) FROM tasks t WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countRows[0].count, 10);

  const { rows } = await query(
    `SELECT t.* FROM tasks t WHERE ${whereClause}
     ORDER BY t.created_at DESC LIMIT $${i++} OFFSET $${i}`,
    [...values, limit, offset]
  );

  return buildPaginatedResponse(rows, total, page, limit);
}

async function getById(orgId, taskId) {
  const { rows } = await query(
    "SELECT * FROM tasks WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL",
    [taskId, orgId]
  );
  if (rows.length === 0) throw ApiError.notFound("TASK_NOT_FOUND", "Task not found");
  return rows[0];
}

async function create(orgId, userId, data) {
  await assertProjectInOrg(orgId, data.projectId);

  const { rows } = await query(
    `INSERT INTO tasks (project_id, org_id, title, description, status, priority, due_date, created_by)
     VALUES ($1,$2,$3,$4,COALESCE($5::task_status,'todo'),COALESCE($6::task_priority,'medium'),$7,$8)
     RETURNING *`,
    [
      data.projectId,
      orgId,
      data.title,
      data.description || null,
      data.status || null,
      data.priority || null,
      data.dueDate || null,
      userId,
    ]
  );
  return rows[0];
}

async function update(orgId, taskId, data) {
  await getById(orgId, taskId);

  const colMap = { dueDate: "due_date" };
  const fields = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(data)) {
    fields.push(`${colMap[key] || key} = $${i++}`);
    values.push(val);
  }
  if (fields.length === 0) return getById(orgId, taskId);

  values.push(taskId, orgId);
  const { rows } = await query(
    `UPDATE tasks SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${i++} AND org_id = $${i} RETURNING *`,
    values
  );
  return rows[0];
}

async function remove(orgId, taskId) {
  const { rowCount } = await query(
    "UPDATE tasks SET deleted_at = now() WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL",
    [taskId, orgId]
  );
  if (rowCount === 0) throw ApiError.notFound("TASK_NOT_FOUND", "Task not found");
}

async function assign(orgId, taskId, assigneeUserId) {
  const task = await getById(orgId, taskId);

  const { rows: memberRows } = await query(
    "SELECT 1 FROM org_members WHERE org_id = $1 AND user_id = $2",
    [orgId, assigneeUserId]
  );
  if (memberRows.length === 0) {
    throw ApiError.badRequest(
      "ASSIGNEE_NOT_IN_ORG",
      "Assignee must belong to the same organization"
    );
  }

  const { rows: userRows } = await query("SELECT email, name FROM users WHERE id = $1", [
    assigneeUserId,
  ]);
  const assignee = userRows[0];

  const { rows } = await query(
    `INSERT INTO task_assignments (task_id, user_id) VALUES ($1,$2)
     ON CONFLICT (task_id, user_id) DO NOTHING
     RETURNING *`,
    [taskId, assigneeUserId]
  );

  enqueueAssignmentEmail({
    taskId,
    taskTitle: task.title,
    assigneeEmail: assignee.email,
    assigneeName: assignee.name,
  }).catch((err) => console.error("Failed to enqueue assignment email", err));

  return rows[0] || { task_id: taskId, user_id: assigneeUserId, already_assigned: true };
}

async function unassign(orgId, taskId, userId) {
  await getById(orgId, taskId);
  const { rowCount } = await query(
    "DELETE FROM task_assignments WHERE task_id = $1 AND user_id = $2",
    [taskId, userId]
  );
  if (rowCount === 0) throw ApiError.notFound("ASSIGNMENT_NOT_FOUND", "Assignment not found");
}

async function listAssignees(orgId, taskId) {
  await getById(orgId, taskId);
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, a.assigned_at
     FROM task_assignments a JOIN users u ON u.id = a.user_id
     WHERE a.task_id = $1 ORDER BY a.assigned_at`,
    [taskId]
  );
  return rows;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  assign,
  unassign,
  listAssignees,
};
