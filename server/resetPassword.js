import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import User from './models/User.js';

dotenv.config();

const resetAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update super admin password
    const superAdmin = await User.findById('1308162101990001');
    if (superAdmin) {
      const newPassword = process.env.SUPER_ADMIN_PASSWORD || randomBytes(8).toString('hex');
      superAdmin.password = newPassword;
      await superAdmin.save();
      console.log('✅ Super admin password reset to:', newPassword);
      console.log('   Username:', superAdmin.username);
      console.log('   NIK:', superAdmin._id);
      console.log('   Nama:', superAdmin.nama);
    } else {
      console.log('❌ Super admin not found');
    }

    // Check other admins
    const allAdmins = await User.find({});
    console.log('\n📋 All admins in database:');
    allAdmins.forEach(admin => {
      console.log(`   - ${admin.nama} (${admin.username}) | NIK: ${admin._id}`);
    });

    mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetAdminPassword();
