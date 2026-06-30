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
