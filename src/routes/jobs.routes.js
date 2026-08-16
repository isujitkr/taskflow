const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { emailQueue } = require("../jobs/queues/emailQueue");
const ApiError = require("../utils/apiError");

const router = express.Router();

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const job = await emailQueue.getJob(req.params.id);
    if (!job) throw ApiError.notFound("JOB_NOT_FOUND", "Job not found");

    const state = await job.getState(); 
    const status = ["waiting", "delayed", "waiting-children"].includes(state)
      ? "pending"
      : state;

    res.json({
      id: job.id,
      name: job.name,
      status,
      attemptsMade: job.attemptsMade,
      data: job.data,
      failedReason: job.failedReason || null,
      returnvalue: job.returnvalue || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
