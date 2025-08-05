const express = require("express")
const User = require("../models/User.js") // Assuming User model has a 'phoneNumber' field
const Image = require("../models/Image")
const generateToken = require('../utilis/generatetoken.js'); // Utility to generate JWT
const { protect } = require('../Middleware/authMiddleware.js');
const { uploadAndProcessSingle } = require("../Middleware/uploadMiddleware")

const router = express.Router()

// In-memory store for OTPs (for demonstration purposes only).
// In production, use a persistent store like Redis.
const otpStore = new Map() // Map<phoneNumber, { code: string, expiresAt: Date }>

/**
 * @route   POST /api/auth/send-otp
 * @desc    Generates and sends an OTP without creating a user record.
 * @access  Public
 */
router.post("/send-otp", async (req, res) => {
  const { phoneNumber } = req.body

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: "Phone number is required" })
  }

  try {
    // Generate a 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // OTP valid for 5 minutes

    otpStore.set(phoneNumber, { code: otpCode, expiresAt })

    // For testing, we log the OTP. In a real app, you would use an SMS service like Twilio.
    console.log(`OTP for ${phoneNumber}: ${otpCode}`)

    // Respond without creating a user, avoiding the unique index error.
    res.status(200).json({ success: true, message: "OTP sent successfully (simulated)" })

  } catch (error) {
    console.error("Server Error in /send-otp:", error.message)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

router.post("/verify-otp", async (req, res) => {
  const { phoneNumber, otpCode } = req.body

  if (!phoneNumber || !otpCode) {
    return res.status(400).json({ success: false, message: "Phone number and OTP are required" })
  }

  const storedOtp = otpStore.get(phoneNumber)

  if (!storedOtp || storedOtp.code !== otpCode || storedOtp.expiresAt < new Date()) {
    return res.status(400).json({ success: false, message: "Invalid or expired OTP. Please try again." })
  }

  otpStore.delete(phoneNumber) // OTP is valid, remove it.

  try {
    // Check if a user with this phone number already exists and is fully registered.
    console.log(phoneNumber)
    const user = await User.findOne({ phoneNumber })
    console.log(user)
    if (user) {
      // --- USER EXISTS: LOGIN ---
      // The user has previously completed registration.
      res.status(200).json({
        success: true,
        message: "OTP verified successfully. User logged in.",
        userExists: true, // Signal to client that user is complete
        user: {
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          isAdmin: user.isAdmin,
        },
        token: generateToken(user._id, user.isAdmin),
      })
    } else {
      // --- USER DOES NOT EXIST: PROMPT REGISTRATION ---
      // No user found with this phone number, they need to register.
      res.status(200).json({
        success: true,
        message: "OTP verified successfully. Please complete your registration.",
        userExists: false, // Signal to client that user needs to register
      })
      
    }
  } catch (error) {
    console.error("Server Error in /verify-otp:", error.message)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

/**
 * @route   POST /api/auth/register
 * @desc    Creates a new user record with full details and returns a JWT.
 * @access  Public
 */
router.post("/register", uploadAndProcessSingle, async (req, res) => {
  const { firstName, lastName, email, password, age, phoneNumber } = req.body

  if (!firstName || !lastName || !email || !password || !age || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
  }

  try {
    // Check if a user with this email or phone number already exists.
    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "A user with this email or phone number already exists." });
    }

    // Handle profile image upload
    let profileImageId = null;
    if (req.file) {
      const image = new Image({
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        data: req.file.buffer.toString('base64'),
        uploadedBy: null, // Will be set after user creation
        entityType: 'user',
        isPrimary: true,
        tags: ['profile'],
        description: 'Profile picture'
      })
      const savedImage = await image.save()
      profileImageId = savedImage._id
    }

    // Create the new user with all details at once.
    const userData = {
      firstName,
      lastName,
      email,
      password, // Hashing should be handled by a pre-save hook in the User model
      age,
      phoneNumber,
    }

    if (profileImageId) {
      userData.profileImage = profileImageId
    }

    const user = await User.create(userData);

    // Update the image with the user ID if it exists
    if (profileImageId) {
      await Image.findByIdAndUpdate(profileImageId, { uploadedBy: user._id })
    }

    if (user) {
        // Populate the user with profile image
        const populatedUser = await User.findById(user._id).populate('profileImage')
        
        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            data: {
                userId: user._id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                isAdmin: user.isAdmin,
                profileImage: populatedUser.profileImage,
                token: generateToken(user._id, user.isAdmin),
            }
        });
    } else {
        res.status(400).json({ success: false, message: 'Invalid user data.' });
    }

  } catch (error) {
    console.error("Server Error in /register:", error.message)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user's details
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('profileImage');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error in /me:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update user profile with optional image upload
 * @access  Private
 */
router.put('/update-profile', protect, uploadAndProcessSingle, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updateData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      age: req.body.age,
      location: {
        city: req.body.city,
        region: req.body.region,
        country: req.body.country,
        coords: {
          latitude: req.body.latitude,
          longitude: req.body.longitude,
        }
      }
    }

    // Handle profile image upload
    if (req.file) {
      // Delete old profile image if it exists
      if (user.profileImage) {
        await Image.findByIdAndDelete(user.profileImage)
      }

      const image = new Image({
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        data: req.file.buffer.toString('base64'),
        uploadedBy: user._id,
        entityType: 'user',
        isPrimary: true,
        tags: ['profile'],
        description: 'Profile picture'
      })
      const savedImage = await image.save()
      updateData.profileImage = savedImage._id
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('profileImage')

    res.json({ success: true, message: 'Profile updated successfully', data: updatedUser });
  } catch (error) {
    console.error('Error in /update-profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/request-store-admin
 * @desc    User requests to become a store admin
 * @access  Private
 */
router.post("/request-store-admin", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.storeAdminRequest === "pending") {
      return res.status(400).json({ success: false, message: "Request already pending" });
    }
    user.storeAdminRequest = "pending";
    await user.save();
    res.json({ success: true, message: "Store admin request submitted" });
  } catch (error) {
    console.error("Error in /request-store-admin:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   GET /api/auth/admin-requests
 * @desc    Get all pending store admin requests (Admin only)
 * @access  Private - Admin
 */
router.get("/admin-requests", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized as admin" });
    }
    
    const pendingRequests = await User.find({ 
      storeAdminRequest: "pending" 
    }).select('-password');
    
    res.json({ success: true, data: pendingRequests });
  } catch (error) {
    console.error("Error in /admin-requests:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   PUT /api/auth/approve-store-admin/:userId
 * @desc    Approve a store admin request (Admin only)
 * @access  Private - Admin
 */
router.put("/approve-store-admin/:userId", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized as admin" });
    }
    
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    user.storeAdminRequest = "approved";
    await user.save();
    
    res.json({ success: true, message: "Store admin request approved" });
  } catch (error) {
    console.error("Error in /approve-store-admin:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   PUT /api/auth/reject-store-admin/:userId
 * @desc    Reject a store admin request (Admin only)
 * @access  Private - Admin
 */
router.put("/reject-store-admin/:userId", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized as admin" });
    }
    
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    user.storeAdminRequest = "rejected";
    await user.save();
    
    res.json({ success: true, message: "Store admin request rejected" });
  } catch (error) {
    console.error("Error in /reject-store-admin:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get JWT
// @access  Public
router.post("/login", async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email })

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user._id, user.isAdmin),
        });
    } else {
        res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error(error.message)
    res.status(500).send("Server error")
  }
})

// NOTE: The following routes should be moved to a separate `routes/users.js` file
// and protected with authentication & authorization middleware in a real application.

// @route   GET /api/auth/users
// @desc    Get all users
// @access  Private - Admin
router.get("/users", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized as admin" });
    }
    const users = await User.find().select("-password") // exclude passwords
    res.json({ success: true, data: users })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// @route   GET /api/auth/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private - Admin
router.get("/admin/stats", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized as admin" });
    }
    
    const User = require("../models/User.js")
    const Trip = require("../models/Trip.js")
    const Booking = require("../models/Booking.js")

    const [users, trips, bookings] = await Promise.all([
      User.countDocuments(),
      Trip.countDocuments(),
      Booking.countDocuments()
    ])

    // Calculate total revenue from bookings
    const totalRevenue = await Booking.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" }
        }
      }
    ])

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0

    // Get recent bookings with correct field names
    const recentBookings = await Booking.find()
      .populate('user', 'firstName lastName email')
      .populate('trip', 'title destination price')
      .sort({ createdAt: -1 })
      .limit(5)

    // Get popular destinations
    const popularDestinations = await Trip.aggregate([
      {
        $group: {
          _id: "$destination",
          count: { $sum: 1 },
          avgRating: { $avg: "$rating" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])

    // Get bookings by month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const bookingsByMonth = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ])

    // Format month names for chart
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const formattedBookingsByMonth = bookingsByMonth.map(item => ({
      name: monthNames[item._id.month - 1],
      count: item.count,
      revenue: item.revenue
    }))

    res.json({
      success: true,
      data: {
        stats: {
          users,
          trips,
          bookings,
          revenue: `$${revenue.toLocaleString()}`
        },
        recentBookings,
        popularDestinations,
        bookingsByMonth: formattedBookingsByMonth
      }
    })
  } catch (error) {
    console.error('Admin stats error:', error.message)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// @route   PUT /api/auth/users/:id
// @desc    Update user
// @access  Private - Admin
router.put("/users/:id", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized as admin" });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select("-password")

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    res.json({ success: true, data: user })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

// @route   DELETE /api/auth/users/:id
// @desc    Delete user
// @access  Private - Admin
router.delete("/users/:id", protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized as admin" });
    }
    
    const user = await User.findByIdAndDelete(req.params.id)

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    res.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ success: false, message: "Server error" })
  }
})

module.exports = router
