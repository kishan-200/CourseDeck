exports.profile = (req, res) => {
  res.json({ message: `Welcome ${req.user.username} (${req.user.email})`});
};


exports.dashboard = (req,res) => {
  //let arr = [req.user.username, req.user.email];
  res.json({user: req.user});
};