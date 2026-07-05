const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Video = require('../models/Video');
const { protect } = require('../middleware/auth');

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền thao tác này' });
  next();
};
const staffOnly = (req, res, next) => {
  if (!['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Chỉ admin/điều hành mới có quyền truy cập' });
  next();
};

router.use(protect, staffOnly);

// ===== STATS =====
router.get('/stats', async (req, res) => {
  try {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const [totalUsers, totalPosts, totalVideos, bannedUsers, newUsersToday, admins] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Video.countDocuments(),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ role: 'admin' }),
    ]);
    res.json({ success: true, stats: { totalUsers, totalPosts, totalVideos, bannedUsers, newUsersToday, admins } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== USERS =====
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = search
      ? { $or: [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { displayName: new RegExp(search, 'i') }] }
      : {};
    const [users, total] = await Promise.all([
      User.find(query).sort('-createdAt').skip((page - 1) * limit).limit(+limit).select('-password'),
      User.countDocuments(query),
    ]);
    res.json({ success: true, users, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === String(req.user._id)) return res.status(400).json({ success: false, message: 'Không thể tự xóa chính mình' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    if (req.user.role !== 'admin' && ['admin', 'moderator'].includes(target.role)) {
      return res.status(403).json({ success: false, message: 'Điều hành không thể xóa tài khoản admin hoặc điều hành khác' });
    }
    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Post.deleteMany({ author: req.params.id }),
      Video.deleteMany({ author: req.params.id }),
    ]);
    res.json({ success: true, message: 'Đã xóa người dùng cùng bài viết/video của họ' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id/role', adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'moderator', 'admin'].includes(role)) return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
    if (req.params.id === String(req.user._id) && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Không thể tự hạ quyền chính mình' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    res.json({ success: true, user, message: `Đã đổi quyền thành ${role}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Tăng/giảm Xu VIP cho user — CHỈ ADMIN, điều hành không có quyền này
router.put('/users/:id/coin', adminOnly, async (req, res) => {
  try {
    const { amount } = req.body; // số dương = cộng, số âm = trừ
    const delta = Number(amount);
    if (!delta || Number.isNaN(delta)) return res.status(400).json({ success: false, message: 'Số xu không hợp lệ' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    target.vipCoin = Math.max(0, (target.vipCoin || 0) + delta);
    await target.save();
    res.json({ success: true, vipCoin: target.vipCoin, message: `Đã ${delta > 0 ? 'cộng' : 'trừ'} ${Math.abs(delta)} Xu VIP cho ${target.username}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id/ban', async (req, res) => {
  try {
    if (req.params.id === String(req.user._id)) return res.status(400).json({ success: false, message: 'Không thể tự khóa chính mình' });
    const targetCheck = await User.findById(req.params.id);
    if (!targetCheck) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    if (req.user.role !== 'admin' && ['admin', 'moderator'].includes(targetCheck.role)) {
      return res.status(403).json({ success: false, message: 'Điều hành không thể khóa tài khoản admin hoặc điều hành khác' });
    }
    const { isBanned, banReason = '' } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: !!isBanned, banReason: isBanned ? banReason : '' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    res.json({ success: true, user, message: isBanned ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== POSTS =====
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = search ? { content: new RegExp(search, 'i') } : {};
    const [posts, total] = await Promise.all([
      Post.find(query).sort('-createdAt').skip((page - 1) * limit).limit(+limit).populate('author', 'username displayName avatar'),
      Post.countDocuments(query),
    ]);
    res.json({ success: true, posts, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    await User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });
    res.json({ success: true, message: 'Đã xóa bài viết' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== VIDEOS =====
router.get('/videos', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = search ? { title: new RegExp(search, 'i') } : {};
    const [videos, total] = await Promise.all([
      Video.find(query).sort('-createdAt').skip((page - 1) * limit).limit(+limit).populate('author', 'username displayName avatar'),
      Video.countDocuments(query),
    ]);
    res.json({ success: true, videos, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    await User.findByIdAndUpdate(video.author, { $inc: { videosCount: -1 } });
    res.json({ success: true, message: 'Đã xóa video' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
