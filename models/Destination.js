const mongoose = require("mongoose")

const DestinationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  country: { type: String, required: true },
  city: { type: String },
  description: { type: String },
  // Updated image fields to use Image model references
  images: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  }],
  primaryImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  },
  coordinates: {
    // For geographical location
    latitude: Number,
    longitude: Number,
  },
  // You could add references to popular restaurants, stays, activities here
  // For example:
  // popularRestaurants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
  // popularStays: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stay' }],
  // popularActivities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Destination", DestinationSchema)
