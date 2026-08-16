const { verifyAccessToken } = require("../utils/jwt");
const { query } = require("../config/db");
const ApiError = require("../utils/apiError");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw ApiError.unauthorized("MISSING_TOKEN", "Missing bearer token");
    }
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(ApiError.unauthorized("INVALID_TOKEN", "Invalid or expired token"));
  }
}

async function requireOrgMembership(req, res, next) {
  try {
    const orgId = req.headers["x-org-id"];
    if (!orgId) {
      throw ApiError.badRequest("MISSING_ORG_ID", "X-Org-Id header is required");
    }
    const { rows } = await query(
      "SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2",
      [orgId, req.user.id]
    );
    if (rows.length === 0) {
      throw ApiError.forbidden("NOT_ORG_MEMBER", "Not a member of this organization");
    }
    req.org = { id: orgId, role: rows[0].role };
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.org || !roles.includes(req.org.role)) {
      return next(ApiError.forbidden("INSUFFICIENT_ROLE", "Insufficient role for this action"));
    }
    next();
  };
}

module.exports = { requireAuth, requireOrgMembership, requireRole };
