const express = require("express");
const controller = require("../controllers/projects.controller");
const { requireAuth, requireOrgMembership, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireOrgMembership);

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getById);
router.patch("/:id", controller.update);
router.delete("/:id", requireRole("org_admin"), controller.remove); // admin-only delete
router.get("/:id/dashboard", controller.dashboard);

module.exports = router;
