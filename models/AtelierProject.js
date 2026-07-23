const mongoose = require('mongoose');

// _id là String (không phải ObjectId mặc định của Mongoose) vì id được sinh ở
// CLIENT (uid() trong atelier.html) ngay khi tạo project mới, trước khi lưu
// lần đầu. Dùng chung id đó nên phía frontend save() chỉ cần gọi 1 upsert,
// không phải phân biệt "tạo mới" hay "cập nhật".
const atelierProjectSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['photo', 'video'], required: true },
  name: { type: String, default: '' },
  thumbnail: { type: String, default: null },
  coverOverride: { type: String, default: null },
  state: { type: mongoose.Schema.Types.Mixed, default: null }, // toàn bộ timeline/layers — xem serialize() trong atelier.html
}, { timestamps: true });

module.exports = mongoose.model('AtelierProject', atelierProjectSchema);
