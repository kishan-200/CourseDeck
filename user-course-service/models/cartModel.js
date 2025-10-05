const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User", // Reference to the User model
  },
  courses: [
    {
      courseId: {
        type: mongoose.Schema.Types.ObjectId, // Store as ObjectId
        required: true,
        ref: "Course", // Reference to Course model
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
