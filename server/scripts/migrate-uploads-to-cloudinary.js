/*
 Migration script: uploads -> Cloudinary
 Usage:
   node migrate-uploads-to-cloudinary.js --dry-run
   node migrate-uploads-to-cloudinary.js --confirm

 This script will:
 - Find Banner, Logo, News documents with local image paths.
 - Upload the local file to Cloudinary (respecting folder per type).
 - Update document `image` (secure_url) and `imagePublicId`.
 - Move the original local file to `uploads_backup/<timestamp>/...` for safety.

 Make sure `CLOUDINARY_*` env vars are set and `node` is run in the `server/` folder.
*/

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Banner from '../models/Banner.js';
import Logo from '../models/Logo.js';
import News from '../models/News.js';
import { uploadBufferToCloudinary } from '../utils/cloudinaryUploader.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dryRun = process.argv.includes('--dry-run');
const confirm = process.argv.includes('--confirm');

const backupDir = path.join(__dirname, '..', 'uploads_backup', `backup-${Date.now()}`);

const isLocalPath = (p) => {
  if (!p) return false;
  return !/^https?:\/\//i.test(p);
};

const ensureBackupDir = () => {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
};

const moveToBackup = (localPath) => {
  ensureBackupDir();
  const rel = path.relative(path.join(__dirname, '..'), localPath);
  const dest = path.join(backupDir, rel);
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.renameSync(localPath, dest);
};

const processDocs = async (Model, name, folder) => {
  const docs = await Model.find().lean();
  const candidates = docs.filter(d => d.image && isLocalPath(d.image));
  console.log(`Found ${candidates.length} ${name} entries with local images`);
  for (const doc of candidates) {
    const localPath = path.join(__dirname, '..', doc.image);
    if (!fs.existsSync(localPath)) {
      console.warn(` - [MISSING] ${name} ${doc._id}: local file not found: ${localPath}`);
      continue;
    }

    console.log(` - ${name} ${doc._id}: will upload ${localPath} -> Cloudinary/${folder}`);
    if (dryRun) continue;

    const buffer = fs.readFileSync(localPath);
    try {
      const result = await uploadBufferToCloudinary(buffer, { folder: `peta-rawan-narkoba/${folder}`, filename: path.basename(localPath) });
      console.log(`   uploaded -> ${result.secure_url}`);
      if (!confirm) {
        console.log('   (not saving changes; run with --confirm to persist)');
        continue;
      }

      // update document
      await Model.updateOne({ _id: doc._id }, { $set: { image: result.secure_url, imagePublicId: result.public_id } });
      // move file to backup
      moveToBackup(localPath);
      console.log('   updated doc and moved local file to backup');
    } catch (e) {
      console.error('   upload failed:', e.message);
    }
  }
};

const run = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/peta-rawan-narkoba';
  await mongoose.connect(uri);
  try {
    await processDocs(Banner, 'Banner', 'banners');
    await processDocs(Logo, 'Logo', 'logos');
    await processDocs(News, 'News', 'news');
  } finally {
    await mongoose.disconnect();
    console.log('Done.');
  }
};

run().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
