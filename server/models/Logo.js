import mongoose from 'mongoose';

const logoSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  imagePublicId: {
    type: String,
    required: false,
    default: null
  },
  title: {
    type: String,
    default: 'BADAN NARKOTIKA NASIONAL'
  },
  subtitle: {
    type: String,
    default: 'KOTA TANJUNGPINANG'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Logo', logoSchema);
