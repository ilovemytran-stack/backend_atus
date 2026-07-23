const mongoose = require('mongoose');

// _id là String để giữ nguyên id các sản phẩm mẫu ('tech1', 'dg1'...) từng
// nằm cứng trong root-shop.html — sản phẩm mới do người bán thêm cũng dùng
// id dạng string (sinh ở route, xem routes/shopProducts.js).
// "iconKey" là tên icon lucide-react (vd 'Headphones') — không lưu được
// React component vào DB nên frontend tự map tên -> component khi hiển thị.
const shopProductSchema = new mongoose.Schema({
  _id: { type: String },
  code: { type: String, default: '' },
  name: { type: String, required: true },
  category: { type: String, required: true, index: true },
  iconKey: { type: String, default: 'Package' },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, default: null },
  rating: { type: Number, default: 5 },
  reviews: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  tag: { type: String, default: null },
  stock: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['in-stock', 'out-of-stock', 'deposit'], default: 'in-stock' },
  desc: { type: String, default: '' },
  specs: { type: [String], default: [] },
  images: { type: [String], default: [] },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true }, // null = sản phẩm mẫu của sàn
  digitalStock: { type: [String], default: [] }, // chỉ dùng khi category='digital'; mỗi phần tử = 1 thông tin đăng nhập/giao hàng CHƯA bán
  deleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

module.exports = mongoose.model('ShopProduct', shopProductSchema);
