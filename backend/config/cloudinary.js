const cloudinary = require('cloudinary').v2;

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

const isConfigured = Boolean(
  CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_CLOUD_NAME !== 'demo_cloud' &&
    CLOUDINARY_API_KEY &&
    CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

/**
 * Upload an image buffer to Cloudinary.
 *
 * @param {Buffer} buffer - Image data
 * @param {string} mimetype - Image MIME type
 * @returns {Promise<string>} Secure URL of the uploaded image
 */
const uploadImageBuffer = async (
  buffer,
  mimetype = 'image/jpeg'
) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('uploadImageBuffer expects a Buffer');
  }

  if (!buffer.length) {
    throw new Error('Cannot upload an empty image buffer');
  }

  // Use Cloudinary when properly configured
  if (isConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'surplus_to_shelter',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }

          if (!result || !result.secure_url) {
            return reject(
              new Error('Cloudinary upload completed without a secure URL')
            );
          }

          resolve(result.secure_url);
        }
      );

      uploadStream.on('error', reject);
      uploadStream.end(buffer);
    });
  }

  // Development fallback when Cloudinary is not configured
  const base64 = buffer.toString('base64');

  return `data:${mimetype};base64,${base64}`;
};

module.exports = {
  cloudinary,
  uploadImageBuffer,
  isConfigured,
};