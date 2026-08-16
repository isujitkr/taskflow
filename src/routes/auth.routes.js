const express = require("express");
const controller = require("../controllers/auth.controller");
const { authRateLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.use(authRateLimiter);

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);

module.exports = router;
