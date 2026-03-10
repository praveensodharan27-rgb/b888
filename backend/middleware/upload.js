const multer = require('multer');
const multerS3 = require('multer-s3');
const fs = require('fs');
const path = require('path');
// Suppress AWS SDK v2 maintenance mode warning
process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = '1';
const AWS = require('aws-sdk');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const Jimp = require('jimp');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../src/config/logger');
const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const adsUploadsDir = path.join(uploadsDir, 'ads');
const avatarsUploadsDir = path.join(uploadsDir, 'avatars');
const businessUploadsDir = path.join(uploadsDir, 'business');

[uploadsDir, adsUploadsDir, avatarsUploadsDir, businessUploadsDir].forEach(dir => {
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

// Enhanced image format validation
const validateImageFormat = (file) => {
  const errors = [];
  
  // 1. Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExt)) {
    errors.push(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`);
  }
  
  // 2. Check MIME type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`Invalid MIME type: ${file.mimetype}. Allowed: ${allowedMimeTypes.join(', ')}`);
  }
  
  // 3. Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    errors.push(`File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }
  
  // 4. Validate file content (magic bytes) to ensure it's actually an image
  if (file.buffer && file.buffer.length > 0) {
    const buffer = file.buffer;
    const isValidImage = 
      // JPEG: FF D8 FF
      (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) ||
      // PNG: 89 50 4E 47
      (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) ||
      // WebP: RIFF...WEBP
      (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
       buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50);
    
    if (!isValidImage) {
      errors.push('File content does not match image format. File may be corrupted or not a valid image.');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

// Sell Box logo for watermark – try multiple paths so it works in any repo layout
const LOGO_CANDIDATES = [
  path.join(__dirname, '../../frontend/public/logo.png'),
  path.join(__dirname, '../public/logo.png'),
  path.join(__dirname, '../uploads/logo.png'),
];
const LOGO_PATH = LOGO_CANDIDATES.find((p) => fs.existsSync(p)) || LOGO_CANDIDATES[0];

/** Watermark opacity (0 = invisible, 1 = opaque). Requirement: semi-transparent ~0.2 */
const WATERMARK_OPACITY = 0.2;

/** Max width for product images (keeps aspect ratio). Prevents huge files and keeps images sharp. */
const MAX_IMAGE_WIDTH = 1200;
/** Compression quality 85–90% for sharp display without excessive file size. */
const IMAGE_QUALITY = 88;

/**
 * Apply Sell Box logo watermark and resize/quality for product images (server-side).
 * - Resize to max width 1200px (height auto) to maintain high resolution without huge files.
 * - Output as WebP or high-quality JPEG at 85–90% quality.
 * - Logo at bottom-right, semi-transparent (opacity ~0.2).
 * - Applied to all ad image uploads (local, S3, Cloudinary).
 */
const applyWatermark = async (buffer, mimeType) => {
  let image = await Jimp.read(buffer);
  let width = image.getWidth();
  const height = image.getHeight();

  if (width > MAX_IMAGE_WIDTH) {
    image = image.resize(MAX_IMAGE_WIDTH, Jimp.AUTO);
    width = image.getWidth();
  }

  const mt = (mimeType || '').toLowerCase();
  let outputMime = Jimp.MIME_JPEG;
  if (mt.includes('png')) outputMime = Jimp.MIME_PNG;
  else if (mt.includes('webp')) outputMime = Jimp.MIME_WEBP;
  else if (mt.includes('jpeg') || mt.includes('jpg')) outputMime = Jimp.MIME_JPEG;

  if (outputMime === Jimp.MIME_JPEG || outputMime === Jimp.MIME_WEBP) {
    image.quality(IMAGE_QUALITY);
  }

  if (!fs.existsSync(LOGO_PATH)) {
    return image.getBufferAsync(outputMime);
  }

  let logo = await Jimp.read(LOGO_PATH);
  const minSide = Math.min(width, image.getHeight());
  const logoSize = Math.min(Math.round(minSide * 0.15), 80);

  logo = logo.resize(logoSize, Jimp.AUTO);
  logo.opacity(WATERMARK_OPACITY);

  const padding = Math.max(Math.round(minSide * 0.02), 8);
  const x = Math.max(width - logo.getWidth() - padding, 0);
  const y = Math.max(image.getHeight() - logo.getHeight() - padding, 0);

  image.composite(logo, x, y);

  return image.getBufferAsync(outputMime);
};

// Generate category-based filename
const generateCategoryFilename = (categorySlug, categoryName, index, ext) => {
  // Sanitize category slug and name for filename
  const sanitizedSlug = categorySlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const sanitizedName = categoryName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  // Format: category-slug_category-name_index_timestamp_random.ext
  return `${sanitizedSlug}_${sanitizedName}_${index + 1}_${timestamp}_${random}.${ext}`;
};

// Generate category-based alt text
const generateCategoryAltText = (categoryName, subcategoryName, index, total) => {
  let altText = categoryName;
  if (subcategoryName) {
    altText = `${subcategoryName} - ${categoryName}`;
  }
  if (total > 1) {
    altText = `${altText} - Image ${index + 1} of ${total}`;
  }
  return altText;
};

// Fetch category information for filename and alt text generation
const getCategoryInfo = async (categoryId, subcategoryId) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true, slug: true }
    });

    let subcategory = null;
    if (subcategoryId) {
      subcategory = await prisma.subcategory.findUnique({
        where: { id: subcategoryId },
        select: { name: true, slug: true }
      });
    }

    return {
      category: category ? { name: category.name, slug: category.slug } : null,
      subcategory: subcategory ? { name: subcategory.name, slug: subcategory.slug } : null
    };
  } catch (error) {
    logger.warn({ err: error.message }, 'Error fetching category info');
    return { category: null, subcategory: null };
  }
};

