import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  imagePublicId: {
    type: String,
    required: false,
    default: null
  },
  content: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    ref: 'User',
    required: false // Ubah ke false agar berita lama tetap bisa jalan
  },
  // Field lama untuk backward compatibility
  editor: {
    type: String,
    required: false
  },
  views: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual untuk mendapatkan excerpt
newsSchema.virtual('excerpt').get(function() {
  const plainText = this.content.replace(/<[^>]*>/g, '');
  return plainText.substring(0, 150) + '...';
});

// Virtual untuk mendapatkan nama penulis (dengan fallback ke editor lama)
newsSchema.virtual('authorName').get(function() {
  if (this.createdBy && this.createdBy.nama) {
    return this.createdBy.nama;
  }
  return this.editor || 'Unknown';
});

// Set virtuals to true untuk JSON response
newsSchema.set('toJSON', { virtuals: true });
newsSchema.set('toObject', { virtuals: true });

// Index untuk pencarian
newsSchema.index({ title: 'text', content: 'text' });

export default mongoose.model('News', newsSchema);
