const mongoose = require("mongoose")

const ReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    itemType: {
      type: String,
      required: true,
      // enum: ["Activity", "Stay", "Trip", "Rental", "Restaurant"],
      enum: ["activity", "stay", "trip", "rental", "restaurant"],
    },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    // Added image support for reviews
    images: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image"
    }],
  },
  { timestamps: true },
)

ReviewSchema.index({ itemType: 1, itemId: 1 })

const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema)

module.exports = Review
