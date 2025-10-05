const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  //_id: {
  //  type: mongoose.Schema.Types.ObjectId,
  //  required: true,
  //},
  name: {
    type: String,
    required: true,
  },

  price: {
    type: String,
    required: true,
  },

  image: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
});

const Course = mongoose.model("Course",courseSchema)
module.exports = Course
