const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Home Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

//app.get('/cart', (req, res) => {
//  res.sendFile(path.join(__dirname, 'public/cart.html'));
//});
//
//app.get('/my-courses', (req, res) => {
//  res.sendFile(path.join(__dirname, 'public/my-courses.html'));
//});

app.get(['/cart', '/admin'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', req.path + '.html'));
});


// Logout (#Working)
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`));
