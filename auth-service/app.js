require("dotenv").config();
const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const User = require("./models/user");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5004', // Allow requests from your frontend origin
  credentials: true, // Allow cookies to be sent with requests
  allowedHeaders: ["Content-Type","X-XSRF-TOKEN"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"] 
}));

app.use(cookieParser());
app.use(bodyParser.json());


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// Passport Google Strategy (Keep this in app.js or move to a passport config file)
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5009/auth/google/callback",
      accessType: "offline",
      prompt: "consent",
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("Received refreshToken:", refreshToken);
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          user.accessToken = accessToken;
          user.refreshToken = refreshToken;
          await user.save();
          return done(null, user);
        } else {
          const newUser = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            username: profile.displayName.replace(/\s/g, ''),
            accessToken: accessToken,
            refreshToken: refreshToken,
          });
          await newUser.save();
          return done(null, newUser);
        }
      } catch (error) {
        console.error("Error saving user:", error);
        return done(error);
      }
    }
  )
);

// Routes
app.get("/", (req, res) => {
  res.redirect("http://localhost:5004");
});

app.get("/csrf-token", (req, res) => {
  const token = require('jsonwebtoken').sign({ action: "csrf" }, process.env.CSRF_SECRET || process.env.JWT_SECRET, { expiresIn: '1h' });
  res.cookie("XSRF-TOKEN", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: 'Strict',
  });
  res.json({ csrfToken: token });
});

app.use("/auth", authRoutes);
app.use("/user", userRoutes);

// Error handling middleware (optional)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(5009, () => {
  console.log("Auth service running on port 5009");
});