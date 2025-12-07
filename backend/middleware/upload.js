const multer = require('multer');
const multerS3 = require('multer-s3');
const fs = require('fs');
const path = require('path');
// Suppress AWS SDK v2 maintenance mode warning
process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = '1';
const AWS = require('aws-sdk');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const adsUploadsDir = path.join(uploadsDir, 'ads');
const avatarsUploadsDir = path.join(uploadsDir, 'avatars');

[uploadsDir, adsUploadsDir, avatarsUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Cloudinary
if (process.env.USE_CLOUDINARY === 'true') {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Configure AWS S3
let s3Client = null;
if (process.env.USE_CLOUDINARY !== 'true' && process.env.AWS_ACCESS_KEY_ID) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
  });
  s3Client = new AWS.S3();
}

// Memory storage for processing
const memoryStorage = multer.memoryStorage();

// S3 Upload configuration
const s3Upload = s3Client ? multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET_NAME,
    acl: 'public-read',
    key: (req, file, cb) => {
      const ext = file.originalname.split('.').pop();
      const filename = crypto.randomBytes(16).toString('hex');
      cb(null, `ads/${filename}.${ext}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
    }
  }
}) : null;

// Cloudinary upload configuration
const cloudinaryUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
    }
  }
});

// Local file storage for development
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, adsUploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    const filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
    cb(null, filename);
  }
});

// Upload middleware
const uploadImages = (req, res, next) => {
  // If no storage configured, use local file storage for development
  if (!s3Client && process.env.USE_CLOUDINARY !== 'true') {
    const localUpload = multer({
      storage: localStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'));
        }
      }
    });
    return localUpload.array('images', 12)(req, res, async (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      // For development, save files locally and return local URLs
      if (req.files && req.files.length > 0) {
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
        req.uploadedImages = req.files.map((file) => {
          // Return URL pointing to local server
          return `${baseUrl}/uploads/ads/${file.filename}`;
        });
        console.log('📸 Uploaded images (local storage):', req.uploadedImages);
      } else {
        req.uploadedImages = [];
      }
      next();
    });
  }
  
  const upload = process.env.USE_CLOUDINARY === 'true' ? cloudinaryUpload : (s3Upload || cloudinaryUpload);
  
  if (!upload) {
    return res.status(500).json({ success: false, message: 'File upload not configured' });
  }
  
  const uploadMiddleware = upload.array('images', 12);

  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // If using Cloudinary, upload files
    if (process.env.USE_CLOUDINARY === 'true' && req.files) {
      try {
        const uploadPromises = req.files.map(file => {
          return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              { folder: 'ads', resource_type: 'image' },
              (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
              }
            ).end(file.buffer);
          });
        });

        const urls = await Promise.all(uploadPromises);
        req.uploadedImages = urls;
      } catch (error) {
        return res.status(500).json({ success: false, message: 'Image upload failed' });
      }
    } else if (req.files) {
      // S3 URLs are already in req.files[].location
      req.uploadedImages = req.files.map(file => file.location);
    }

    next();
  });
};

// Local storage for avatars
const avatarLocalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsUploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    const filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
    cb(null, filename);
  }
});

// Single image upload for avatar
const uploadAvatar = (req, res, next) => {
  // If no storage configured, use local file storage for development
  if (!s3Client && process.env.USE_CLOUDINARY !== 'true') {
    const localUpload = multer({
      storage: avatarLocalStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'));
        }
      }
    });
    return localUpload.single('avatar')(req, res, async (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      if (req.file) {
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
        req.uploadedAvatar = `${baseUrl}/uploads/avatars/${req.file.filename}`;
        console.log('📸 Uploaded avatar (local storage):', req.uploadedAvatar);
      }
      next();
    });
  }
  
  const upload = process.env.USE_CLOUDINARY === 'true' ? cloudinaryUpload : (s3Upload || cloudinaryUpload);
  
  if (!upload) {
    return res.status(500).json({ success: false, message: 'File upload not configured' });
  }
  
  const uploadMiddleware = upload.single('avatar');

  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (process.env.USE_CLOUDINARY === 'true' && req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'avatars', resource_type: 'image' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          ).end(req.file.buffer);
        });
        req.uploadedAvatar = result.secure_url;
      } catch (error) {
        return res.status(500).json({ success: false, message: 'Avatar upload failed' });
      }
    } else if (req.file) {
      req.uploadedAvatar = req.file.location;
    }

    next();
  });
};

module.exports = { uploadImages, uploadAvatar };

