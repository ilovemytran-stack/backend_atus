const mongoose = require('mongoose');

// Mỗi lần mua bằng ví (purchaseWithBalance / buy-now) tạo 1 bản ghi ở đây.
// Hàng vật lý: cộng tiền người bán NGAY (status='completed').
// Hàng số (category='digital'): giữ tiền (escrow) tới khi người mua xác nhận,
// hết hạn giữ (autoReleaseAt) tự giải ngân, hoặc có khiếu nại admin xử lý —
// giống cơ chế taphoammo/GC MMO mà root-shop.html mô tả.
const shopOrderSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  productId: { type: String, required: true },
  productName: { type: String, default: '' },
  qty: { type: Number, default: 1 },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  isDigital: { type: Boolean, default: false },
  deliveryInfo: { type: String, default: '' },
  status: { type: String, enum: ['completed', 'delivered', 'disputed', 'refunded'], default: 'completed', index: true },
  disputeReason: { type: String, default: null },
  autoReleaseAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('ShopOrder', shopOrderSchema);
