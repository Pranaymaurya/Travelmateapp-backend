const express = require("express")
const router = express.Router()
const Review = require("../models/Review")
const Image = require("../models/Image")
const Activity = require("../models/Activity")
const Stay = require("../models/Stay")
const Trip = require("../models/Trip")
const Rental = require("../models/Rental")
const Restaurant = require("../models/Restaurant")
const { protect } = require("../Middleware/authMiddleware")
const { uploadAndProcessMultiple } = require("../Middleware/uploadMiddleware")

const itemModels = {
  activity: Activity,
  stay: Stay,
  trip: Trip,
  rental: Rental,
  restaurant: Restaurant,
}

async function updateAverageRating(itemType, itemId) {
  try {
    const normalizedType = itemType.toLowerCase()
    const Model = itemModels[normalizedType]
    if (!Model) {
      console.error(`Invalid itemType for rating update: ${itemType}`)
      return
    }

    const reviews = await Review.find({ itemType: normalizedType, itemId })
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0)
    const averageRating = reviews.length ? totalRating / reviews.length : 0

    await Model.findByIdAndUpdate(itemId, {
      averageRating: Number.parseFloat(averageRating.toFixed(1)),
    })
  } catch (error) {
    console.error("Error updating average rating:", error)
  }
}

// POST - Create review with image upload
router.post("/", protect, uploadAndProcessMultiple, async (req, res) => {
  try {
    const { itemType, itemId, rating, comment } = req.body

    // Validate required fields
    if (!itemType || !itemId || !rating) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" })
    }

    // Normalize itemType to lowercase
    const normalizedType = itemType.toLowerCase()
    
    // Get the appropriate model
    const Model = itemModels[normalizedType]
    if (!Model) {
      return res.status(400).json({ 
        message: `Invalid itemType: ${itemType}. Valid types are: ${Object.keys(itemModels).join(', ')}` 
      })
    }

    console.log(`Processing review for ${normalizedType} with ID: ${itemId}`)

    // Check if item exists in the database
    const item = await Model.findById(itemId)
    if (!item) {
      return res.status(404).json({ message: `${itemType} with ID ${itemId} not found` })
    }

    // Check if user already reviewed this specific item
    const existingReview = await Review.findOne({ 
      user: req.user._id, 
      itemType: normalizedType, 
      itemId: itemId 
    })
    
    if (existingReview) {
      return res.status(409).json({ 
        message: "You have already reviewed this item. You can update your existing review instead.",
        existingReviewId: existingReview._id
      })
    }

    // Handle image uploads for review
    let imageIds = []
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const image = new Image({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64'),
          uploadedBy: req.user._id,
          entityType: 'review',
          isPrimary: false, // Review images are not primary
          tags: req.body.tags ? req.body.tags.split(',') : [],
          description: req.body.imageDescriptions ? req.body.imageDescriptions.split(',')[i] : ''
        })
        const savedImage = await image.save()
        imageIds.push(savedImage._id)
      }
    }

    // Create new review
    const reviewData = {
      user: req.user._id,
      itemType: normalizedType,
      itemId,
      rating: Number(rating),
      comment: comment || "",
      images: imageIds,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const newReview = await Review.create(reviewData)

    // Populate user details and images for the response
    await newReview.populate("user", "firstName lastName email")
    await newReview.populate("images")

    // Update item's average rating
    await updateAverageRating(normalizedType, itemId)

    console.log(`Review created successfully for ${normalizedType} ID: ${itemId}`)
    return res.status(201).json({
      success: true,
      message: "Review created successfully",
      review: newReview
    })

  } catch (error) {
    console.error("Error creating review:", error)
    return res.status(500).json({ 
      message: "Error creating review", 
      error: error.message 
    })
  }
})

// GET - Fetch reviews with images
router.get("/item/:itemType/:itemId", async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        message: "Both itemType and itemId are required",
      });
    }

    const normalizedType = itemType.toLowerCase();

    const reviews = await Review.find({
      itemType: normalizedType,
      itemId: itemId,
    })
      .populate("user", "firstName lastName email")
      .populate("images")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching item reviews:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching item reviews",
      error: error.message,
    });
  }
});

