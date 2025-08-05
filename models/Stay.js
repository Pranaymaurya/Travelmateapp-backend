const mongoose = require("mongoose")

const StaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // Hotel, Homestay, Hostel
  location: String,
  destination: { type: mongoose.Schema.Types.ObjectId, ref: "Destination" },
  description: String,
  amenities: [String],
  rooms: [
    {
      roomType: String,
      price: Number,
      capacity: Number,
      available: Number,
    },
  ],
  pricing: {
    perNight: Number,
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
  averageRating: { type: Number, default: 0 }, // Added averageRating
  policies: String,
  availability: {
    from: Date,
    to: Date,
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
})

const Stay = mongoose.models.Stay || mongoose.model("Stay", StaySchema)

module.exports = Stay
