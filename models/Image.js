const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  data: {
    type: String, // Base64 encoded image data
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entityType: {
    type: String,
    enum: ['trip', 'activity', 'restaurant', 'stay', 'rental', 'destination', 'user'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String
  }],
  description: {
    type: String
  }
}, {
  timestamps: true
});

// Index for better query performance
ImageSchema.index({ entityType: 1, entityId: 1 });
ImageSchema.index({ uploadedBy: 1 });
ImageSchema.index({ uploadedAt: -1 });

// Virtual for image URL (for API responses)
ImageSchema.virtual('url').get(function() {
  return `/api/images/${this._id}`;
});

// Ensure virtual fields are serialized
ImageSchema.set('toJSON', { virtuals: true });
ImageSchema.set('toObject', { virtuals: true });

const Image = mongoose.models.Image || mongoose.model("Image", ImageSchema);

module.exports = Image; 