router.get("/item", async (req, res) => {
  try {
    const { itemType, itemId, userId } = req.query

    let query = {}
    
    if (itemType && itemId) {
      const normalizedType = itemType.toLowerCase()
      query = { itemType: normalizedType, itemId }
    } else if (userId) {
      query = { user: userId }
    }

    const reviews = await Review.find(query)
      .populate("user", "firstName lastName email")
      .populate("images")
      .sort({ createdAt: -1 }) // Sort by newest first

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    res.status(500).json({ 
      message: "Error fetching reviews", 
      error: error.message 
    })
  }
})

// PUT - Update review with image upload
router.put("/", protect, uploadAndProcessMultiple, async (req, res) => {
  try {
    const { reviewId, rating, comment } = req.body

    if (!reviewId) {
      return res.status(400).json({ message: "Missing reviewId" })
    }

    if (!rating && !comment && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: "At least rating, comment, or images must be provided" })
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" })
    }

    // Find the existing review
    const existingReview = await Review.findById(reviewId)
    if (!existingReview) {
      return res.status(404).json({ message: "Review not found" })
    }

    // Check if the user owns this review
    if (existingReview.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own reviews" })
    }

    // Handle new image uploads
    let imageIds = [...(existingReview.images || [])] // Keep existing images
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const image = new Image({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64'),
          uploadedBy: req.user._id,
          entityType: 'review',
          entityId: reviewId,
          isPrimary: false,
          tags: req.body.tags ? req.body.tags.split(',') : [],
          description: req.body.imageDescriptions ? req.body.imageDescriptions.split(',')[i] : ''
        })
        const savedImage = await image.save()
        imageIds.push(savedImage._id)
      }
    }

    // Update the review
    const updateData = { 
      updatedAt: new Date(),
      images: imageIds
    }
    if (rating !== undefined) updateData.rating = Number(rating)
    if (comment !== undefined) updateData.comment = comment

    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      updateData,
      { new: true }
    ).populate("user", "firstName lastName email").populate("images")

    // Update average rating for the item
    await updateAverageRating(updatedReview.itemType, updatedReview.itemId.toString())

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review: updatedReview
    })
  } catch (error) {
    console.error("Error updating review:", error)
    res.status(500).json({ 
      message: "Error updating review", 
      error: error.message 
    })
  }
})

// DELETE - Delete review
router.delete("/", protect, async (req, res) => {
  try {
    const { reviewId } = req.body

    if (!reviewId) {
      return res.status(400).json({ message: "Missing reviewId" })
    }

    // Find the review first
    const existingReview = await Review.findById(reviewId)
    if (!existingReview) {
      return res.status(404).json({ message: "Review not found" })
    }

    // Check if the user owns this review
    if (existingReview.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own reviews" })
    }

    // Delete associated images
    if (existingReview.images && existingReview.images.length > 0) {
      await Image.deleteMany({ _id: { $in: existingReview.images } })
    }

    // Delete the review
    await Review.findByIdAndDelete(reviewId)

    // Update average rating for the item
    await updateAverageRating(existingReview.itemType, existingReview.itemId.toString())

    res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting review:", error)
    res.status(500).json({ 
      message: "Error deleting review", 
      error: error.message 
    })
  }
})

// GET - Check if user can review (utility endpoint)
router.get("/can-review", protect, async (req, res) => {
  try {
    const { itemType, itemId } = req.query

    if (!itemType || !itemId) {
      return res.status(400).json({ message: "Missing required parameters" })
    }

    const normalizedType = itemType.toLowerCase()
    
    // Check if item exists
    const Model = itemModels[normalizedType]
    if (!Model) {
      return res.status(400).json({ message: `Invalid itemType: ${itemType}` })
    }

    const item = await Model.findById(itemId)
    if (!item) {
      return res.status(404).json({ message: `${itemType} not found` })
    }

    // Check if user already reviewed
    const existingReview = await Review.findOne({ 
      user: req.user._id, 
      itemType: normalizedType, 
      itemId 
    })

    res.status(200).json({
      canReview: !existingReview,
      hasExistingReview: !!existingReview,
      existingReview: existingReview || null
    })
  } catch (error) {
    console.error("Error checking review eligibility:", error)
    res.status(500).json({ 
      message: "Error checking review eligibility", 
      error: error.message 
    })
  }
})

module.exports = router