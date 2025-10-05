const passport = require("passport");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const User = require("../models/user");

exports.googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

exports.googleCallback = async (req, res) => {
  const user = req.user;
  const accessToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const refreshTokenJwt = jwt.sign(
    { refreshToken: user.refreshToken },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  res.cookie("jwt", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 365 * 24 * 60 * 60 * 1000,
    sameSite: 'Lax',
    path:'/',
  });

  res.cookie("refreshTokenJwt", refreshTokenJwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 800 * 24 * 60 * 60 * 1000,
  });
  console.log("JWT cookie set:", accessToken);
  res.redirect("http://localhost:5004/dashboard");
};

exports.refreshToken = async (req, res) => {
  const refreshTokenJwtCookie = req.cookies.refreshTokenJwt;

  if (!refreshTokenJwtCookie) {
    return res.status(401).json({ message: "No refresh token found" });
  }

  try {
    const decodedRefreshTokenJwt = jwt.verify(
      refreshTokenJwtCookie,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const refreshToken = decodedRefreshTokenJwt.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    const { tokens } = await oAuth2Client.refreshAccessToken();
    const newAccessToken = tokens.access_token;

    user.accessToken = newAccessToken;
    await user.save();

    const newAccessTokenJwt = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("jwt", newAccessTokenJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000,
    });

    res.redirect("user/dashboard");
  } catch (error) {
    console.error("Error refreshing access token:", error);
    res.clearCookie("jwt");
    res.clearCookie("refreshTokenJwt");
    res.redirect("/");
  }
};

exports.logout = (req, res) => {
  res.clearCookie("jwt");
  res.clearCookie("refreshTokenJwt");
  res.status(200).json({ message: "Logout successful" });
};
