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
const prisma = new PrismaClient();

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

const WATERMARK_TEXT = 'B888';
// Apply watermark to an image buffer (bottom-right, semi-transparent) using Jimp
const applyWatermark = async (buffer) => {
  const image = await Jimp.read(buffer);
  const width = image.getWidth();
  const height = image.getHeight();
  // Choose a font size based on image size (use built-in fonts)
  const font =
    Math.min(width, height) > 1200
      ? await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE)
      : Math.min(width, height) > 800
      ? await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE)
      : await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

  const textWidth = Jimp.measureText(font, WATERMARK_TEXT);
  const textHeight = Jimp.measureTextHeight(font, WATERMARK_TEXT, textWidth);

  // Position bottom-right with extra padding for readability
  const padding = Math.max(Math.round(Math.min(width, height) * 0.02), 12);
  const x = Math.max(width - textWidth - padding, 0);
  const y = Math.max(height - textHeight - padding, 0);

  // Draw text only (white, semi-transparent), no background
  const textImage = new Jimp(textWidth, textHeight, 0x00000000);
  textImage.print(font, 0, 0, WATERMARK_TEXT);
  // Make it lightly transparent so it sits on the image without a box
  textImage.opacity(0.7);

  image.composite(textImage, x, y);
  return image.getBufferAsync(Jimp.MIME_PNG);
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
    console.error('Error fetching category info:', error);
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
  // If no storage configured, use local file storage for development (memory + watermark)
  if (!s3Client && process.env.USE_CLOUDINARY !== 'true') {
    const localUpload = multer({
      storage: memoryStorage,
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
      if (req.files && req.files.length > 0) {
        try {
          const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
          
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
            const watermarked = await applyWatermark(file.buffer);
            fs.writeFileSync(outputPath, watermarked);
            
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
          console.log('📸 Uploaded images (local storage with watermark):', req.uploadedImages.length, 'images');
        } catch (e) {
          console.error('❌ Image processing error (local storage):', e);
          console.error('Error details:', {
            message: e.message,
            stack: e.stack,
            filesCount: req.files?.length || 0,
            categoryId: req.body?.categoryId,
            subcategoryId: req.body?.subcategoryId
          });
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
  
  const uploadMiddleware = upload.array('images', 12);

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
        const uploadPromises = req.files.map((file, index) => {
          return new Promise((resolve, reject) => {
            applyWatermark(file.buffer)
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
        console.log('📸 Uploaded images (Cloudinary):', req.uploadedImages.length, 'images');
      } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          filesCount: req.files?.length || 0,
          categoryId: req.body?.categoryId,
          subcategoryId: req.body?.subcategoryId,
          paymentOrderId: req.body?.paymentOrderId
        });
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
          
          const watermarked = await applyWatermark(file.buffer);
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
        console.log('📸 Uploaded images (S3):', req.uploadedImages.length, 'images');
      } catch (error) {
        console.error('❌ S3 upload error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          filesCount: req.files?.length || 0,
          categoryId: req.body?.categoryId,
          subcategoryId: req.body?.subcategoryId,
          paymentOrderId: req.body?.paymentOrderId
        });
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

