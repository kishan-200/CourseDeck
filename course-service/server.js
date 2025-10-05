const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const Course = require("./models/courseModel")

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5004", credentials: true }));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {console.log("MongoDB connected successfully.")});


// Fetch all courses
app.get('/courses', async (req, res) => {
  try{
    const courses = await Course.find({});
    res.json(courses);
  } catch(error) {
    console.error("Error fetching courses:",error);
  }
});

// Fetch a specific course
app.get('/courses/:id', async (req, res) => {
  try{
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  }catch(error){
    console.error("Error fetching courses:",error);
  }

});

// Add a new course
app.post('/courses', async (req, res) => {
  const { name, price, description } = req.body;
  const course = new Course({ name, price, description });
  await course.save();
  res.status(201).json(course);
});

// Edit a course
app.put('/courses/:id', async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json(course);
});

// Delete a course
app.delete('/courses/:id', async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json({ message: 'Course deleted' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Course Service running on port ${PORT}`));
