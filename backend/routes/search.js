const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Video = require('../models/Video');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q, type = 'all', page = 1, limit = 10 } = req.query;
    if (!q) return res.json({ success: true, results: {} });
    const regex = new RegExp(q, 'i');
    const results = {};

    if (type === 'all' || type === 'users') {
      results.users = await User.find({ $or: [{ username: regex }, { displayName: regex }] })
        .select('username displayName avatar isVerified followersCount bio').limit(10);
    }
    if (type === 'all' || type === 'posts') {
      results.posts = await Post.find({ content: regex, isPublic: true })
        .sort('-likesCount').limit(+limit).populate('author', 'username displayName avatar isVerified');
    }
    if (type === 'all' || type === 'videos') {
      results.videos = await Video.find({ $or: [{ title: regex }, { description: regex }, { tags: regex }], isPublic: true })
        .sort('-viewsCount').limit(+limit).populate('author', 'username displayName avatar isVerified');
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
