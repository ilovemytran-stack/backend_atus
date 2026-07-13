const router = require('express').Router();
const Announcement = require('../models/Announcement');
const { protect } = require('../middleware/auth');

// Bất kỳ người dùng đã đăng nhập nào cũng xem được thông báo đang hoạt động (khác /admin/announcements chỉ admin/mod)
router.get('/active', protect, async (req, res) => {
  try {
    const ann = await Announcement.findOne({ active: true }).sort('-createdAt');
    res.json({ success: true, announcement: ann || null });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
