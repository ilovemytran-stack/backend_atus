const mongoose = require('mongoose');

// Mỗi bản ghi là 1 "đơn chờ thanh toán" qua SePay — tạo ra khi user bấm nạp
// ví hoặc thanh toán đơn hàng, và được đối chiếu khi webhook SePay báo có
// tiền vào với đúng "code" trong nội dung chuyển khoản.
const pendingPaymentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true }, // vd: "Pay482913"
  type: { type: String, enum: ['topup', 'order'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 1000 }, // VNĐ
  status: { type: String, enum: ['pending', 'paid', 'expired'], default: 'pending', index: true },
  refId: { type: mongoose.Schema.Types.ObjectId, default: null }, // vd: Order._id khi type='order'
  paidAt: { type: Date, default: null },
  sepayTransactionId: { type: String, default: null }, // id giao dịch SePay đã khớp, để tra cứu sau này
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema);
