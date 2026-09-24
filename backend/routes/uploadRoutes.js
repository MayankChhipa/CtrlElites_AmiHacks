const express = require('express');

const router = express.Router();

const upload = require('../middlewares/uploadMiddleWare.js');
const { uploadImageBuffer } = require('../config/cloudinary');

const {
  protect,
} = require('../middlewares/authMiddleware');

const {
  authorize,
} = require('../middlewares/roleMiddleware');

/*
 * Upload a single image.
 *
 * DONOR  → food/donation images
 * DRIVER → proof-of-delivery images
 * NGO    → delivery/verification images
 * ADMIN  → administrative uploads
 */
router.post(
  '/',
  protect,
  authorize('DONOR', 'DRIVER', 'NGO', 'ADMIN'),
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please provide an image file.',
        });
      }

      const url = await uploadImageBuffer(
        req.file.buffer,
        req.file.mimetype
      );

      return res.status(200).json({
        success: true,
        url,
        message: 'Image uploaded successfully.',
      });
    } catch (error) {
      console.error('Image upload error:', error);

      return res.status(500).json({
        success: false,
        message: 'Image upload failed.',
      });
    }
  }
);

/*
 * Upload multiple donation images.
 *
 * Maximum: 5 images.
 */
router.post(
  '/multiple',
  protect,
  authorize('DONOR', 'ADMIN'),
  upload.array('images', 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            'Please provide at least one image file.',
        });
      }

      const uploadPromises = req.files.map((file) =>
        uploadImageBuffer(
          file.buffer,
          file.mimetype
        )
      );

      const urls = await Promise.all(uploadPromises);

      return res.status(200).json({
        success: true,
        urls,
        url: urls[0],
        message: `${urls.length} image(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error('Batch image upload error:', error);

      return res.status(500).json({
        success: false,
        message: 'Image upload failed.',
      });
    }
  }
);

module.exports = router;