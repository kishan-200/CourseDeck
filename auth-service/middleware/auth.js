const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.isAuthenticated = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.redirect("/auth/refresh");
        }
        return res.status(401).json({ message: "Unauthorized" });
      } else {
        try {
          const user = await User.findById(decoded.userId);
          if (user) {
            req.user = user;
            return next();
          } else {
            return res.status(401).json({ message: "Unauthorized" });
          }
        } catch (error) {
          console.error("Error finding user:", error);
          return res.status(500).json({ message: "Internal Server Error" });
        }
      }
    });
  } else {
    return res.redirect("/");
  }
};

exports.csrfProtection = (req, res, next) => {
  console.log("--- CSRF Protection Triggered ---");
  console.log("Request Method:", req.method); // Log the method
  console.log("Request Path:", req.path); // Log the path
  // Log all headers exactly as Express sees them (keys will be lowercase)
  console.log("Raw Request Headers:", JSON.stringify(req.headers, null, 2));

  const csrfTokenCookie = req.cookies["XSRF-TOKEN"];
  // Explicitly read the lowercase header name
  const csrfTokenHeader = req.headers["x-xsrf-token"]; // Use lowercase 'x-xsrf-token'

  console.log("Cookie Token Found:", csrfTokenCookie ? "Yes" : "No");
  console.log(
    "Header Token Found (x-xsrf-token):",
    csrfTokenHeader ? "Yes" : "No"
  );
  console.log("Cookie Token:", csrfTokenCookie);
  console.log("Header Token:", csrfTokenHeader);
  if (
    !csrfTokenCookie ||
    !csrfTokenHeader ||
    csrfTokenCookie !== csrfTokenHeader
  ) {
    return res.status(403).json({ message: "CSRF token validation failed" });
  }
  next();
};
