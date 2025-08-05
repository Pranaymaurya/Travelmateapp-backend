const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  }
});

// Middleware to process and optimize images
const processImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const processedImages = [];

    for (const file of req.files) {
      // Process image with Sharp
      const processedBuffer = await sharp(file.buffer)
        .resize(800, 600, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Convert to base64 for MongoDB storage
      const base64Image = `data:${file.mimetype};base64,${processedBuffer.toString('base64')}`;
      
      processedImages.push({
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: processedBuffer.length,
        data: base64Image,
        uploadedAt: new Date()
      });
    }

    req.processedImages = processedImages;
    next();
  } catch (error) {
    next(error);
  }
};

// Single image upload middleware
const uploadSingle = upload.single('image');

// Multiple images upload middleware
const uploadMultiple = upload.array('images', 10);

// Combined middleware for single image upload with processing
const uploadAndProcessSingle = [
  uploadSingle,
  processImages
];

// Combined middleware for multiple images upload with processing
const uploadAndProcessMultiple = [
  uploadMultiple,
  processImages
];

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadAndProcessSingle,
  uploadAndProcessMultiple,
  processImages
}; 