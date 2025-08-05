const express = require("express")
const router = express.Router()
const Booking = require("../models/booking")

// Helper function to populate based on bookingType
const populateBooking = (query) => {
  return query
    .populate("user")
    .populate({
      path: "trip",
      model: "Trip",
      populate: { path: "destination", model: "Destination" },
    })
    .populate({
      path: "restaurant",
      model: "Restaurant",
      populate: { path: "destination", model: "Destination" },
    })
    .populate({
      path: "rental", // Assuming you have a Rental model
      model: "Rental",
      populate: { path: "destination", model: "Destination" },
    })
    .populate({
      path: "activity",
      model: "Activity",
      populate: { path: "destination", model: "Destination" },
    })
    .populate({
      path: "stay",
      model: "Stay",
      populate: { path: "destination", model: "Destination" },
    })
}

// GET all bookings
router.get("/", async (req, res) => {
  try {
    const bookings = await populateBooking(Booking.find())
    res.json(bookings)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET a single booking by ID
router.get("/:id", async (req, res) => {
  try {
    const booking = await populateBooking(Booking.findById(req.params.id))
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" })
    }
    res.json(booking)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get("/user/:id", async (req, res) => {
  try {
    // Find all bookings with matching user ID
    const bookings = await Booking.find({ user: req.params.id })

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: "No bookings found for this user" });
    }
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// CREATE a new booking
router.post("/", async (req, res) => {
  const booking = new Booking({
    user: req.body.user,
    bookingType: req.body.bookingType,
    trip: req.body.trip,
    restaurant: req.body.restaurant,
    rental: req.body.rental,
    activity: req.body.activity,
    stay: req.body.stay,
    totalPrice: req.body.totalPrice,
    paymentDetails: req.body.paymentDetails,
    travelDate: req.body.travelDate,
    category: req.body.category,
    travelers: req.body.travelers,
    bookedAtPrice: req.body.bookedAtPrice,
    specialRequests: req.body.specialRequests,
    accommodation: req.body.accommodation,
    transportation: req.body.transportation,
    mealPlan: req.body.mealPlan,
    insurance: req.body.insurance,
    guide: req.body.guide,
    activities: req.body.activities,
    cancellationPolicy: req.body.cancellationPolicy,
    notes: req.body.notes,
    reservation: req.body.reservation,
    rentalDetails: req.body.rentalDetails,
    activityDetails: req.body.activityDetails,
    stayDetails: req.body.stayDetails,
  })

  try {
    const newBooking = await booking.save()
    res.status(201).json(newBooking)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// UPDATE a booking by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedBooking = await populateBooking(
      Booking.findByIdAndUpdate(req.params.id, req.body, {
        new: true, // Return the updated document
        runValidators: true, // Run schema validators on update
      }),
    )
    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" })
    }
    res.json(updatedBooking)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE a booking by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedBooking = await Booking.findByIdAndDelete(req.params.id)
    if (!deletedBooking) {
      return res.status(404).json({ message: "Booking not found" })
    }
    res.json({ message: "Booking deleted successfully" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
