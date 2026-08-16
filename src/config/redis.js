const IORedis = require("ioredis");
const env = require("./env");

const connection = new IORedis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  maxRetriesPerRequest: null,
});

connection.on("connect", () => {
  console.log("Redis connected");
});

connection.on("error", (err) => {
  console.error("Redis error:", err);
});

module.exports = connection;
