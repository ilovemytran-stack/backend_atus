const router = require('express').Router();
const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const { protect } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// Route upload DÙNG CHUNG cho các tính năng mới (Atelier, và sau này có thể
// tái sử dụng cho Shop...). Khác với 4 route ảnh/video/avatar/cover cũ trong
// config/cloudinary.js (mỗi cái buộc cứng 1 folder qua multer-storage-cloudinary),
// route này nhận field "context" để tự chọn thư mục Cloudinary, nên không
// cần thêm route mới mỗi khi có 1 tính năng cần upload media khác.
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Thiếu file' });

    const context = String(req.body.context || 'misc').replace(/[^a-z0-9_-]/gi, '') || 'misc';
    const folder = `socialshop/${context}`;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (err, uploaded) => (err ? reject(err) : resolve(uploaded))
      );
      stream.end(req.file.buffer);
    });

    res.json({ success: true, url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type });
  } catch (err) {
    console.error('❌ Lỗi upload media:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
