const express = require("express");
const Image = require("../models/Image.js");
const { protect, admin, storeAdmin } = require("../Middleware/authMiddleware.js");
const { uploadAndProcessSingle, uploadAndProcessMultiple } = require("../Middleware/uploadMiddleware.js");

const router = express.Router();

/**
 * @route   POST /api/images/upload
 * @desc    Upload a single image
 * @access  Private
 */
router.post("/upload", protect, uploadAndProcessSingle, async (req, res) => {
  try {
    if (!req.processedImages || req.processedImages.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No image provided" 
      });
    }

    const imageData = req.processedImages[0];
    const { entityType, entityId, isPrimary = false, tags = [], description = "" } = req.body;

    // Validate entity type
    const validEntityTypes = ['trip', 'activity', 'restaurant', 'stay', 'rental', 'destination', 'user'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entity type"
      });
    }

    // If this is a primary image, unset other primary images for this entity
    if (isPrimary) {
      await Image.updateMany(
        { entityType, entityId, isPrimary: true },
        { isPrimary: false }
      );
    }

    const image = new Image({
      ...imageData,
      uploadedBy: req.user._id,
      entityType,
      entityId,
      isPrimary,
      tags,
      description
    });

    await image.save();

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      data: image
    });

  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      message: "Server error while uploading image"
    });
  }
});

/**
 * @route   POST /api/images/upload-multiple
 * @desc    Upload multiple images
 * @access  Private
 */
router.post("/upload-multiple", protect, uploadAndProcessMultiple, async (req, res) => {
  try {
    if (!req.processedImages || req.processedImages.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No images provided" 
      });
    }

    const { entityType, entityId, tags = [], description = "" } = req.body;

    // Validate entity type
    const validEntityTypes = ['trip', 'activity', 'restaurant', 'stay', 'rental', 'destination', 'user'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entity type"
      });
    }

    const images = [];
    let isFirst = true;

    for (const imageData of req.processedImages) {
      const image = new Image({
        ...imageData,
        uploadedBy: req.user._id,
        entityType,
        entityId,
        isPrimary: isFirst, // First image is primary
        tags,
        description
      });

      await image.save();
      images.push(image);
      isFirst = false;
    }

    res.status(201).json({
      success: true,
      message: `${images.length} images uploaded successfully`,
      data: images
    });

  } catch (error) {
    console.error("Error uploading images:", error);
    res.status(500).json({
      success: false,
      message: "Server error while uploading images"
    });
  }
});

/**
 * @route   GET /api/images/:id
 * @desc    Get image by ID
 * @access  Public
 */
router.get("/:id", async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found"
      });
    }

    // Set appropriate headers for image display
    res.set({
      'Content-Type': image.mimetype,
      'Content-Length': image.size,
      'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
    });

    // Convert base64 back to buffer and send
    const buffer = Buffer.from(image.data.split(',')[1], 'base64');
    res.send(buffer);

  } catch (error) {
    console.error("Error retrieving image:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving image"
    });
  }
});

/**
 * @route   GET /api/images/entity/:entityType/:entityId
 * @desc    Get all images for a specific entity
 * @access  Public
 */
router.get("/entity/:entityType/:entityId", async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const images = await Image.find({ entityType, entityId })
      .sort({ isPrimary: -1, uploadedAt: -1 })
      .select('-data'); // Don't send base64 data in list

    res.json({
      success: true,
      data: images
    });

  } catch (error) {
    console.error("Error retrieving entity images:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving images"
    });
  }
});

/**
 * @route   PUT /api/images/:id
 * @desc    Update image metadata
 * @access  Private (Owner or Admin)
 */
router.put("/:id", protect, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found"
      });
    }

    // Check if user can edit this image
    if (!req.user.isAdmin && image.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit this image"
      });
    }

    const { isPrimary, tags, description } = req.body;

    // If setting as primary, unset other primary images for this entity
    if (isPrimary) {
      await Image.updateMany(
        { 
          entityType: image.entityType, 
          entityId: image.entityId, 
          isPrimary: true,
          _id: { $ne: image._id }
        },
        { isPrimary: false }
      );
    }

    // Update image
    const updatedImage = await Image.findByIdAndUpdate(
      req.params.id,
      { isPrimary, tags, description },
      { new: true }
    ).select('-data');

    res.json({
      success: true,
      message: "Image updated successfully",
      data: updatedImage
    });

  } catch (error) {
    console.error("Error updating image:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating image"
    });
  }
});

/**
 * @route   DELETE /api/images/:id
 * @desc    Delete image
 * @access  Private (Owner or Admin)
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found"
      });
    }

    // Check if user can delete this image
    if (!req.user.isAdmin && image.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this image"
      });
    }

    await Image.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Image deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting image"
    });
  }
});

/**
 * @route   GET /api/images/user/:userId
 * @desc    Get all images uploaded by a user
 * @access  Private (Owner or Admin)
 */
router.get("/user/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user can view these images
    if (!req.user.isAdmin && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view these images"
      });
    }

    const images = await Image.find({ uploadedBy: userId })
      .sort({ uploadedAt: -1 })
      .select('-data'); // Don't send base64 data in list

    res.json({
      success: true,
      data: images
    });

  } catch (error) {
    console.error("Error retrieving user images:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving images"
    });
  }
});

module.exports = router; 