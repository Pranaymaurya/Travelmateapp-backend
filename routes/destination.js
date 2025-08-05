const express = require("express")
const router = express.Router()
const Destination = require("../models/destination")
const Image = require("../models/Image")
const { protect, storeAdmin } = require("../Middleware/authMiddleware")
const { uploadAndProcessMultiple } = require("../Middleware/uploadMiddleware")

// GET all destinations (with images populated)
router.get("/", async (req, res) => {
  try {
    const destinations = await Destination.find()
      .populate("images")
      .populate("primaryImage")
    res.json(destinations)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET a single destination by ID (with images populated)
router.get("/:id", async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id)
      .populate("images")
      .populate("primaryImage")
    if (!destination) {
      return res.status(404).json({ message: "Destination not found" })
    }
    res.json(destination)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// CREATE a new destination with image upload
router.post("/", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const destinationData = {
      name: req.body.name,
      country: req.body.country,
      city: req.body.city,
      description: req.body.description,
      coordinates: {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      },
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
          entityType: 'destination',
          isPrimary: i === 0, // First image is primary
          tags: req.body.tags ? req.body.tags.split(',') : [],
          description: req.body.imageDescriptions ? req.body.imageDescriptions.split(',')[i] : ''
        })
        const savedImage = await image.save()
        imageIds.push(savedImage._id)
      }
      
      destinationData.images = imageIds
      destinationData.primaryImage = imageIds[0] // Set first image as primary
    }

    const destination = new Destination(destinationData)
    const newDestination = await destination.save()
    
    // Populate the saved destination with images
    const populatedDestination = await Destination.findById(newDestination._id)
      .populate("images")
      .populate("primaryImage")
    
    res.status(201).json(populatedDestination)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// UPDATE a destination by ID with image upload
router.put("/:id", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id)
    if (!destination) {
      return res.status(404).json({ message: "Destination not found" })
    }

    const updateData = {
      name: req.body.name,
      country: req.body.country,
      city: req.body.city,
      description: req.body.description,
      coordinates: {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      },
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const imageIds = [...(destination.images || [])] // Keep existing images
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const image = new Image({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64'),
          uploadedBy: req.user._id,
          entityType: 'destination',
          entityId: destination._id,
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

    const updatedDestination = await Destination.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("images").populate("primaryImage")
    
    res.json(updatedDestination)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE a destination by ID
router.delete("/:id", protect, storeAdmin, async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id)
    if (!destination) {
      return res.status(404).json({ message: "Destination not found" })
    }

    // Delete associated images
    if (destination.images && destination.images.length > 0) {
      await Image.deleteMany({ _id: { $in: destination.images } })
    }

    const deletedDestination = await Destination.findByIdAndDelete(req.params.id)
    res.json({ message: "Destination deleted successfully" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
