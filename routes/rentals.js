const express = require("express")
const router = express.Router()
const Rental = require("../models/Rental")
const Image = require("../models/Image")
const { protect, storeAdmin } = require("../Middleware/authMiddleware")
const { uploadAndProcessMultiple } = require("../Middleware/uploadMiddleware")

// GET all rentals (with destination and images populated)
router.get("/", async (req, res) => {
  try {
    const rentals = await Rental.find()
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    res.json(rentals)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET rentals by destination
router.get('/by-destination/:destinationId', async (req, res) => {
  const { destinationId } = req.params;

  try {
    const rentals = await Rental.find({ destination: destinationId })
      .populate('destination')
      .populate("images")
      .populate("primaryImage");

    if (rentals.length === 0) {
      return res.status(404).json({ message: 'No rentals found for this destination.' });
    }

    res.json(rentals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching rentals.' });
  }
});

// GET a single rental by ID (with destination and images populated)
router.get("/:id", async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" })
    }
    res.json(rental)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// CREATE a new rental with image upload
router.post("/", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const rentalData = {
      type: req.body.type,
      brand: req.body.brand,
      model: req.body.model,
      location: req.body.location,
      destination: req.body.destination,
      pricing: {
        perHour: req.body.perHour,
        perDay: req.body.perDay,
      },
      availability: {
        from: req.body.availabilityFrom,
        to: req.body.availabilityTo,
      },
      features: req.body.features ? req.body.features.split(',') : [],
      description: req.body.description,
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
          entityType: 'rental',
          isPrimary: i === 0, // First image is primary
          tags: req.body.tags ? req.body.tags.split(',') : [],
          description: req.body.imageDescriptions ? req.body.imageDescriptions.split(',')[i] : ''
        })
        const savedImage = await image.save()
        imageIds.push(savedImage._id)
      }
      
      rentalData.images = imageIds
      rentalData.primaryImage = imageIds[0] // Set first image as primary
    }

    const rental = new Rental(rentalData)
    const newRental = await rental.save()
    
    // Populate the saved rental with images
    const populatedRental = await Rental.findById(newRental._id)
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    
    res.status(201).json(populatedRental)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// UPDATE a rental by ID with image upload
router.put("/:id", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id)
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" })
    }

    // Check if user is owner or admin
    if (rental.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this rental" })
    }

    const updateData = {
      type: req.body.type,
      brand: req.body.brand,
      model: req.body.model,
      location: req.body.location,
      destination: req.body.destination,
      pricing: {
        perHour: req.body.perHour,
        perDay: req.body.perDay,
      },
      availability: {
        from: req.body.availabilityFrom,
        to: req.body.availabilityTo,
      },
      features: req.body.features ? req.body.features.split(',') : [],
      description: req.body.description,
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const imageIds = [...(rental.images || [])] // Keep existing images
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const image = new Image({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64'),
          uploadedBy: req.user._id,
          entityType: 'rental',
          entityId: rental._id,
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

    const updatedRental = await Rental.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("destination").populate("images").populate("primaryImage")
    
    res.json(updatedRental)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE a rental by ID
router.delete("/:id", protect, storeAdmin, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id)
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" })
    }

    // Check if user is owner or admin
    if (rental.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this rental" })
    }

    // Delete associated images
    if (rental.images && rental.images.length > 0) {
      await Image.deleteMany({ _id: { $in: rental.images } })
    }

    await rental.deleteOne()
    res.json({ message: "Rental deleted successfully" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
