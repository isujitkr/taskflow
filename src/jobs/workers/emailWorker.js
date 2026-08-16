const { Worker } = require("bullmq");
const connection = require("../../config/redis");
const { QUEUE_NAME } = require("../queues/emailQueue");
const processEmailJob = require("../processors/emailProcessor");

const worker = new Worker(QUEUE_NAME, processEmailJob, {
  connection,
  concurrency: 5,
  limiter: { max: 50, duration: 60 * 1000 },
});

worker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
});

console.log("Email worker started, waiting for jobs...");

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
