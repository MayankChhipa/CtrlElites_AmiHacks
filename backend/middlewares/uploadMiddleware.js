const multer = require('multer');

// Keep uploaded files in memory so they can be sent directly
// to Cloudinary or processed as buffers.
const storage = multer.memoryStorage();

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const fileFilter = (req, file, cb) => {
  if (!file || !file.mimetype) {
    return cb(
      new multer.MulterError('LIMIT_UNEXPECTED_FILE'),
      false
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype.toLowerCase())) {
    return cb(
      new Error(
        'Only JPEG, PNG, WebP, and GIF image files are supported.'
      ),
      false
    );
  }

  return cb(null, true);
};

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 10, // Maximum files per request
  },

  fileFilter,
});

module.exports = upload;