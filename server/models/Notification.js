import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['location', 'news', 'system', 'custom']
  },
  message: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  // Per-user read tracking. Store user IDs (nomorKtp) who have read this notification
  readBy: {
    type: [String],
    default: []
  },
  createdBy: {
    type: String,
    ref: 'User',
    default: null
  },
  createdByName: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Index readBy to speed up per-user unread queries
notificationSchema.index({ readBy: 1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
