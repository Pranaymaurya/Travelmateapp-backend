const express = require("express")
const router = express.Router()
const Stay = require("../models/Stay")
const Image = require("../models/Image")
const { protect, storeAdmin } = require("../Middleware/authMiddleware")
const { uploadAndProcessMultiple } = require("../Middleware/uploadMiddleware")

// GET all stays (with destination and images populated)
router.get("/", async (req, res) => {
  try {
    const stays = await Stay.find()
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    res.json(stays)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET stays by destination
router.get('/by-destination/:destinationId', async (req, res) => {
  const { destinationId } = req.params;

  try {
    const stays = await Stay.find({ destination: destinationId })
      .populate('destination')
      .populate("images")
      .populate("primaryImage");

    if (stays.length === 0) {
      return res.status(404).json({ message: 'No stays found for this destination.' });
    }

    res.json(stays);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching stays.' });
  }
});

// GET a single stay by ID (with destination and images populated)
router.get("/:id", async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id)
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    if (!stay) {
      return res.status(404).json({ message: "Stay not found" })
    }
    res.json(stay)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// CREATE a new stay with image upload
router.post("/", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const stayData = {
      name: req.body.name,
      type: req.body.type,
      location: req.body.location,
      destination: req.body.destination,
      description: req.body.description,
      amenities: req.body.amenities ? req.body.amenities.split(',') : [],
      rooms: req.body.rooms ? JSON.parse(req.body.rooms) : [],
      pricing: {
        perNight: req.body.perNight
      },
      policies: req.body.policies,
      availability: {
        from: req.body.availabilityFrom,
        to: req.body.availabilityTo
      },
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
          entityType: 'stay',
          isPrimary: i === 0, // First image is primary
          tags: req.body.tags ? req.body.tags.split(',') : [],
          description: req.body.imageDescriptions ? req.body.imageDescriptions.split(',')[i] : ''
        })
        const savedImage = await image.save()
        imageIds.push(savedImage._id)
      }
      
      stayData.images = imageIds
      stayData.primaryImage = imageIds[0] // Set first image as primary
    }

    const stay = new Stay(stayData)
    const newStay = await stay.save()
    
    // Populate the saved stay with images
    const populatedStay = await Stay.findById(newStay._id)
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    
    res.status(201).json(populatedStay)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// UPDATE a stay by ID with image upload
router.put("/:id", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id)
    if (!stay) {
      return res.status(404).json({ message: "Stay not found" })
    }

    // Check if user is owner or admin
    if (stay.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this stay" })
    }

    const updateData = {
      name: req.body.name,
      type: req.body.type,
      location: req.body.location,
      destination: req.body.destination,
      description: req.body.description,
      amenities: req.body.amenities ? req.body.amenities.split(',') : [],
      rooms: req.body.rooms ? JSON.parse(req.body.rooms) : [],
      pricing: {
        perNight: req.body.perNight
      },
      policies: req.body.policies,
      availability: {
        from: req.body.availabilityFrom,
        to: req.body.availabilityTo
      },
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const imageIds = [...(stay.images || [])] // Keep existing images
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const image = new Image({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64'),
          uploadedBy: req.user._id,
          entityType: 'stay',
          entityId: stay._id,
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

    const updatedStay = await Stay.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("destination").populate("images").populate("primaryImage")
    
    res.json(updatedStay)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE a stay by ID
router.delete("/:id", protect, storeAdmin, async (req, res) => {
  try {
    const stay = await Stay.findById(req.params.id)
    if (!stay) {
      return res.status(404).json({ message: "Stay not found" })
    }

    // Check if user is owner or admin
    if (stay.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this stay" })
    }

    // Delete associated images
    if (stay.images && stay.images.length > 0) {
      await Image.deleteMany({ _id: { $in: stay.images } })
    }

    await stay.deleteOne()
    res.json({ message: "Stay deleted successfully" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
