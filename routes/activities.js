const express = require("express")
const router = express.Router()
const Activity = require("../models/Activity")
const Image = require("../models/Image")
const { protect, storeAdmin } = require("../Middleware/authMiddleware")
const { uploadAndProcessMultiple } = require("../Middleware/uploadMiddleware")
const User = require("../models/User");

// GET all activities (with destination and images populated)
router.get("/", async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    res.json(activities)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/by-destination/:destinationId', async (req, res) => {
  const { destinationId } = req.params;

  try {
    const activities = await Activity.find({ destination: destinationId })
      .populate('destination')
      .populate("images")
      .populate("primaryImage");

    if (activities.length === 0) {
      return res.status(404).json({ message: 'No activities found for this destination.' });
    }

    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching activities.' });
  }
});

// GET a single activity by ID (with destination and images populated)
router.get("/:id", async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" })
    }
    res.json(activity)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// CREATE a new activity with image upload
router.post("/", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const activityData = {
      name: req.body.name,
      type: req.body.type,
      location: req.body.location,
      destination: req.body.destination,
      description: req.body.description,
      difficulty: req.body.difficulty,
      cost: req.body.cost,
      availableDates: req.body.availableDates,
      safetyInfo: req.body.safetyInfo,
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
          entityType: 'activity',
          isPrimary: i === 0, // First image is primary
          tags: req.body.tags ? req.body.tags.split(',') : [],
          description: req.body.imageDescriptions ? req.body.imageDescriptions.split(',')[i] : ''
        })
        const savedImage = await image.save()
        imageIds.push(savedImage._id)
      }
      
      activityData.images = imageIds
      activityData.primaryImage = imageIds[0] // Set first image as primary
    }

    const activity = new Activity(activityData)
    const newActivity = await activity.save()
    
    // Populate the saved activity with images
    const populatedActivity = await Activity.findById(newActivity._id)
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    
    res.status(201).json(populatedActivity)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// UPDATE an activity by ID with image upload
router.put("/:id", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" })
    }

    // Check if user is owner or admin
    if (activity.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this activity" })
    }

    const updateData = {
      name: req.body.name,
      type: req.body.type,
      location: req.body.location,
      destination: req.body.destination,
      description: req.body.description,
      difficulty: req.body.difficulty,
      cost: req.body.cost,
      availableDates: req.body.availableDates,
      safetyInfo: req.body.safetyInfo,
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const imageIds = [...(activity.images || [])] // Keep existing images
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const image = new Image({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64'),
          uploadedBy: req.user._id,
          entityType: 'activity',
          entityId: activity._id,
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

    const updatedActivity = await Activity.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("destination").populate("images").populate("primaryImage")
    
    res.json(updatedActivity)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE an activity by ID
router.delete("/:id", protect, storeAdmin, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" })
    }

    // Check if user is owner or admin
    if (activity.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this activity" })
    }

    // Delete associated images
    if (activity.images && activity.images.length > 0) {
      await Image.deleteMany({ _id: { $in: activity.images } })
    }

    await activity.deleteOne()
    res.json({ message: "Activity deleted successfully" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
