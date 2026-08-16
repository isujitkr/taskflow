const rateLimit = require("express-rate-limit");

const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests, slow down",
    code: "RATE_LIMITED",
    details: {},
  },
});

module.exports = { authRateLimiter };
