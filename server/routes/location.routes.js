import express from 'express';
import Location from '../models/Location.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all locations (Public)
router.get('/', async (req, res) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      data: locations 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get statistics by kelurahan (Public)
router.get('/statistics', async (req, res) => {
  try {
    const stats = await Location.aggregate([
      {
        $group: {
          _id: '$kelurahan',
          total: { $sum: '$cases' },
          count: { $sum: 1 },
          color: { $first: '$color' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get single location
router.get('/:id', async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }

    res.json({ 
      success: true, 
      data: location 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Create location (Admin)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, kelurahan, kecamatan, address, description, cases, color } = req.body;

    if (!latitude || !longitude || !kelurahan) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude, longitude, and kelurahan are required' 
      });
    }

    const location = new Location({
      latitude,
      longitude,
      kelurahan,
      kecamatan: kecamatan || 'Tanjungpinang',
      address: address || '',
      description: description || '',
      cases: cases || 1,
      color: color || '#FF5733',
      // Attach creator info from authenticated token
      createdBy: req.user?.nomorKtp || req.user?.id || null,
      createdByName: req.user?.nama || ''
    });

    await location.save();

    // Create notification for new location (non-blocking)
    try {
      const Notification = (await import('../models/Notification.js')).default;
      const msg = `Lokasi baru: ${location.kelurahan} (${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)})`;
      await Notification.create({
        type: 'location',
        message: msg,
        payload: { locationId: location._id, kelurahan: location.kelurahan, latitude: location.latitude, longitude: location.longitude },
        isRead: false,
        readBy: [],
        createdBy: req.user?.nomorKtp || req.user?.id || null,
        createdByName: req.user?.nama || ''
      });
    } catch (notifErr) {
      console.error('Failed to create notification for new location:', notifErr && notifErr.message ? notifErr.message : notifErr);
    }

    res.status(201).json({ 
      success: true, 
      message: 'Location added successfully',
      data: location 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Update location (Admin)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, kelurahan, kecamatan, address, description, cases, color } = req.body;

    const location = await Location.findByIdAndUpdate(
      req.params.id,
      {
        latitude,
        longitude,
        kelurahan,
        kecamatan,
        address,
        description,
        cases,
        color
      },
      { new: true, runValidators: true }
    );

    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Location updated successfully',
      data: location 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Delete location (Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);

    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Location deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;
