const express = require("express")
const router = express.Router()
const Restaurant = require("../models/Restaurant")
const Image = require("../models/Image")
const { protect, storeAdmin } = require("../Middleware/authMiddleware")
const { uploadAndProcessMultiple } = require("../Middleware/uploadMiddleware")

// GET all restaurants (with destination and images populated)
router.get("/", async (req, res) => {
  try {
    const restaurants = await Restaurant.find()
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    res.json(restaurants)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET restaurants by destination
router.get('/by-destination/:destinationId', async (req, res) => {
  const { destinationId } = req.params;

  try {
    const restaurants = await Restaurant.find({ destination: destinationId })
      .populate('destination')
      .populate("images")
      .populate("primaryImage");

    if (restaurants.length === 0) {
      return res.status(404).json({ message: 'No restaurants found for this destination.' });
    }

    res.json(restaurants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching restaurants.' });
  }
});

// GET a single restaurant by ID (with destination and images populated)
router.get("/:id", async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" })
    }
    res.json(restaurant)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// CREATE a new restaurant with image upload
router.post("/", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const restaurantData = {
      name: req.body.name,
      location: req.body.location,
      cuisines: req.body.cuisines ? req.body.cuisines.split(',') : [],
      menu: req.body.menu ? JSON.parse(req.body.menu) : [],
      destination: req.body.destination,
      description: req.body.description,
      openingHours: req.body.openingHours,
      averageCost: req.body.averageCost,
      contactInfo: {
        phone: req.body.phone,
        email: req.body.email,
        address: req.body.address,
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
          entityType: 'restaurant',
          isPrimary: i === 0, // First image is primary
          tags: req.body.tags ? req.body.tags.split(',') : [],
          description: req.body.imageDescriptions ? req.body.imageDescriptions.split(',')[i] : ''
        })
        const savedImage = await image.save()
        imageIds.push(savedImage._id)
      }
      
      restaurantData.images = imageIds
      restaurantData.primaryImage = imageIds[0] // Set first image as primary
    }

    const restaurant = new Restaurant(restaurantData)
    const newRestaurant = await restaurant.save()
    
    // Populate the saved restaurant with images
    const populatedRestaurant = await Restaurant.findById(newRestaurant._id)
      .populate("destination")
      .populate("images")
      .populate("primaryImage")
    
    res.status(201).json(populatedRestaurant)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// UPDATE a restaurant by ID with image upload
router.put("/:id", protect, storeAdmin, uploadAndProcessMultiple, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" })
    }

    // Check if user is owner or admin
    if (restaurant.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to update this restaurant" })
    }

    const updateData = {
      name: req.body.name,
      location: req.body.location,
      cuisines: req.body.cuisines ? req.body.cuisines.split(',') : [],
      menu: req.body.menu ? JSON.parse(req.body.menu) : [],
      destination: req.body.destination,
      description: req.body.description,
      openingHours: req.body.openingHours,
      averageCost: req.body.averageCost,
      contactInfo: {
        phone: req.body.phone,
        email: req.body.email,
        address: req.body.address,
      },
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const imageIds = [...(restaurant.images || [])] // Keep existing images
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const image = new Image({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          data: file.buffer.toString('base64'),
          uploadedBy: req.user._id,
          entityType: 'restaurant',
          entityId: restaurant._id,
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

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("destination").populate("images").populate("primaryImage")
    
    res.json(updatedRestaurant)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// DELETE a restaurant by ID
router.delete("/:id", protect, storeAdmin, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" })
    }

    // Check if user is owner or admin
    if (restaurant.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this restaurant" })
    }

    // Delete associated images
    if (restaurant.images && restaurant.images.length > 0) {
      await Image.deleteMany({ _id: { $in: restaurant.images } })
    }

    await restaurant.deleteOne()
    res.json({ message: "Restaurant deleted successfully" })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
