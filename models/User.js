const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  lastName: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  age: {
    type: Number,
  },
  location: {
    city: String,
    region: String,
    country: String,
    coords: {
      latitude: Number,
      longitude: Number,
    },
  },
  // Added profile image support
  profileImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Image"
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  storeAdminRequest: {
    type: String,
    enum: ["none", "pending", "approved", "rejected"],
    default: "none",
  },
})

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next()
  }
  if (this.password) {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
  }
})

UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false
  return await bcrypt.compare(enteredPassword, this.password)
}

const User = mongoose.models.User || mongoose.model("User", UserSchema)

module.exports = User
