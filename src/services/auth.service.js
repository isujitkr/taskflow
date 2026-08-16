const { query, withTransaction } = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/password");
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} = require("../utils/jwt");
const ApiError = require("../utils/apiError");

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7) 
  );
}

async function register({ email, password, name, orgName }) {
  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict("EMAIL_TAKEN", "Email already registered");
  }

  const passwordHash = await hashPassword(password);

  const result = await withTransaction(async (client) => {
    const { rows: userRows } = await client.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1,$2,$3) RETURNING id, email, name",
      [email, passwordHash, name]
    );
    const user = userRows[0];

    const { rows: orgRows } = await client.query(
      "INSERT INTO organizations (name, slug) VALUES ($1,$2) RETURNING id, name",
      [orgName, slugify(orgName)]
    );
    const org = orgRows[0];

    await client.query(
      "INSERT INTO org_members (org_id, user_id, role) VALUES ($1,$2,'org_admin')",
      [org.id, user.id]
    );

    return { user, org };
  });

  const tokens = await issueTokens(result.user.id);
  return { user: result.user, org: result.org, ...tokens };
}

async function login({ email, password }) {
  const { rows } = await query(
    "SELECT id, email, name, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = rows[0];
  console.log(user);
  if (!user) throw ApiError.unauthorized("INVALID_CREDENTIALS", "Invalid email or password");

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) throw ApiError.unauthorized("INVALID_CREDENTIALS", "Invalid email or password");

  const { rows: orgs } = await query(
    `SELECT o.id, o.name, m.role FROM organizations o
     JOIN org_members m ON m.org_id = o.id
     WHERE m.user_id = $1`,
    [user.id]
  );

  const tokens = await issueTokens(user.id);
  return {
    user: { id: user.id, email: user.email, name: user.name },
    organizations: orgs,
    ...tokens,
  };
}

async function issueTokens(userId) {
  const accessToken = signAccessToken(userId);
  const { raw, hash, expiresAt } = generateRefreshToken();
  await query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)",
    [userId, hash, expiresAt]
  );
  return { accessToken, refreshToken: raw };
}

async function refresh(refreshTokenRaw) {
  const hash = hashToken(refreshTokenRaw);
  const { rows } = await query(
    "SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1",
    [hash]
  );
  const record = rows[0];
  if (!record) throw ApiError.unauthorized("INVALID_REFRESH_TOKEN", "Invalid refresh token");
  if (record.revoked_at) throw ApiError.unauthorized("TOKEN_REVOKED", "Refresh token revoked");
  if (new Date(record.expires_at) < new Date()) {
    throw ApiError.unauthorized("TOKEN_EXPIRED", "Refresh token expired");
  }

  const accessToken = signAccessToken(record.user_id);
  return { accessToken };
}

async function logout(refreshTokenRaw) {
  const hash = hashToken(refreshTokenRaw);
  await query(
    "UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
    [hash]
  );
}

module.exports = { register, login, refresh, logout };
