const { query } = require("../config/db");
const ApiError = require("../utils/apiError");

async function listMembers(orgId) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, m.role, m.created_at
     FROM org_members m JOIN users u ON u.id = m.user_id
     WHERE m.org_id = $1 ORDER BY m.created_at`,
    [orgId]
  );
  return rows;
}

async function addMember(orgId, email, role = "member") {
  const { rows: userRows } = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (userRows.length === 0) {
    throw ApiError.notFound("USER_NOT_FOUND", "No user with that email");
  }
  const userId = userRows[0].id;

  const { rows: existing } = await query(
    "SELECT id FROM org_members WHERE org_id = $1 AND user_id = $2",
    [orgId, userId]
  );
  if (existing.length > 0) {
    throw ApiError.conflict("ALREADY_MEMBER", "User is already a member of this org");
  }

  const { rows } = await query(
    "INSERT INTO org_members (org_id, user_id, role) VALUES ($1,$2,$3) RETURNING id, user_id, role",
    [orgId, userId, role]
  );
  return rows[0];
}

async function removeMember(orgId, userId) {
  const { rowCount } = await query(
    "DELETE FROM org_members WHERE org_id = $1 AND user_id = $2",
    [orgId, userId]
  );
  if (rowCount === 0) throw ApiError.notFound("MEMBER_NOT_FOUND", "Member not found in org");
}

module.exports = { listMembers, addMember, removeMember };
