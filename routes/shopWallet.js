const router = require('express').Router();
const PendingPayment = require('../models/PendingPayment');
const { protect } = require('../middleware/auth');

function generateCode() {
  const digits = Math.floor(100000 + Math.random() * 900000); // 6 chữ số
  return `Pay${digits}`;
}

async function generateUniqueCode() {
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    if (!(await PendingPayment.findOne({ code }))) return code;
  }
  throw new Error('Không tạo được mã thanh toán, thử lại');
}

// Cần BANK_BIN + BANK_ACCOUNT_NUMBER trong .env — dùng ảnh QR công khai của
// VietQR (không cần API key). BIN mẫu 970436 = Vietcombank, đổi theo ngân
// hàng thật của bạn: https://api.vietqr.io/v2/banks
function buildQrUrl({ amount, code }) {
  const bin = process.env.BANK_BIN;
  const acc = process.env.BANK_ACCOUNT_NUMBER;
  if (!bin || !acc) return null;
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: code,
    accountName: process.env.BANK_ACCOUNT_NAME || '',
  });
  return `https://img.vietqr.io/image/${bin}-${acc}-compact2.png?${params.toString()}`;
}

// Tạo yêu cầu nạp ví — trả về mã (vd: "Pay482913") để user chuyển khoản đúng
// nội dung này, kèm QR VietQR để quét nhanh. Ví chỉ được cộng khi webhook
// SePay báo có tiền vào khớp đúng mã (xem routes/sepayWebhook.js).
router.post('/topup', protect, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount < 10000) {
      return res.status(400).json({ success: false, message: 'Số tiền nạp tối thiểu 10.000đ' });
    }

    const code = await generateUniqueCode();
    const pending = await PendingPayment.create({
      code,
      type: 'topup',
      userId: req.user._id,
      amount,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 tiếng
    });

    res.json({
      success: true,
      id: pending._id,
      code,
      amount,
      qrUrl: buildQrUrl({ amount, code }),
      expiresAt: pending.expiresAt,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Frontend poll endpoint này để biết đơn đã được thanh toán chưa
router.get('/topup/:id', protect, async (req, res) => {
  try {
    const pending = await PendingPayment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!pending) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn nạp' });
    res.json({ success: true, status: pending.status, amount: pending.amount, code: pending.code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ success: true, balance: req.user.walletBalance || 0 });
});

module.exports = router;
