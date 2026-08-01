const router = require('express').Router();
const mongoose = require('mongoose');
const ShopProduct = require('../models/ShopProduct');
const { protect, optionalAuth } = require('../middleware/auth');

function toClient(p) {
  return {
    id: p._id, code: p.code, name: p.name, category: p.category, iconKey: p.iconKey,
    price: p.price, originalPrice: p.originalPrice, rating: p.rating, reviews: p.reviews,
    likes: p.likes, dislikes: p.dislikes, tag: p.tag, stock: p.stock, status: p.status,
    desc: p.desc, specs: p.specs, images: p.images,
    sellerId: p.sellerId ? String(p.sellerId) : null,
    approvalStatus: p.approvalStatus || 'approved', rejectionReason: p.rejectionReason || '',
    digitalStockCount: (p.digitalStock || []).length, // KHÔNG gửi nội dung digitalStock ra ngoài — đó là hàng chưa bán, chỉ giao khi mua thật
  };
}

function isOwnerOrAdmin(req, product) {
  if (req.user.role === 'admin') return true;
  return product.sellerId && String(product.sellerId) === String(req.user._id);
}

// Danh sách công khai — khách/người dùng thường chỉ thấy sản phẩm đã được admin duyệt ('approved').
// Nếu đã đăng nhập, vẫn thấy thêm CHÍNH sản phẩm của mình dù đang 'pending'/'rejected' (để tự theo dõi
// trạng thái duyệt trong trang quản lý người bán) — admin thấy tất cả, kể cả sản phẩm mẫu cũ nếu còn.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = { deleted: false };
    if (!req.user || req.user.role !== 'admin') {
      filter.$or = [{ approvalStatus: 'approved' }, ...(req.user ? [{ sellerId: req.user._id }] : [])];
    }
    const products = await ShopProduct.find(filter);
    res.json({ success: true, products: products.map(toClient) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Người bán thêm sản phẩm mới — vào hàng chờ duyệt ('pending'), admin duyệt xong mới hiện công khai
router.post('/', protect, async (req, res) => {
  try {
    const { name, category, iconKey, price, originalPrice, desc, specs, images, stock, status } = req.body;
    if (!name || !category || !price) {
      return res.status(400).json({ success: false, message: 'Thiếu tên/danh mục/giá' });
    }
    const id = 'usr_' + new mongoose.Types.ObjectId().toString();
    const product = await ShopProduct.create({
      _id: id,
      code: 'U-' + id.slice(-6).toUpperCase(),
      name, category, iconKey: iconKey || 'Package', price,
      originalPrice: originalPrice || null,
      desc: desc || '', specs: Array.isArray(specs) ? specs : [], images: Array.isArray(images) ? images : [],
      stock: category === 'digital' ? 0 : (stock || 0),
      status: category === 'digital' ? 'out-of-stock' : (status || 'in-stock'),
      sellerId: req.user._id,
      approvalStatus: req.user.role === 'admin' ? 'approved' : 'pending',
    });
    res.json({ success: true, product: toClient(product), message: req.user.role === 'admin' ? undefined : 'Sản phẩm đã gửi cho admin duyệt, sẽ hiển thị công khai sau khi được chấp thuận.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Cập nhật (trạng thái, tồn kho vật lý, ảnh, hoặc xoá mềm) — chỉ chủ sản phẩm hoặc admin
router.patch('/:id', protect, async (req, res) => {
  try {
    const product = await ShopProduct.findById(req.params.id);
    if (!product || product.deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    if (!isOwnerOrAdmin(req, product)) return res.status(403).json({ success: false, message: 'Không có quyền' });

    const { status, stock, images, deleted } = req.body;
    if (status !== undefined) product.status = status;
    if (stock !== undefined && product.category !== 'digital') product.stock = Math.max(0, stock);
    if (images !== undefined) product.images = images;
    if (deleted !== undefined) product.deleted = !!deleted;
    await product.save();
    res.json({ success: true, product: toClient(product) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Thêm thông tin đăng nhập/giao hàng vào kho hàng số — chỉ chủ sản phẩm hoặc admin.
// KHÔNG trả nội dung digitalStock trong response — chỉ trả số lượng mới.
router.post('/:id/restock', protect, async (req, res) => {
  try {
    const product = await ShopProduct.findById(req.params.id);
    if (!product || product.deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    if (product.category !== 'digital') return res.status(400).json({ success: false, message: 'Sản phẩm này không phải hàng số' });
    if (!isOwnerOrAdmin(req, product)) return res.status(403).json({ success: false, message: 'Không có quyền' });

    const lines = Array.isArray(req.body.lines) ? req.body.lines.filter(Boolean) : [];
    if (!lines.length) return res.status(400).json({ success: false, message: 'Chưa nhập dòng nào' });

    product.digitalStock.push(...lines);
    product.stock = product.digitalStock.length;
    product.status = product.stock > 0 ? 'in-stock' : product.status;
    await product.save();
    res.json({ success: true, stock: product.stock });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
