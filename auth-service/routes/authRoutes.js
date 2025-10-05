const passport = require("passport"); // Make sure this is at the top
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { csrfProtection } = require("../middleware/auth");

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    accessType: "offline",
    prompt: "consent",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/", session: false }),
  authController.googleCallback
); // Added session: false option
router.get("/refresh", authController.refreshToken);
router.get("/logout", csrfProtection, authController.logout);

module.exports = router;
