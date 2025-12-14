import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const updateAdminFields = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update admin user yang belum punya nama dan nomorKtp
    const admin = await User.findOne({ username: 'admin' });
    
    if (admin) {
      admin.nama = 'ADMINISTRATOR';
      admin.nomorKtp = '1308162101990001';
      await admin.save();
      console.log('✅ Admin user updated successfully!');
      console.log('Username:', admin.username);
      console.log('Nama:', admin.nama);
      console.log('Nomor KTP:', admin.nomorKtp);
    } else {
      console.log('❌ Admin user not found');
    }

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

updateAdminFields();
