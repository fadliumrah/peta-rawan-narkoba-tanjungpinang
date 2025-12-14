import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register (untuk membuat admin pertama kali)
router.post('/register', async (req, res) => {
  try {
    const { username, password, nama, nomorKtp, role } = req.body;

    if (!username || !password || !nama || !nomorKtp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, password, nama, dan nomor KTP wajib diisi' 
      });
    }

    // Validasi hanya super admin yang bisa menambah admin
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token autentikasi diperlukan' 
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.nomorKtp !== '1308162101990001') {
        return res.status(403).json({ 
          success: false, 
          message: 'Hanya Super Admin yang dapat menambahkan admin baru' 
        });
      }
    } catch (err) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token tidak valid' 
      });
    }

    // Cek apakah username sudah ada
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username sudah digunakan' 
      });
    }

    // Cek apakah nomor KTP sudah ada
    const existingKtp = await User.findById(nomorKtp);
    if (existingKtp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nomor KTP sudah terdaftar' 
      });
    }

    const user = new User({ 
      _id: nomorKtp,
      username, 
      password, 
      nama,
      role: role || 'admin' 
    });
    await user.save();

    res.status(201).json({ 
      success: true, 
      message: 'Admin berhasil ditambahkan',
      data: {
        nomorKtp: user._id,
        username: user.username,
        nama: user.nama,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const token = jwt.sign(
      { 
        id: user._id,
        nomorKtp: user._id,
        username: user.username,
        nama: user.nama,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      message: 'Login successful',
      data: {
        token,
        nomorKtp: user._id,
        username: user.username,
        nama: user.nama,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token tidak ditemukan' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.nomorKtp).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    res.json({ 
      success: true, 
      data: {
        nomorKtp: user._id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token tidak valid' 
    });
  }
});

// Get all users (Admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      data: users 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    // Check if updating super admin by non-super admin
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const isSuperAdmin = decoded.nomorKtp === '1308162101990001';
      const isEditingSuperAdmin = req.params.id === '1308162101990001';
      
      // Only super admin can edit super admin account
      if (isEditingSuperAdmin && !isSuperAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Hanya Super Admin yang dapat mengedit akun Super Admin' 
        });
      }
    }

    const { nama, username, isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    // Check if username changed and already exists
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username sudah digunakan' 
        });
      }
      user.username = username;
    }

    if (nama) user.nama = nama;
    if (typeof isActive !== 'undefined') user.isActive = isActive;

    await user.save();

    res.json({ 
      success: true, 
      message: 'User berhasil diupdate',
      data: {
        nomorKtp: user._id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    // Always prevent delete super admin (even by themselves for safety)
    if (req.params.id === '1308162101990001') {
      return res.status(403).json({ 
        success: false, 
        message: 'Akun Super Admin tidak dapat dihapus untuk keamanan sistem' 
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'User berhasil dihapus' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Reset password
router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password minimal 6 karakter' 
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Password berhasil direset' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;
