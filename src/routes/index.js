const express = require("express");

const router = express.Router();

const authRoutes = require("../routes/auth.routes");
const orgsRoutes = require("../routes/orgs.routes");
const projectsRoutes = require("../routes/projects.routes");
const tasksRoutes = require("../routes/tasks.routes");
const jobsRoutes = require("../routes/jobs.routes");

router.use("/auth", authRoutes);
router.use("/orgs", orgsRoutes);
router.use("/projects", projectsRoutes);
router.use("/tasks", tasksRoutes);
router.use("/jobs", jobsRoutes);

module.exports = router