const mongoose = require("mongoose")

const TripSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  location: {
    type: String,
  },
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Destination",
  },
  duration: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  originalPrice: {
    type: Number,
  },
  discount: {
    type: Number,
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  // Updated image fields to use Image model references
  images: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  }],
  primaryImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  },
  gradient: {
    type: [String],
  },
  tag: {
    type: String,
  },
  highlights: {
    type: [String],
  },
  category: {
    type: String,
    enum: [
      "Adventure",
      "Cultural",
      "Relaxation",
      "Business",
      "Honeymoon",
      "Family",
      "Solo",
      "Group",
      "Luxury",
      "Budget",
    ],
    required: true,
    default: "Cultural",
  },
  subCategories: [
    {
      type: String,
      enum: [
        "Beach",
        "Mountain",
        "City",
        "Wildlife",
        "Heritage",
        "Food",
        "Shopping",
        "Nightlife",
        "Nature",
        "Sports",
        "Wellness",
        "Photography",
        "Education",
        "Volunteer",
        "Cruise",
        "Road Trip",
      ],
    },
  ],
  difficulty: {
    type: String,
    enum: ["Easy", "Moderate", "Challenging", "Expert"],
    default: "Easy",
  },
  status: {
    type: String,
  },
  bookingDate: {
    type: Date,
  },
  travelDate: {
    type: String,
  },
  type: {
    type: String,
  },
  provider: {
    type: String,
  },
  time: {
    type: String,
  },
  passengers: {
    type: Number,
  },
  guests: {
    type: Number,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

TripSchema.index({ category: 1, status: 1 })
TripSchema.index({ price: 1 })
TripSchema.index({ averageRating: -1 })
TripSchema.index({ createdAt: -1 })

const Trip = mongoose.models.Trip || mongoose.model("Trip", TripSchema)

module.exports = Trip
