const router = require('express').Router();
const { Message, Conversation } = require('../models/Chat');
const { protect } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');

// Get or create conversation
router.post('/conversation', protect, async (req, res) => {
  try {
    const { userId } = req.body;
    let conv = await Conversation.findOne({ participants: { $all: [req.user._id, userId] } });
    if (!conv) conv = await Conversation.create({ participants: [req.user._id, userId] });
    await conv.populate('participants', 'username displayName avatar isOnline lastSeen');
    res.json({ success: true, conversation: conv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all conversations
router.get('/conversations', protect, async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id })
      .sort('-lastMessageAt')
      .populate('participants', 'username displayName avatar isOnline lastSeen')
      .populate('lastMessage');
    res.json({ success: true, conversations: convs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get messages in conversation
router.get('/:conversationId/messages', protect, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const messages = await Message.find({ conversation: req.params.conversationId })
      .sort('-createdAt').skip((page - 1) * limit).limit(+limit)
      .populate('sender', 'username displayName avatar');
    // Mark as read
    await Message.updateMany(
      { conversation: req.params.conversationId, sender: { $ne: req.user._id }, isRead: false },
      { isRead: true, $addToSet: { readBy: req.user._id } }
    );
    res.json({ success: true, messages: messages.reverse(), hasMore: messages.length === +limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Send message
router.post('/:conversationId/messages', protect, uploadImage.single('image'), async (req, res) => {
  try {
    const { content, type } = req.body;
    const media = req.file ? { url: req.file.path, publicId: req.file.filename } : undefined;
    const message = await Message.create({
      conversation: req.params.conversationId,
      sender: req.user._id,
      type: type || (req.file ? 'image' : 'text'),
      content, media
    });
    await message.populate('sender', 'username displayName avatar');

    await Conversation.findByIdAndUpdate(req.params.conversationId, {
      lastMessage: message._id,
      lastMessageText: content || '📷 Ảnh',
      lastMessageAt: new Date()
    });

    const { io } = require('../server');
    const conv = await require('../models/Chat').Conversation.findById(req.params.conversationId);
    conv.participants.forEach(p => {
      if (p.toString() !== req.user._id.toString())
        io.to(`user_${p}`).emit('new_message', { message, conversationId: req.params.conversationId });
    });

    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
