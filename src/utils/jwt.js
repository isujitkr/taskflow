const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");

function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret); 
}

function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);
  return { raw, hash, expiresAt };
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

module.exports = { signAccessToken, verifyAccessToken, generateRefreshToken, hashToken };
