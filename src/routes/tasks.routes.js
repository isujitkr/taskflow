const express = require("express");
const controller = require("../controllers/tasks.controller");
const commentsController = require("../controllers/comments.controller");
const { requireAuth, requireOrgMembership } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireOrgMembership);

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.getById);
router.patch("/:id", controller.update);
router.delete("/:id", controller.remove);

router.get("/:id/assignments", controller.listAssignees);
router.post("/:id/assignments", controller.assign);
router.delete("/:id/assignments/:userId", controller.unassign);

router.get("/:id/comments", commentsController.list);
router.post("/:id/comments", commentsController.create);

module.exports = router;