// S3 upload will use memory storage and manual upload (to allow watermark)
const s3Upload = s3Client ? multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const validation = validateImageFormat(file);
    if (validation.isValid) {
      cb(null, true);
    } else {
      cb(new Error(validation.errors.join('. ')));
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
    const validation = validateImageFormat(file);
    if (validation.isValid) {
      cb(null, true);
    } else {
      cb(new Error(validation.errors.join('. ')));
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
  // If no storage configured, use local file storage for development (memory + watermark)
  if (!s3Client && process.env.USE_CLOUDINARY !== 'true') {
    const localUpload = multer({
      storage: memoryStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const validation = validateImageFormat(file);
        if (validation.isValid) {
          cb(null, true);
        } else {
          cb(new Error(validation.errors.join('. ')));
        }
      }
    });
    return localUpload.array('images', 4)(req, res, async (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      if (req.files && req.files.length > 0) {
        try {
          const baseUrl =
            process.env.BACKEND_URL ||
            process.env.BASE_URL ||
            `http://148.230.67.118:${process.env.PORT || 5000}`;
          
          // Get category information for filename and alt text generation
          const categoryId = req.body?.categoryId;
          const subcategoryId = req.body?.subcategoryId;
          let categoryInfo = { category: null, subcategory: null };
          
          if (categoryId) {
            categoryInfo = await getCategoryInfo(categoryId, subcategoryId);
          }

          const savedFiles = [];
          for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            
            // Validate image format before processing
            const validation = validateImageFormat(file);
            if (!validation.isValid) {
              throw new Error(`Image ${i + 1}: ${validation.errors.join('. ')}`);
            }
            
            // Validate buffer before processing
            if (!file.buffer || file.buffer.length === 0) {
              throw new Error(`Image ${i + 1}: File buffer is empty or corrupted`);
            }
            
            const ext = file.originalname.split('.').pop();
            
            // Generate category-based filename
            let filename;
            if (categoryInfo.category) {
              filename = generateCategoryFilename(
                categoryInfo.category.slug,
                categoryInfo.category.name,
                i,
                ext
              );
            } else {
              // Fallback to random filename if no category
              filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
            }
            
            const outputPath = path.join(adsUploadsDir, filename);

            // Apply watermark; if it fails, gracefully fall back to original buffer
            let outputBuffer;
            try {
              outputBuffer = await applyWatermark(file.buffer, file.mimetype);
            } catch (wmErr) {
              (req.log || logger).warn(
                {
                  requestId: req.id,
                  err: wmErr?.message,
                  filename,
                  reason: 'Watermark failed, using original image buffer',
                },
                'Watermark processing error – falling back to original image'
              );
              outputBuffer = file.buffer;
            }

            fs.writeFileSync(outputPath, outputBuffer);
            
            // Generate alt text
            const altText = categoryInfo.category
              ? generateCategoryAltText(
                  categoryInfo.category.name,
                  categoryInfo.subcategory?.name,
                  i,
                  req.files.length
                )
              : `Image ${i + 1}`;
            
            // Store as object with url and altText
            savedFiles.push({
              url: `${baseUrl}/uploads/ads/${filename}`,
              altText: altText
            });
          }
          req.uploadedImages = savedFiles;
          (req.log || logger).info({ requestId: req.id, count: req.uploadedImages.length }, 'Uploaded images (local storage with watermark)');
        } catch (e) {
          (req.log || logger).error({
            requestId: req.id,
            err: e.message,
            filesCount: req.files?.length || 0,
            categoryId: req.body?.categoryId,
            subcategoryId: req.body?.subcategoryId
          }, 'Image processing error (local storage)');
          return res.status(500).json({ 
            success: false, 
            message: 'Image processing failed. Please try again or contact support if payment was made.',
            error: process.env.NODE_ENV === 'development' ? e.message : undefined,
            paymentOrderId: req.body?.paymentOrderId || null // Include payment order ID for refund
          });
        }
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
  
  const uploadMiddleware = upload.array('images', 4);

  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // Get category information for filename and alt text generation
    const categoryId = req.body?.categoryId;
    const subcategoryId = req.body?.subcategoryId;
    let categoryInfo = { category: null, subcategory: null };
    
    if (categoryId && req.files && req.files.length > 0) {
      categoryInfo = await getCategoryInfo(categoryId, subcategoryId);
    }

    // If using Cloudinary, upload files
    if (process.env.USE_CLOUDINARY === 'true' && req.files) {
      try {
        // Validate all files before processing
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const validation = validateImageFormat(file);
          if (!validation.isValid) {
            throw new Error(`Image ${i + 1}: ${validation.errors.join('. ')}`);
          }
          if (!file.buffer || file.buffer.length === 0) {
            throw new Error(`Image ${i + 1}: File buffer is empty or corrupted`);
          }
        }
        
        const uploadPromises = req.files.map((file, index) => {
          return new Promise((resolve, reject) => {
            applyWatermark(file.buffer, file.mimetype)
              .then((processedBuffer) => {
                // Generate category-based public_id for Cloudinary
                let publicId = `ads/${crypto.randomBytes(16).toString('hex')}`;
                if (categoryInfo.category) {
                  const ext = file.originalname.split('.').pop();
                  const filename = generateCategoryFilename(
                    categoryInfo.category.slug,
                    categoryInfo.category.name,
                    index,
                    ext
                  );
                  publicId = `ads/${filename.replace(`.${ext}`, '')}`;
                }
                
                cloudinary.uploader.upload_stream(
                  { 
                    folder: 'ads', 
                    resource_type: 'image',
                    public_id: publicId
                  },
                  (error, result) => {
                    if (error) reject(error);
                    else {
                      // Generate alt text
                      const altText = categoryInfo.category
                        ? generateCategoryAltText(
                            categoryInfo.category.name,
                            categoryInfo.subcategory?.name,
                            index,
                            req.files.length
                          )
                        : `Image ${index + 1}`;
                      
                      resolve({
                        url: result.secure_url,
                        altText: altText
                      });
                    }
                  }
                ).end(processedBuffer);
              })
              .catch(reject);
          });
        });

        req.uploadedImages = await Promise.all(uploadPromises);
        (req.log || logger).info({ requestId: req.id, count: req.uploadedImages.length }, 'Uploaded images (Cloudinary)');
      } catch (error) {
        (req.log || logger).error({
          requestId: req.id,
          err: error.message,
          filesCount: req.files?.length || 0,
          categoryId: req.body?.categoryId,
          subcategoryId: req.body?.subcategoryId,
          paymentOrderId: req.body?.paymentOrderId
        }, 'Cloudinary upload error');
        return res.status(500).json({ 
          success: false, 
          message: 'Image upload failed. Please try again or contact support if payment was made.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
          paymentOrderId: req.body?.paymentOrderId || null // Include payment order ID for refund
        });
      }
    } else if (s3Client && req.files) {
      // Manual S3 upload with watermark
      try {
        const uploadPromises = req.files.map(async (file, index) => {
          const ext = file.originalname.split('.').pop();
          
          // Generate category-based filename
          let filename;
          if (categoryInfo.category) {
            filename = generateCategoryFilename(
              categoryInfo.category.slug,
              categoryInfo.category.name,
              index,
              ext
            );
          } else {
            filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
          }
          
          const watermarked = await applyWatermark(file.buffer, file.mimetype);
          const result = await s3Client
            .upload({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: `ads/${filename}`,
              Body: watermarked,
              ContentType: file.mimetype,
              ACL: 'public-read'
            })
            .promise();
          
          // Generate alt text
          const altText = categoryInfo.category
            ? generateCategoryAltText(
                categoryInfo.category.name,
                categoryInfo.subcategory?.name,
                index,
                req.files.length
              )
            : `Image ${index + 1}`;
          
          return {
            url: result.Location,
            altText: altText
          };
        });
        req.uploadedImages = await Promise.all(uploadPromises);
        (req.log || logger).info({ requestId: req.id, count: req.uploadedImages.length }, 'Uploaded images (S3)');
      } catch (error) {
        (req.log || logger).error({
          requestId: req.id,
          err: error.message,
          filesCount: req.files?.length || 0,
          categoryId: req.body?.categoryId,
          subcategoryId: req.body?.subcategoryId,
          paymentOrderId: req.body?.paymentOrderId
        }, 'S3 upload error');
        return res.status(500).json({ 
          success: false, 
          message: 'Image upload failed. Please try again or contact support if payment was made.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
          paymentOrderId: req.body?.paymentOrderId || null // Include payment order ID for refund
        });
      }
    } else if (req.files) {
      req.uploadedImages = [];
    }

    next();
  });
};

