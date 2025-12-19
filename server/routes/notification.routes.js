import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications?unread=true&limit=50
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { unread, limit = 100 } = req.query;
    const userId = req.user?.id || req.user?.nomorKtp;

    // Build base filter. If `unread=true` only return notifications that the current user hasn't read yet.
    // Treat legacy `isRead: true` as globally read and exclude them from unread results.
    const filter = {};
    if (unread === 'true') {
      filter.$and = [
        { isRead: { $ne: true } },
        { $or: [
            { readBy: { $exists: false } },
            { readBy: { $nin: [userId] } }
        ] }
      ];
    }

    const notifs = await Notification.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit, 10));

    // Attach per-user `isRead` flag for the current user for convenience in the client
    const transformed = notifs.map((n) => {
      const obj = n.toObject();
      // Legacy: if `isRead` was previously set true, treat it as read for everyone.
      obj.isRead = obj.isRead === true ? true : (Array.isArray(obj.readBy) ? obj.readBy.includes(userId) : false);
      return obj;
    });

    res.json({ success: true, data: transformed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/notifications/count -> { count: number }
router.get('/count', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.nomorKtp;
    const count = await Notification.countDocuments({ $and: [ { isRead: { $ne: true } }, { $or: [{ readBy: { $exists: false } }, { readBy: { $nin: [userId] } }] } ] });
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.nomorKtp;
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { readBy: userId } },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    const obj = notif.toObject();
    obj.isRead = obj.isRead === true ? true : (Array.isArray(obj.readBy) ? obj.readBy.includes(userId) : false);
    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.nomorKtp;
    const filter = { $or: [{ readBy: { $exists: false } }, { readBy: { $nin: [userId] } }] };
    await Notification.updateMany(filter, { $addToSet: { readBy: userId } });
    res.json({ success: true, message: 'All notifications marked as read for current user' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
