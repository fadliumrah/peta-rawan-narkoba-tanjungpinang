import cloudinary from 'cloudinary';
import { Readable } from 'stream';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadBufferToCloudinary = (buffer, { folder = '', filename = undefined, resource_type = 'image' } = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream({ folder, resource_type }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    const readable = Readable.from(buffer);
    readable.pipe(stream);
  });
};

export default uploadBufferToCloudinary;
