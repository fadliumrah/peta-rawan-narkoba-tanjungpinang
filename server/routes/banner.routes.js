import express from 'express';
import Banner from '../models/Banner.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadBanner } from '../middleware/upload.js';
import { uploadBufferToCloudinary } from '../utils/cloudinaryUploader.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Get active banner (Public)
router.get('/active', async (req, res) => {
  try {
    const banner = await Banner.findOne({ isActive: true }).sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      data: banner 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get all banners (Admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      data: banners 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Update/Create banner (Admin)
router.post('/', authenticateToken, (req, res) => {
  uploadBanner(req, res, async (err) => {
    console.log('[banner] upload request: filePresent=', !!req.file, 'size=', req.file?.size, 'name=', req.file?.originalname);
    if (err) {
      console.error('[banner] multer error:', err && err.message ? err.message : err);
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }

    try {
      const { caption, location, imageFit, imagePosition } = req.body;

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Image is required' 
        });
      }

      // Cari banner aktif lama
      const oldBanner = await Banner.findOne({ isActive: true });
      // Upload from memory buffer
      let uploadResult;
      try {
        uploadResult = await uploadBufferToCloudinary(req.file.buffer, { folder: 'peta-rawan-narkoba/banners', filename: req.file.originalname, resource_type: 'image' });
      } catch (e) {
        console.error('[banner] Cloudinary upload error:', e && e.stack ? e.stack : e);
        return res.status(500).json({ success: false, message: 'Cloudinary upload failed', error: e.message });
      }

      const imagePath = uploadResult.secure_url;
      const imagePublicId = uploadResult.public_id;

      if (oldBanner) {
        // Hapus file lama jika ada
        // If old banner was stored in Cloudinary, delete old asset
        if (oldBanner.imagePublicId) {
          try { await cloudinary.v2.uploader.destroy(oldBanner.imagePublicId); } catch (e) { console.warn('Failed to delete old banner from Cloudinary', e.message); }
        } else if (oldBanner.image) {
          const oldPath = path.join(__dirname, '..', oldBanner.image);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        // Update banner aktif
        oldBanner.image = imagePath;
        oldBanner.imagePublicId = imagePublicId;
        oldBanner.caption = caption || 'Informasi Area Rawan Narkoba';
        oldBanner.location = location || 'Kota Tanjungpinang';
        oldBanner.imageFit = imageFit || 'cover';
        if (imagePosition) {
          try {
            const pos = typeof imagePosition === 'string' ? JSON.parse(imagePosition) : imagePosition;
            oldBanner.imagePosition = {
              x: typeof pos.x === 'number' ? pos.x : 50,
              y: typeof pos.y === 'number' ? pos.y : 50
            };
          } catch (e) {
            oldBanner.imagePosition = { x: 50, y: 50 };
          }
        }
        oldBanner.isActive = true;
        await oldBanner.save();
        res.status(200).json({ 
          success: true, 
          message: 'Banner updated successfully',
          data: oldBanner 
        });
      } else {
        // Jika belum ada banner, buat baru
        let pos = { x: 50, y: 50 };
        if (imagePosition) {
          try {
            pos = typeof imagePosition === 'string' ? JSON.parse(imagePosition) : imagePosition;
          } catch {}
        }
        const banner = new Banner({
          image: imagePath,
          imagePublicId,
          caption: caption || 'Informasi Area Rawan Narkoba',
          location: location || 'Kota Tanjungpinang',
          imageFit: imageFit || 'cover',
          imagePosition: { x: typeof pos.x === 'number' ? pos.x : 50, y: typeof pos.y === 'number' ? pos.y : 50 },
          isActive: true
        });
        await banner.save();
        res.status(201).json({ 
          success: true, 
          message: 'Banner created successfully',
          data: banner 
        });
      }
    } catch (error) {
      // Hapus file jika ada error
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  });
});

// Update caption only
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { caption, location, imageFit, imagePosition } = req.body;
    const updateData = { caption, location };
    if (imageFit) {
      updateData.imageFit = imageFit;
    }
    if (imagePosition) {
      try {
        const pos = typeof imagePosition === 'string' ? JSON.parse(imagePosition) : imagePosition;
        updateData.imagePosition = { x: typeof pos.x === 'number' ? pos.x : 50, y: typeof pos.y === 'number' ? pos.y : 50 };
      } catch {
        updateData.imagePosition = { x: 50, y: 50 };
      }
    }
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!banner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Banner not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Banner updated successfully',
      data: banner 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Delete banner
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ 
        success: false, 
        message: 'Banner not found' 
      });
    }

    // Hapus file gambar di Cloudinary jika ada, otherwise hapus file lokal
    if (banner.imagePublicId) {
      try { await cloudinary.v2.uploader.destroy(banner.imagePublicId); } catch (e) { console.warn('Failed to delete banner on Cloudinary', e.message); }
    } else {
      const imagePath = path.join(__dirname, '..', banner.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Banner.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'Banner deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;
