const express = require("express")
const router = express.Router()
const Trip = require("../models/trip")
const Image = require("../models/Image")
const { protect, storeAdmin } = require("../Middleware/authMiddleware")
const { uploadAndProcessMultiple } = require("../Middleware/uploadMiddleware")

// GET all trips (with destination and images populated)
router.get("/", async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    res.json(trips)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET a single trip by ID (with destination and images populated)
router.get("/:id", async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" })
    }
    res.json(trip)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// CREATE a new trip with image upload
router.post("/", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const tripData = {
      title: req.body.title,
      location: req.body.location,
      destination: req.body.destination,
      duration: req.body.duration,
      price: req.body.price,
      originalPrice: req.body.originalPrice,
      discount: req.body.discount,
      gradient: req.body.gradient,
      tag: req.body.tag,
      highlights: req.body.highlights,
      category: req.body.category,
      subCategories: req.body.subCategories,
      difficulty: req.body.difficulty,
      status: req.body.status,
      bookingDate: req.body.bookingDate,
      travelDate: req.body.travelDate,
      type: req.body.type,
      provider: req.body.provider,
      time: req.body.time,
      passengers: req.body.passengers,
      guests: req.body.guests,
      owner: req.user._id,
    }

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageIds = []
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const image = new Image({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64'),
          uploadedBy: req.user._id,
          entityType: 'trip',
          isPrimary: i === 0, // First image is primary
          tags: req.body.tags ? req.body.tags.split(',') : [],
          description: req.body.imageDescriptions ? req.body.imageDescriptions.split(',')[i] : ''
        })
        const savedImage = await image.save()
        imageIds.push(savedImage._id)
      }
      
      tripData.images = imageIds
      tripData.primaryImage = imageIds[0] // Set first image as primary
    }

    const trip = new Trip(tripData)
    const newTrip = await trip.save()
    
    // Populate the saved trip with images
    const populatedTrip = await Trip.findById(newTrip._id)
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    
    res.status(201).json(populatedTrip)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// UPDATE a trip by ID with image upload
router.put("/:id", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" })
    }

    // Check if user is owner or admin
    if (trip.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this trip" })
    }

    const updateData = {
      title: req.body.title,
      location: req.body.location,
      destination: req.body.destination,
      duration: req.body.duration,
      price: req.body.price,
      originalPrice: req.body.originalPrice,
      discount: req.body.discount,
      gradient: req.body.gradient,
      tag: req.body.tag,
      highlights: req.body.highlights,
      category: req.body.category,
      subCategories: req.body.subCategories,
      difficulty: req.body.difficulty,
      status: req.body.status,
      bookingDate: req.body.bookingDate,
      travelDate: req.body.travelDate,
      type: req.body.type,
      provider: req.body.provider,
      time: req.body.time,
      passengers: req.body.passengers,
      guests: req.body.guests,
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const imageIds = [...(trip.images || [])] // Keep existing images
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const image = new Image({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64'),
          uploadedBy: req.user._id,
          entityType: 'trip',
          entityId: trip._id,
          isPrimary: req.body.isPrimary === 'true' && i === 0,
          tags: req.body.tags ? req.body.tags.split(',') : [],
          description: req.body.imageDescriptions ? req.body.imageDescriptions.split(',')[i] : ''
        })
        const savedImage = await image.save()
        imageIds.push(savedImage._id)
      }
      
      updateData.images = imageIds
      if (req.body.isPrimary === 'true' && req.files.length > 0) {
        updateData.primaryImage = imageIds[imageIds.length - 1] // Set new image as primary
      }
    }

    const updatedTrip = await Trip.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("destination").populate("images").populate("primaryImage")
    
    res.json(updatedTrip)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE a trip by ID
router.delete("/:id", protect, storeAdmin, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" })
    }

    // Check if user is owner or admin
    if (trip.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this trip" })
    }

    // Delete associated images
    if (trip.images && trip.images.length > 0) {
      await Image.deleteMany({ _id: { $in: trip.images } })
    }

    const deletedTrip = await Trip.findByIdAndDelete(req.params.id)
    res.json({ message: "Trip deleted successfully" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
