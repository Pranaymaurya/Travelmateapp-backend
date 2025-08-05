const mongoose = require("mongoose")

const RestaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  cuisines: [String],
  menu: [{ name: String, price: Number }],
  destination: { type: mongoose.Schema.Types.ObjectId, ref: "Destination" },
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
  description: String,
  openingHours: String,
  averageCost: Number,
  contactInfo: {
    phone: String,
    email: String,
    address: String,
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
})

const Restaurant = mongoose.models.Restaurant || mongoose.model("Restaurant", RestaurantSchema)

module.exports = Restaurant
