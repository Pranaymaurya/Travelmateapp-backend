const mongoose = require("mongoose")

const BookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingType: {
      type: String,
      enum: ["Trip", "Restaurant", "Rental", "Activity", "Stay"],
      required: true,
    },
    // References to each type (only one will be set per booking)
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
    },
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
    },
    stay: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stay",
    },
    // Common fields
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled", "Completed", "Refunded"],
      default: "Pending",
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    paymentDetails: {
      paymentMethod: {
        type: String,
        enum: ["Credit Card", "PayPal", "Bank Transfer", "Other"],
      },
      transactionId: String,
      paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed", "Refunded"],
        default: "Pending",
      },
    },
    // Trip-specific fields
    travelDate: {
      startDate: Date,
      endDate: Date,
    },
    category: String,
    travelers: Number,
    bookedAtPrice: Number,
    specialRequests: String,
    accommodation: {
      type: {
        type: String,
        enum: ["Hotel", "Resort", "Hostel", "Apartment", "Villa", "Camping"],
      },
      roomType: {
        type: String,
        enum: ["Single", "Double", "Twin", "Suite", "Family", "Dormitory"],
      },
    },
    transportation: String,
    mealPlan: String,
    insurance: {
      included: Boolean,
      type: String,
    },
    guide: {
      included: Boolean,
      type: String,
    },
    activities: [
      {
        name: String,
        included: Boolean,
        price: Number,
      },
    ],
    cancellationPolicy: String,
    notes: String,
    // Restaurant-specific fields
    reservation: {
      date: Date,
      time: String,
      people: Number,
      table: String,
    },
    // Rental-specific fields
    rentalDetails: {
      from: Date,
      to: Date,
      extras: [String],
    },
    // Activity-specific fields
    activityDetails: {
      date: Date,
      participants: Number,
    },
    // Stay-specific fields
    stayDetails: {
      checkIn: Date,
      checkOut: Date,
      roomType: String,
      guests: Number,
    },
  },
  {
    timestamps: true,
  },
)

BookingSchema.index({ user: 1, status: 1 })
BookingSchema.index({ bookingType: 1, status: 1 })
BookingSchema.index({ "travelDate.startDate": 1 })

module.exports = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);

