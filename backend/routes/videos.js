const router = require('express').Router();
const Video = require('../models/Video');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadVideo, uploadImage } = require('../config/cloudinary');

// Upload video
router.post('/', protect, uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn video' });
    const { title, description, tags, musicName, musicArtist } = req.body;
    const video = await Video.create({
      author: req.user._id,
      url: req.file.path,
      publicId: req.file.filename,
      title, description,
      tags: tags ? JSON.parse(tags) : [],
      music: musicName ? { name: musicName, artist: musicArtist } : undefined,
      thumbnail: req.file.path.replace('/upload/', '/upload/so_0,eo_0,f_jpg/')
    });
    await User.findByIdAndUpdate(req.user._id, { $inc: { videosCount: 1 } });
    await video.populate('author', 'username displayName avatar isVerified');
    res.status(201).json({ success: true, video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get videos for explore (For You feed)
router.get('/explore', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const videos = await Video.find({ isPublic: true })
      .sort({ viewsCount: -1, createdAt: -1 })
      .skip((page - 1) * limit).limit(+limit)
      .populate('author', 'username displayName avatar isVerified');
    res.json({ success: true, videos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get videos of following (Following feed)
router.get('/following', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = await User.findById(req.user._id).select('following');
    const videos = await Video.find({ author: { $in: user.following }, isPublic: true })
      .sort('-createdAt').skip((page - 1) * limit).limit(+limit)
      .populate('author', 'username displayName avatar isVerified');
    res.json({ success: true, videos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get user videos
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const videos = await Video.find({ author: req.params.userId, isPublic: true })
      .sort('-createdAt').skip((page - 1) * limit).limit(+limit)
      .populate('author', 'username displayName avatar isVerified');
    res.json({ success: true, videos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single video
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.id, { $inc: { viewsCount: 1 } }, { new: true })
      .populate('author', 'username displayName avatar isVerified followersCount')
      .populate('comments.user', 'username displayName avatar');
    if (!video) return res.status(404).json({ success: false, message: 'Video không tồn tại' });
    await User.findByIdAndUpdate(video.author._id, { $inc: { totalViews: 1 } });
    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete video
router.delete('/:id', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    if (video.author.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Không có quyền xóa' });
    await video.deleteOne();
    await User.findByIdAndUpdate(req.user._id, { $inc: { videosCount: -1 } });
    res.json({ success: true, message: 'Đã xóa video' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Like video
router.post('/:id/like', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    const liked = video.likes.includes(req.user._id);
    if (liked) { video.likes.pull(req.user._id); video.likesCount = Math.max(0, video.likesCount - 1); }
    else {
      video.likes.push(req.user._id); video.likesCount++;
      if (video.author.toString() !== req.user._id.toString()) {
        await Notification.create({ recipient: video.author, sender: req.user._id, type: 'video_like', video: video._id });
        const { io } = require('../server');
        io.to(`user_${video.author}`).emit('notification', { type: 'video_like', sender: req.user });
      }
    }
    await video.save();
    res.json({ success: true, liked: !liked, likesCount: video.likesCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Comment on video
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    video.comments.push({ user: req.user._id, text: req.body.text });
    video.commentsCount++;
    await video.save();
    await video.populate('comments.user', 'username displayName avatar');
    const comment = video.comments[video.comments.length - 1];
    res.json({ success: true, comment, commentsCount: video.commentsCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