// Sanitize extension for safe filename (allow only image extensions, no path traversal)
const ALLOWED_AVATAR_EXT = ['jpg', 'jpeg', 'png', 'webp'];
function sanitizeAvatarExtension(originalname) {
  const raw = (originalname || '').split('.').pop();
  const ext = (typeof raw === 'string' ? raw : '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return ALLOWED_AVATAR_EXT.includes(ext) ? ext : 'jpg';
}

// Local storage for avatars
const avatarLocalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsUploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = sanitizeAvatarExtension(file.originalname);
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
        const baseUrl =
          process.env.BACKEND_URL ||
          process.env.BASE_URL ||
          `http://148.230.67.118:${process.env.PORT || 5000}`;
        req.uploadedAvatar = `${baseUrl}/uploads/avatars/${req.file.filename}`;
        (req.log || logger).info({ requestId: req.id }, 'Uploaded avatar (local storage)');
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

// Business images: logo, cover, gallery (single file per request)
const businessLocalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, businessUploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = sanitizeAvatarExtension(file.originalname);
    const filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
    cb(null, filename);
  }
});

const uploadBusinessImage = (req, res, next) => {
  const localUpload = multer({
    storage: businessLocalStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|webp/;
      const extname = allowedTypes.test(file.originalname.toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        cb(null, true);
      } else {
        cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
      }
    }
  });
  return localUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Invalid image' });
    }
    if (req.file) {
      const baseUrl =
        process.env.BACKEND_URL ||
        process.env.BASE_URL ||
        `http://148.230.67.118:${process.env.PORT || 5000}`;
      req.uploadedBusinessImage = `${baseUrl}/uploads/business/${req.file.filename}`;
    }
    next();
  });
};

module.exports = { uploadImages, uploadAvatar, uploadBusinessImage };

