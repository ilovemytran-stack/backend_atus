const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
const signRefresh = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE });

const sendTokens = (user, res, statusCode = 200) => {
  const token = signToken(user._id);
  const refreshToken = signRefresh(user._id);
  res.status(statusCode).json({ success: true, token, refreshToken, user: user.toPublic() });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ success: false, message: exists.email === email ? 'Email đã được sử dụng' : 'Username đã tồn tại' });

    const user = await User.create({ username, email, password, displayName: displayName || username });
    sendTokens(user, res, 201);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });

    user.isOnline = true;
    await user.save({ validateBeforeSave: false });
    sendTokens(user, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Logout
router.post('/logout', protect, async (req, res) => {
  req.user.isOnline = false;
  req.user.lastSeen = new Date();
  await req.user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Đăng xuất thành công' });
});

// Get me
router.get('/me', protect, (req, res) => res.json({ success: true, user: req.user }));

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: 'Email không tồn tại' });

    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    user.passwordResetExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password.html?token=${token}`;
    const transporter = nodemailer.createTransport({ host: process.env.EMAIL_HOST, port: process.env.EMAIL_PORT, auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    await transporter.sendMail({
      from: `SocialShop <${process.env.EMAIL_USER}>`, to: user.email,
      subject: '🔐 Đặt lại mật khẩu SocialShop',
      html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;background:#0a0a0a;color:#fff;border-radius:16px">
        <h2 style="color:#6C63FF">SocialShop</h2>
        <p>Bạn yêu cầu đặt lại mật khẩu. Click nút bên dưới:</p>
        <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#6C63FF;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">Đặt lại mật khẩu</a>
        <p style="color:#888;font-size:13px">Link có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>`
    });
    res.json({ success: true, message: 'Email đặt lại mật khẩu đã được gửi' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Không thể gửi email' });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save();
    sendTokens(user, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const token = signToken(decoded.id);
    res.json({ success: true, token });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

module.exports = router;
