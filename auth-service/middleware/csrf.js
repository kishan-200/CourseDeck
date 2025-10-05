const jwt = require("jsonwebtoken");

exports.csrfProtection = (req, res, next) => {
    const csrfTokenCookie = req.cookies["XSRF-TOKEN"];
    const csrfTokenHeader = req.headers["X-XSRF-TOKEN"];
  
    if (!csrfTokenCookie || !csrfTokenHeader || csrfTokenCookie !== csrfTokenHeader) {
      console.log("CSRF token validation failed");
      return res.status(403).json({ message: "CSRF token validation failed" });
    }
    next();
  };