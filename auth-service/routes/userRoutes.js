require("dotenv").config();
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, csrfProtection } = require('../middleware/auth');
const jwt = require("jsonwebtoken");
const User = require("../models/user");

router.get("/check-auth", (req, res) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ authenticated: false });
    }

    try {
      const user = await User.findById(decoded.userId);
      let isAdmin = false;
      if(user.email == process.env.ADMIN_EMAIL)
      {
        isAdmin = true;
      }
      console.log("Here");
      if (user) {
        console.log("User Authenticated:", user._id); 
        return res.json({ authenticated: true, userId: user._id.toString(), isAdmin: isAdmin });
      } else {
        return res.status(401).json({ authenticated: false });
      }
    } catch (error) {
      console.error("Error verifying user:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  });
});


router.get('/profile', isAuthenticated, userController.profile);

router.get('/dashboard', isAuthenticated, userController.dashboard);

module.exports = router;