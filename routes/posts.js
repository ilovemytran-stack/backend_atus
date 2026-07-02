const router = require('express').Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');

// Create post
router.post('/', protect, uploadImage.array('images', 10), async (req, res) => {
  try {
    const { content, type, tags } = req.body;
    const images = req.files?.map(f => ({ url: f.path, publicId: f.filename })) || [];
    const post = await Post.create({
      author: req.user._id, content, type: type || (images.length ? 'image' : 'text'),
      images, tags: tags ? JSON.parse(tags) : []
    });
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } });
    await post.populate('author', 'username displayName avatar isVerified');
    res.status(201).json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get posts of a user
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const posts = await Post.find({ author: req.params.userId, isPublic: true })
      .sort('-createdAt').skip((page - 1) * limit).limit(+limit)
      .populate('author', 'username displayName avatar isVerified');
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } }, { new: true })
      .populate('author', 'username displayName avatar isVerified')
      .populate('comments.user', 'username displayName avatar');
    if (!post) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại' });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete post
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Không có quyền xóa' });
    await post.deleteOne();
    await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: -1 } });
    res.json({ success: true, message: 'Đã xóa bài viết' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Like / Unlike post
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const liked = post.likes.includes(req.user._id);
    if (liked) {
      post.likes.pull(req.user._id);
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      post.likes.push(req.user._id);
      post.likesCount++;
      if (post.author.toString() !== req.user._id.toString()) {
        await Notification.create({ recipient: post.author, sender: req.user._id, type: 'like', post: post._id });
        const { io } = require('../server');
        io.to(`user_${post.author}`).emit('notification', { type: 'like', sender: req.user, postId: post._id });
      }
    }
    await post.save();
    res.json({ success: true, liked: !liked, likesCount: post.likesCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add comment
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const comment = { user: req.user._id, text: req.body.text };
    post.comments.push(comment);
    post.commentsCount++;
    await post.save();
    await post.populate('comments.user', 'username displayName avatar');
    const newComment = post.comments[post.comments.length - 1];

    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({ recipient: post.author, sender: req.user._id, type: 'comment', post: post._id });
      const { io } = require('../server');
      io.to(`user_${post.author}`).emit('notification', { type: 'comment', sender: req.user, postId: post._id });
    }
    res.json({ success: true, comment: newComment, commentsCount: post.commentsCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete comment
router.delete('/:id/comment/:commentId', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
    if (comment.user.toString() !== req.user._id.toString() && post.author.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    comment.deleteOne();
    post.commentsCount = Math.max(0, post.commentsCount - 1);
    await post.save();
    res.json({ success: true, message: 'Đã xóa bình luận' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Share post
router.post('/:id/share', protect, async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { $inc: { sharesCount: 1 } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
