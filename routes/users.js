const router = require('express').Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadAvatar, uploadCover } = require('../config/cloudinary');

// Get user profile
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password -refreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    const isFollowing = req.user ? user.followers.includes(req.user._id) : false;
    res.json({ success: true, user: { ...user.toObject(), isFollowing } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update profile
router.put('/profile/update', protect, async (req, res) => {
  try {
    const { displayName, bio, website, location } = req.body;
    const updated = await User.findByIdAndUpdate(req.user._id, { displayName, bio, website, location }, { new: true }).select('-password');
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Đổi username (@handle) - giới hạn 1 lần / 1 giờ
const USERNAME_COOLDOWN_MS = 60 * 60 * 1000; // 1 giờ

router.put('/profile/username', protect, async (req, res) => {
  try {
    const raw = (req.body.username || '').trim().toLowerCase();

    if (!/^[a-z0-9_]{3,30}$/.test(raw)) {
      return res.status(400).json({ success: false, message: 'Tên người dùng chỉ gồm chữ thường, số và dấu gạch dưới (3-30 ký tự)' });
    }

    if (raw === req.user.username) {
      return res.json({ success: true, user: req.user.toPublic(), unchanged: true });
    }

    const last = req.user.usernameChangedAt;
    if (last) {
      const elapsed = Date.now() - new Date(last).getTime();
      if (elapsed < USERNAME_COOLDOWN_MS) {
        const remainingMin = Math.ceil((USERNAME_COOLDOWN_MS - elapsed) / 60000);
        return res.status(429).json({
          success: false,
          message: `Bạn chỉ có thể đổi tên người dùng mỗi 1 giờ. Vui lòng thử lại sau ${remainingMin} phút.`,
          remainingMs: USERNAME_COOLDOWN_MS - elapsed,
        });
      }
    }

    const taken = await User.findOne({ username: raw, _id: { $ne: req.user._id } });
    if (taken) return res.status(400).json({ success: false, message: 'Tên người dùng đã được sử dụng' });

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { username: raw, usernameChangedAt: new Date() },
      { new: true }
    ).select('-password');

    res.json({ success: true, user: updated, message: 'Đã đổi tên người dùng thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Upload avatar
router.put('/profile/avatar', protect, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Không có file' });
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: req.file.path }, { new: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Xóa avatar (quay về ảnh mặc định)
router.delete('/profile/avatar', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: '' }, { new: true }).select('-password');
    res.json({ success: true, user, message: 'Đã xóa ảnh đại diện' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Upload cover
router.put('/profile/cover', protect, uploadCover.single('cover'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Không có file' });
    const user = await User.findByIdAndUpdate(req.user._id, { coverPhoto: req.file.path }, { new: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Follow / Unfollow
router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'Không thể tự follow mình' });

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

    const isFollowing = target.followers.includes(req.user._id);
    if (isFollowing) {
      await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user._id }, $inc: { followersCount: -1 } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id }, $inc: { followingCount: -1 } });
      res.json({ success: true, following: false, message: 'Đã hủy follow' });
    } else {
      await User.findByIdAndUpdate(req.params.id, { $addToSet: { followers: req.user._id }, $inc: { followersCount: 1 } });
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: req.params.id }, $inc: { followingCount: 1 } });
      await Notification.create({ recipient: req.params.id, sender: req.user._id, type: 'follow' });
      const { io } = require('../server');
      io.to(`user_${req.params.id}`).emit('notification', { type: 'follow', sender: req.user });
      res.json({ success: true, following: true, message: 'Đã follow' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get followers
router.get('/:id/followers', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'username displayName avatar isOnline followersCount');
    res.json({ success: true, followers: user.followers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get following
router.get('/:id/following', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('following', 'username displayName avatar isOnline followersCount');
    res.json({ success: true, following: user.following });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get user stats
router.get('/:id/stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('followersCount followingCount postsCount videosCount totalViews');
    res.json({ success: true, stats: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
