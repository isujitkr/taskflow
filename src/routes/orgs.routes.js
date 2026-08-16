const express = require("express");
const controller = require("../controllers/orgs.controller");
const { requireAuth, requireOrgMembership, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireOrgMembership);

router.get("/members", controller.listMembers);
router.post("/members", requireRole("org_admin"), controller.addMember);
router.delete("/members/:userId", requireRole("org_admin"), controller.removeMember);

module.exports = router;
