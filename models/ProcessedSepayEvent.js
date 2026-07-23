const mongoose = require('mongoose');

// Chặn xử lý trùng: SePay có thể gửi lại cùng 1 giao dịch nhiều lần (retry tự
// động theo lịch Fibonacci, gửi lại thủ công, hoặc nhiều webhook cùng trỏ về
// endpoint này). Trước khi xử lý, luôn kiểm tra "id" giao dịch SePay
// (sepayTransactionId) đã có trong bảng này chưa.
const processedSepayEventSchema = new mongoose.Schema({
  sepayTransactionId: { type: String, required: true, unique: true, index: true },
  processedAt: { type: Date, default: Date.now },
}, { versionKey: false });

module.exports = mongoose.model('ProcessedSepayEvent', processedSepayEventSchema);
