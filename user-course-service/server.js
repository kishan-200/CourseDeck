const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const Cart = require("./models/cartModel");
const Course = require("./models/courseModel");


const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5004", credentials: true }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

// Fetch all courses added by the user
app.get('/mycourses', async (req, res) => {
  const { user_id } = req.query;
  const courses = await Cart.find({ user_id });
  res.json(courses);
});

// Fetch a specific course from My Courses
app.get('/mycourses/:id', async (req, res) => {
  const course = await Cart.findById(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json(course);
});

// Add a course to My Courses
app.post('/mycourses', async (req, res) => {
  const { userId, title, details, category, available } = req.body;
  const course = new Cart({ userId, title, details, category, available });
  await course.save();
  res.status(201).json(course);
});

// Add a course to the user's cart
app.post('/cart/add', async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ message: "User ID and Course ID are required." });
    }

    let cart = await Cart.findOne({ user_id: userId });

    if (!cart) {
      cart = new Cart({ user_id: userId, courses: [] });
    }

    // Check if the course is already in the cart
    const isCourseInCart = cart.courses.some(course => course.courseId.toString() === courseId);
    if (isCourseInCart) {
      return res.status(400).json({ message: "Course already in cart." });
    }

    // Add course to cart
    cart.courses.push({ courseId });
    await cart.save();

    res.status(201).json({ message: "Course added to cart successfully.", cart });

  } catch (error) {
    console.error("Error adding course to cart:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete('/cart/remove', async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ message: "User ID and Course ID are required." });
    }

    // Find the user's cart
    let cart = await Cart.findOne({ user_id: userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Remove the specific course
    cart.courses = cart.courses.filter(course => course.courseId.toString() !== courseId);

    // Save the updated cart
    await cart.save();

    res.status(200).json({ message: "Course removed from cart successfully.", cart });

  } catch (error) {
    console.error("Error removing course from cart:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get('/cart/:userId', async (req, res) => {
  try {
    const userId = req.params.userId.trim();
    console.log("Fetching cart for user:", userId);
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Find the cart for this user and populate course details
    const cart = await Cart.findOne({ user_id: userId }).populate("courses.courseId");

    if (!cart || cart.courses.length === 0) {
      return res.status(404).json({ message: "No courses found in cart." });
    }

    res.status(200).json({ courses: cart.courses });

  } catch (error) {
    console.error("Error fetching cart courses:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Edit a course in My Courses
app.put('/mycourses/:id', async (req, res) => {
  const course = await Cart.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json(course);
});

// Remove a course from My Courses
app.delete('/mycourses/:id', async (req, res) => {
  const course = await Cart.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json({ message: 'Course removed' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`User Course Service running on port ${PORT}`));
