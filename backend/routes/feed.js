const router = require('express').Router();
const Post = require('../models/Post');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');

// Following feed
router.get('/following', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = await User.findById(req.user._id).select('following');
    const ids = [...user.following, req.user._id];
    const posts = await Post.find({ author: { $in: ids }, isPublic: true })
      .sort('-createdAt').skip((page - 1) * limit).limit(+limit)
      .populate('author', 'username displayName avatar isVerified isOnline')
      .populate('comments.user', 'username displayName avatar');
    res.json({ success: true, posts, hasMore: posts.length === +limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Explore feed (suggested)
router.get('/explore', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const posts = await Post.find({ isPublic: true })
      .sort({ likesCount: -1, commentsCount: -1, createdAt: -1 })
      .skip((page - 1) * limit).limit(+limit)
      .populate('author', 'username displayName avatar isVerified isOnline')
      .populate('comments.user', 'username displayName avatar');
    res.json({ success: true, posts, hasMore: posts.length === +limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Suggested users
router.get('/suggested-users', optionalAuth, async (req, res) => {
  try {
    const exclude = req.user ? [req.user._id, ...(await User.findById(req.user._id).select('following')).following] : [];
    const users = await User.find({ _id: { $nin: exclude } })
      .sort({ followersCount: -1 }).limit(8)
      .select('username displayName avatar isVerified followersCount bio');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
