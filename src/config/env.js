require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS || 7),
  },
  bcryptCost: Number(process.env.BCRYPT_COST || 12),
  emailFrom: process.env.EMAIL_FROM || "noreply@taskflow.local",
};
