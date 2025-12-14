import express from 'express';
import Logo from '../models/Logo.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadLogo } from '../middleware/upload.js';
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

// Get active logo (Public)
router.get('/active', async (req, res) => {
  try {
    const logo = await Logo.findOne({ isActive: true }).sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      data: logo 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Update/Create logo (Admin)
router.post('/', authenticateToken, (req, res) => {
  uploadLogo(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }

      try {
        const { title, subtitle } = req.body;

        if (!req.file) {
          return res.status(400).json({ 
            success: false, 
            message: 'Logo image is required' 
          });
        }

        // Cari logo aktif lama
        const oldLogo = await Logo.findOne({ isActive: true });
        // Upload from memory buffer (no local file)
        let uploadResult;
        try {
          uploadResult = await uploadBufferToCloudinary(req.file.buffer, { folder: 'peta-rawan-narkoba/logos', filename: req.file.originalname, resource_type: 'image' });
        } catch (e) {
          return res.status(500).json({ success: false, message: 'Cloudinary upload failed', error: e.message });
        }

        const imagePath = uploadResult.secure_url;
        const imagePublicId = uploadResult.public_id;

        if (oldLogo) {
          // Hapus file lama jika ada
          if (oldLogo.imagePublicId) {
              try { await cloudinary.v2.uploader.destroy(oldLogo.imagePublicId); } catch (e) { console.warn('Failed to delete old logo from Cloudinary', e.message); }
            } else if (oldLogo.image) {
              const oldPath = path.join(__dirname, '..', oldLogo.image);
              if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
              }
            }
          // Update logo aktif
          oldLogo.image = imagePath;
          oldLogo.imagePublicId = imagePublicId;
          oldLogo.title = title || 'BADAN NARKOTIKA NASIONAL';
          oldLogo.subtitle = subtitle || 'KOTA TANJUNGPINANG';
          oldLogo.isActive = true;
          await oldLogo.save();
          res.status(200).json({ 
            success: true, 
            message: 'Logo updated successfully',
            data: oldLogo 
          });
        } else {
          // Jika belum ada logo, buat baru
          const logo = new Logo({
            image: imagePath,
            imagePublicId,
            title: title || 'BADAN NARKOTIKA NASIONAL',
            subtitle: subtitle || 'KOTA TANJUNGPINANG',
            isActive: true
          });
          await logo.save();
          res.status(201).json({ 
            success: true, 
            message: 'Logo created successfully',
            data: logo 
          });
        }
      } catch (error) {
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

export default router;
