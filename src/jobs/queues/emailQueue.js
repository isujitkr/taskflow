const { Queue } = require("bullmq");
const connection = require("../../config/redis");

const QUEUE_NAME = "email-notifications";

const emailQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 }, 
    removeOnComplete: 1000,
    removeOnFail: false,
  },
});

async function enqueueAssignmentEmail({ taskId, taskTitle, assigneeEmail, assigneeName }) {

  return emailQueue.add(
    "task-assigned",
    { taskId, taskTitle, assigneeEmail, assigneeName },
    {}
  );
}

module.exports = { emailQueue, QUEUE_NAME, enqueueAssignmentEmail };
