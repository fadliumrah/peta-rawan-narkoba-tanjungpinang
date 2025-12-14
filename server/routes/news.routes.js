import express from 'express';
import News from '../models/News.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadNews } from '../middleware/upload.js';
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

// Get all news (Public gets published only, Admin gets all)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;
    const includeUnpublished = req.query.includeUnpublished === 'true';
    const search = (req.query.search || '').trim();

    // Check if request is from authenticated admin
    let isAdmin = false;
    const token = req.headers.authorization?.split(' ')[1];
    if (token && includeUnpublished) {
      try {
        const jwt = await import('jsonwebtoken');
        jwt.default.verify(token, process.env.JWT_SECRET);
        isAdmin = true;
      } catch (err) {
        // Token invalid, treat as public
        isAdmin = false;
      }
    }

    // Admin can see all news, public only sees published
    const baseFilter = isAdmin ? {} : { isPublished: true };

    // Build search filter if query provided
    let finalFilter = baseFilter;
    if (search) {
      // Build OR conditions for title, content, editor and author name
      const searchRegex = { $regex: search, $options: 'i' };

      // Find users whose name matches search (for author search)
      const User = (await import('../models/User.js')).default;
      const matchingUsers = await User.find({ nama: searchRegex }).select('_id');
      const userIds = matchingUsers.map(u => u._id.toString());

      const orConditions = [
        { title: searchRegex },
        { content: searchRegex },
        { editor: searchRegex }
      ];

      if (userIds.length > 0) {
        orConditions.push({ createdBy: { $in: userIds } });
      }

      finalFilter = { $and: [baseFilter, { $or: orConditions }] };
    }

    const news = await News.find(finalFilter)
      .populate('createdBy', 'nama')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await News.countDocuments(finalFilter);

    res.json({ 
      success: true, 
      data: news,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get single news (Public)
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('createdBy', 'nama');
    
    if (!news) {
      return res.status(404).json({ 
        success: false, 
        message: 'News not found' 
      });
    }

    // Increment views only if not from admin panel (check query parameter)
    const skipViewCount = req.query.skipViewCount === 'true';
    
    if (!skipViewCount) {
      // Use atomic operation to prevent race conditions and get updated document
      const updatedNews = await News.findByIdAndUpdate(
        req.params.id,
        { $inc: { views: 1 } },
        { new: true }
      ).populate('createdBy', 'nama');
      
      return res.json({ 
        success: true, 
        data: updatedNews 
      });
    }

    res.json({ 
      success: true, 
      data: news 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Create news (Admin)
router.post('/', authenticateToken, (req, res) => {
  uploadNews(req, res, async (err) => {
    console.log('[news] upload request: filePresent=', !!req.file, 'size=', req.file?.size, 'name=', req.file?.originalname);
    if (err) {
      console.error('[news] multer error:', err && err.message ? err.message : err);
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }

    try {
      const { title, content, isPublished } = req.body;

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'News image is required' 
        });
      }
      if (!title || !content) {
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          success: false, 
          message: 'Title and content are required' 
        });
      }

      const localPath = req.file.path;
      let uploadResult;
      try {
        uploadResult = await uploadBufferToCloudinary(req.file.buffer, { folder: 'peta-rawan-narkoba/news', filename: req.file.originalname, resource_type: 'image' });
      } catch (e) {
        console.error('[news] Cloudinary upload error:', e && e.stack ? e.stack : e);
        return res.status(500).json({ success: false, message: 'Cloudinary upload failed', error: e.message });
      }

      const imagePath = uploadResult.secure_url;
      const imagePublicId = uploadResult.public_id;

      const news = new News({
        title,
        image: imagePath,
        imagePublicId,
        content,
        createdBy: req.user.id || req.user.nomorKtp,
        isPublished: isPublished !== undefined ? isPublished : true
      });

      await news.save();
      // Populate setelah save untuk mendapatkan nama user
      await news.populate('createdBy', 'nama');

      res.status(201).json({ 
        success: true, 
        message: 'News created successfully',
        data: news 
      });
    } catch (error) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  });
});

// Update news (Admin)
router.put('/:id', authenticateToken, (req, res) => {
  uploadNews(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }

    try {
      const { title, content, isPublished } = req.body;
      
      const news = await News.findById(req.params.id)
        .populate('createdBy', 'nama');
      if (!news) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ 
          success: false, 
          message: 'News not found' 
        });
      }

      // Update fields
      if (title) news.title = title;
      if (content) news.content = content;
      if (isPublished !== undefined) news.isPublished = isPublished;

      // Update image if new file uploaded
      if (req.file) {
        const localPath = req.file.path;

        // Upload new image to Cloudinary from memory buffer (we use memory storage)
        let uploadResult;
        try {
          // Prefer uploading from buffer to support memory storage in multer
          uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
            folder: 'peta-rawan-narkoba/news',
            filename: req.file.originalname,
            resource_type: 'image'
          });
        } catch (e) {
          console.error('[news] Cloudinary upload error (update):', e && e.stack ? e.stack : e);
          return res.status(500).json({ success: false, message: 'Cloudinary upload failed', error: e.message });
        }

        const imagePath = uploadResult.secure_url;
        const imagePublicId = uploadResult.public_id;

        // Delete old image on Cloudinary if we have public id
        if (news.imagePublicId) {
          try { await cloudinary.v2.uploader.destroy(news.imagePublicId); } catch (e) { console.warn('Failed to delete old news image from Cloudinary', e.message); }
        } else {
          const oldImagePath = path.join(__dirname, '..', news.image);
          if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }

        news.image = imagePath;
        news.imagePublicId = imagePublicId;
      }

      await news.save();
      
      // Populate again after save untuk return response
      await news.populate('createdBy', 'nama');

      res.json({ 
        success: true, 
        message: 'News updated successfully',
        data: news 
      });
    } catch (error) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  });
});

// Delete news (Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    
    if (!news) {
      return res.status(404).json({ 
        success: false, 
        message: 'News not found' 
      });
    }

    // Delete image file on Cloudinary if present, otherwise delete local file
    if (news.imagePublicId) {
      try { await cloudinary.v2.uploader.destroy(news.imagePublicId); } catch (e) { console.warn('Failed to delete news image from Cloudinary', e.message); }
    } else {
      const imagePath = path.join(__dirname, '..', news.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await News.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'News deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;
