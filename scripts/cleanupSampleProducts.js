// Chạy 1 LẦN để xoá hẳn 12 sản phẩm mẫu (sellerId=null) đã từng được nạp sẵn vào Root Shop trước khi
// có cập nhật này. KHÔNG đụng tới sản phẩm do người dùng thật đăng (luôn có sellerId).
// Cách chạy (từ thư mục backend/, cần đã cấu hình .env với MONGODB_URI):
//   node scripts/cleanupSampleProducts.js
require('dotenv').config();
const mongoose = require('mongoose');
const ShopProduct = require('../models/ShopProduct');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const res = await ShopProduct.deleteMany({ sellerId: null });
  console.log(`Đã xoá ${res.deletedCount} sản phẩm mẫu (sellerId=null).`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => { console.error('Lỗi:', err.message); process.exit(1); });
