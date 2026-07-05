const router = require('express').Router();
const User = require('../models/User');
const Character = require('../models/Character');
const { protect } = require('../middleware/auth');

// Mệnh giá đổi Xu VIP -> Vàng/Ngọc trong game (ví dụ bạn đưa ra: 1 Xu VIP = 1000 vàng + 200 ngọc)
const PACKAGES = [
  { id: 'pkg_1', vipCoin: 1, gold: 1000, gem: 200, label: 'Gói Nhỏ' },
  { id: 'pkg_5', vipCoin: 5, gold: 5500, gem: 1100, label: 'Gói Vừa (+10%)' },
  { id: 'pkg_10', vipCoin: 10, gold: 11500, gem: 2300, label: 'Gói Lớn (+15%)' },
  { id: 'pkg_20', vipCoin: 20, gold: 24000, gem: 4800, label: 'Gói Đại Gia (+20%)' },
];

router.get('/me', protect, async (req, res) => {
  res.json({ success: true, vipCoin: req.user.vipCoin || 0 });
});

router.get('/packages', (req, res) => {
  res.json({ success: true, packages: PACKAGES });
});

// "Nạp tiền tự động" — CHƯA kết nối cổng thanh toán thật, luôn trả về bảo trì theo đúng yêu cầu
router.post('/topup-request', protect, async (req, res) => {
  res.json({ success: false, maintenance: true, message: 'Chức năng nạp Xu VIP tự động đang bảo trì, vui lòng liên hệ admin để được hỗ trợ nạp thủ công.' });
});

// Đổi Xu VIP -> Vàng/Ngọc trong game, giao qua hòm thư (không cộng thẳng, để user tự nhận + có lịch sử)
router.post('/exchange', protect, async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = PACKAGES.find((p) => p.id === packageId);
    if (!pkg) return res.status(400).json({ success: false, message: 'Gói không hợp lệ' });

    const user = await User.findById(req.user._id);
    if (user.vipCoin < pkg.vipCoin) return res.status(400).json({ success: false, message: 'Không đủ Xu VIP' });

    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(400).json({ success: false, message: 'Bạn cần tạo nhân vật trong G.Legendary trước khi đổi Xu' });

    user.vipCoin -= pkg.vipCoin;
    await user.save();

    char.mailbox.push({
      kind: 'topup',
      title: `Đổi Xu VIP thành công — ${pkg.label}`,
      message: `Bạn đã đổi ${pkg.vipCoin} Xu VIP lấy ${pkg.gold} Vàng và ${pkg.gem} Ngọc. Vào Hành Trang trong game để nhận.`,
      gold: pkg.gold, gem: pkg.gem,
    });
    await char.save();

    res.json({ success: true, vipCoin: user.vipCoin, message: 'Đã gửi phần thưởng vào hòm thư trong game!' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
