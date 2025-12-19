import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  kelurahan: {
    type: String,
    required: true,
    enum: [
      'Dompak',
      'Sei Jang',
      'Tanjung Ayun Sakti',
      'Tanjungpinang Timur',
      'Tanjung Unggat',
      'Bukit Cermin',
      'Kampung Baru',
      'Kemboja',
      'Tanjungpinang Barat',
      'Kampung Bugis',
      'Penyengat',
      'Senggarang',
      'Tanjungpinang Kota',
      'Air Raja',
      'Batu IX',
      'Kampung Bulang',
      'Melayu Kota Piring',
      'Pinang Kencana'
    ]
  },
  // kecamatan dihapus
  address: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  cases: {
    type: Number,
    default: 1,
    min: 1
  },
  color: {
    type: String,
    default: '#FF5733'
  },
  // Metadata: who created the location
  createdBy: {
    type: String,
    ref: 'User',
    default: null
  },
  createdByName: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index untuk query yang lebih cepat
locationSchema.index({ kelurahan: 1 });
locationSchema.index({ createdBy: 1 });

export default mongoose.model('Location', locationSchema);
