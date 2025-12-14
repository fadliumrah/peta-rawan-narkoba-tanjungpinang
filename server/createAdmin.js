import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import User from './models/User.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('❌ Admin user already exists. Run migrateAdmin.js first to migrate existing data.');
    } else {
      // Create new admin user with KTP as _id
      const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || randomBytes(8).toString('hex');
      const admin = new User({
        _id: '1308162101990001', // KTP sebagai primary key
        username: 'admin',
        password: defaultPassword,
        nama: 'MUHAMAD FADLI',
        role: 'admin',
        isActive: true
      });
      
      await admin.save();
      console.log('✅ Super Admin created successfully!');
      console.log('NIK/KTP: 1308162101990001');
      console.log('Username: admin');
      console.log('Password:', defaultPassword); 
      console.log('Nama: MUHAMAD FADLI');
      console.log('Nomor KTP: 1308162101990001 (SUPER ADMIN)');
    }

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdminUser();
