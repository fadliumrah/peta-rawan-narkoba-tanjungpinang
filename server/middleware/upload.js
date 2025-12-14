import multer from 'multer';

// Use memory storage: files will be uploaded directly to Cloudinary without
// being persisted on disk. This simplifies deployments and avoids local
// state. Keep limits to defend against large uploads.
const memory = multer.memoryStorage();

// File filter untuk validasi tipe file
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Multer upload configs
export const uploadBanner = multer({
  storage: memory,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter
}).single('image');

export const uploadLogo = multer({
  storage: memory,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: imageFilter
}).single('image');

export const uploadNews = multer({
  storage: memory,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter
}).single('image');
