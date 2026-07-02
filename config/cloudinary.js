const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'socialshop/images', allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
});

const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'socialshop/videos', resource_type: 'video', allowed_formats: ['mp4', 'mov', 'avi', 'webm'] }
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'socialshop/avatars', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] }
});

const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'socialshop/covers', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 400, crop: 'fill' }] }
});

module.exports = {
  cloudinary,
  uploadImage: multer({ storage: imageStorage, limits: { fileSize: 10 * 1024 * 1024 } }),
  uploadVideo: multer({ storage: videoStorage, limits: { fileSize: 100 * 1024 * 1024 } }),
  uploadAvatar: multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } }),
  uploadCover: multer({ storage: coverStorage, limits: { fileSize: 10 * 1024 * 1024 } }),
};
