import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  imagePublicId: {
    type: String,
    required: false,
    default: null
  },
  caption: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: 'Kota Tanjungpinang'
  },
  imageFit: {
    type: String,
    enum: ['cover', 'contain', 'fill', 'scale-down'],
    default: 'cover'
  },
  imagePosition: {
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Banner', bannerSchema);
