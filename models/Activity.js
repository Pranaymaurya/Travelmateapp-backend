const mongoose = require("mongoose")

const ActivitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // e.g., Water, Land, Air
  location: String,
  destination: { type: mongoose.Schema.Types.ObjectId, ref: "Destination" },
  description: String,
  difficulty: String,
  cost: Number,
  // Updated image fields to use Image model references
  images: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  }],
  primaryImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  },
  averageRating: { type: Number, default: 0 }, // Added averageRating
  availableDates: [Date],
  safetyInfo: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
})

const Activity = mongoose.models.Activity || mongoose.model("Activity", ActivitySchema)

module.exports = Activity
