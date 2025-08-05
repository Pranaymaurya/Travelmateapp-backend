const mongoose = require("mongoose")

const RentalSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., Bike, Car, Scooter
  brand: String,
  model: String,
  location: String,
  destination: { type: mongoose.Schema.Types.ObjectId, ref: "Destination" },
  pricing: {
    perHour: Number,
    perDay: Number,
  },
  availability: {
    from: Date,
    to: Date,
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
  features: [String],
  description: String,
  averageRating: { type: Number, default: 0 }, // Added averageRating
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
})

const Rental = mongoose.models.Rental || mongoose.model("Rental", RentalSchema)

module.exports = Rental
