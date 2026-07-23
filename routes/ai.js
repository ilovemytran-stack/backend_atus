const router = require('express').Router();
const { protect, optionalAuth } = require('../middleware/auth');
const { askAI, generateCaption } = require('../services/aiService');

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 10;

// Trợ lý hỏi-đáp về Public + G.Legendary — cho phép cả khách lẫn user đăng nhập dùng.
router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Thiếu nội dung tin nhắn' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ success: false, message: `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự)` });
    }

    const trimmedHistory = Array.isArray(history)
      ? history.slice(-MAX_HISTORY_TURNS * 2).filter((m) => m && m.role && m.content)
      : [];

    const { reply, usage } = await askAI(message.trim(), trimmedHistory, req.user);
    res.json({ success: true, reply, cacheHit: (usage?.cache_read_input_tokens || 0) > 0 });
  } catch (err) {
    console.error('[routes/ai] /chat error:', err.message);
    res.status(500).json({ success: false, message: 'AI đang gặp sự cố, thử lại sau' });
  }
});

// Sinh title/mô tả/hashtag/caption gợi ý cho Atelier — cần đăng nhập vì gắn với nội dung người dùng đang tạo
router.post('/caption', protect, async (req, res) => {
  try {
    const { promptText } = req.body || {};
    if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
      return res.status(400).json({ success: false, message: 'Thiếu mô tả video' });
    }
    const result = await generateCaption(promptText.trim());
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[routes/ai] /caption error:', err.message);
    res.status(500).json({ success: false, message: 'Không tạo được gợi ý lúc này' });
  }
});

module.exports = router;
