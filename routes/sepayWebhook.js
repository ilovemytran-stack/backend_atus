const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const PendingPayment = require('../models/PendingPayment');
const ProcessedSepayEvent = require('../models/ProcessedSepayEvent');

// Ghi nhận đã xử lý (bỏ qua nếu 2 request đụng nhau cùng lúc và đã có người ghi trước)
async function markProcessed(sepayId) {
  try {
    await ProcessedSepayEvent.create({ sepayTransactionId: sepayId });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
}

// SePay ký HMAC-SHA256 trên RAW bytes của body, nên route này được đăng ký
// trong server.js VỚI express.raw() và ĐỨNG TRƯỚC express.json() toàn cục —
// xem ghi chú trong server.js. Không đổi thứ tự đó.
//
// Hợp đồng phản hồi: SePay coi là thành công khi nhận HTTP 2xx + body có
// success:true, trong vòng 30 giây. Sai chữ ký → 401. Mọi trường hợp "không
// có gì để làm" (đã xử lý rồi, không tìm thấy mã, sai số tiền...) vẫn trả về
// 200 để SePay NGỪNG gửi lại — chỉ lỗi hệ thống thật (DB...) mới trả 500 để
// SePay còn thử lại theo lịch Fibonacci của họ.
module.exports = async function sepayWebhookHandler(req, res) {
  try {
    const rawBody = req.body; // Buffer, vì server.js dùng express.raw() cho route này
    const signature = req.headers['x-sepay-signature'];

    if (!process.env.SEPAY_SECRET) {
      console.error('❌ Thiếu SEPAY_SECRET trong .env');
      return res.status(500).json({ success: false });
    }
    if (!signature || !Buffer.isBuffer(rawBody)) {
      return res.status(401).json({ success: false, message: 'Thiếu chữ ký' });
    }

    const expected = crypto.createHmac('sha256', process.env.SEPAY_SECRET).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(String(signature));
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(401).json({ success: false, message: 'Chữ ký không hợp lệ' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(200).json({ success: true }); // body hỏng, không có gì để đọc — trả 200 để dừng retry
    }

    const sepayId = String(payload.id);

    // 1) Chặn trùng theo id giao dịch SePay (webhook có thể tới nhiều lần)
    const already = await ProcessedSepayEvent.findOne({ sepayTransactionId: sepayId });
    if (already) return res.status(200).json({ success: true });

    // 2) Chỉ xử lý tiền VÀO, bỏ qua tiền ra
    if (payload.transferType !== 'in') {
      await markProcessed(sepayId);
      return res.status(200).json({ success: true });
    }

    // 3) Lấy mã đơn: ưu tiên field "code" SePay tự nhận diện, fallback regex trên "content"
    const codeMatch = String(payload.content || '').match(/Pay(\d{6,8})/i);
    const code = payload.code || (codeMatch ? `Pay${codeMatch[1]}` : null);

    if (!code) {
      console.warn('⚠️ Webhook SePay không tìm thấy mã đơn:', payload.id, payload.content);
      await markProcessed(sepayId);
      return res.status(200).json({ success: true });
    }

    const pending = await PendingPayment.findOne({ code, status: 'pending' });
    if (!pending) {
      console.warn('⚠️ Webhook SePay không khớp đơn chờ nào đang pending:', code, payload.id);
      await markProcessed(sepayId);
      return res.status(200).json({ success: true });
    }

    if (Number(payload.transferAmount) !== pending.amount) {
      // Số tiền chuyển khoản không khớp số tiền yêu cầu — KHÔNG tự cộng ví để
      // tránh sai lệch, chỉ ghi log để admin đối chiếu thủ công.
      console.error('❌ Sai lệch số tiền webhook SePay:', {
        code, expected: pending.amount, received: payload.transferAmount, sepayId,
      });
      await markProcessed(sepayId);
      return res.status(200).json({ success: true });
    }

    // 4) Khớp đúng: cộng ví + đánh dấu đã thanh toán trong 1 transaction để đảm bảo toàn vẹn dữ liệu
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        pending.status = 'paid';
        pending.paidAt = new Date();
        pending.sepayTransactionId = sepayId;
        await pending.save({ session });

        await User.findByIdAndUpdate(
          pending.userId,
          { $inc: { walletBalance: pending.amount } },
          { session }
        );

        await ProcessedSepayEvent.create([{ sepayTransactionId: sepayId }], { session });
      });
    } finally {
      await session.endSession();
    }

    console.log(`✅ SePay: cộng ${pending.amount}đ vào ví user ${pending.userId} (mã ${code})`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Lỗi xử lý webhook SePay:', err);
    return res.status(500).json({ success: false }); // lỗi thật → để SePay thử lại
  }
};
