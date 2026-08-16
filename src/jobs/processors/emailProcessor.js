async function processEmailJob(job) {
  const { taskId, taskTitle, assigneeEmail, assigneeName } = job.data;

 
  console.log(
    `[mock email] To: ${assigneeEmail} | Subject: You were assigned "${taskTitle}"\n` +
      `  Hi ${assigneeName}, you have been assigned task ${taskId}.`
  );

  return { sent: true };
}

module.exports = processEmailJob;
