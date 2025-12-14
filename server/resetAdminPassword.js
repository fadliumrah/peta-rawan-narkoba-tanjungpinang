import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import User from './models/User.js';

dotenv.config();

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin with super admin KTP
    const admin = await User.findOne({ nomorKtp: '1308162101990001' });
    
    if (admin) {
      console.log('Found user:', admin.username);
      const newPassword = process.env.SUPER_ADMIN_PASSWORD || randomBytes(8).toString('hex');
      console.log('Resetting password to:', newPassword);
      
      admin.password = newPassword;
      admin.username = 'admin'; // Change username to admin
      await admin.save();
      
      console.log('✅ Password reset successfully!');
      console.log('Username:', admin.username);
      console.log('Password:', newPassword);
      console.log('KTP:', admin.nomorKtp);
    } else {
      console.log('❌ Super admin not found');
    }

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetPassword();
