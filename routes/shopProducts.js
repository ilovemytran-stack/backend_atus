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
    digitalStockCount: (p.digitalStock || []).length, // KHÔNG gửi nội dung digitalStock ra ngoài — đó là hàng chưa bán, chỉ giao khi mua thật
    moderationStatus: p.moderation?.status || 'approved', // để chủ sản phẩm biết đang chờ duyệt/bị từ chối
    moderationReason: p.moderation?.reason || '',
  };
}

function isOwnerOrAdmin(req, product) {
  if (req.user.role === 'admin') return true;
  return product.sellerId && String(product.sellerId) === String(req.user._id);
}

const User = require('../models/User');
const Notification = require('../models/Notification');

// Đăng ký làm người bán — GỬI THẬT lên server (trước đây chỉ set state React ở client, admin không
// thấy được gì). Vào trạng thái "pending", CHƯA đăng được sản phẩm nào cho tới khi admin duyệt.
router.post('/seller/register', protect, async (req, res) => {
  try {
    const { idCardNumber, phone } = req.body;
    if (!idCardNumber || !phone) return res.status(400).json({ success: false, message: 'Thiếu CMND/CCCD hoặc số điện thoại' });
    const user = await User.findById(req.user._id);
    if (user.seller?.status === 'approved') return res.status(400).json({ success: false, message: 'Bạn đã là người bán được duyệt rồi' });
    if (user.seller?.status === 'pending') return res.status(400).json({ success: false, message: 'Đơn đăng ký của bạn đang chờ duyệt' });
    user.seller = { idCardNumber, phone, status: 'pending', registeredAt: new Date(), rejectReason: '', reviewedBy: null, reviewedAt: null };
    await user.save();
    res.json({ success: true, seller: user.seller, message: 'Đã gửi đăng ký người bán, chờ admin duyệt.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/seller/status', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, seller: user.seller || { status: 'none' } });
});

// Danh sách công khai — CHỈ sản phẩm đã duyệt (moderation.status='approved'), CỘNG THÊM sản phẩm
// pending/rejected của CHÍNH người đang xem (nếu đã đăng nhập) để họ tự theo dõi được đơn của mình.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const or = [{ 'moderation.status': 'approved' }];
    if (req.user) or.push({ sellerId: req.user._id });
    const products = await ShopProduct.find({ deleted: false, $or: or });
    res.json({ success: true, products: products.map(toClient) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Người bán thêm sản phẩm mới — PHẢI là người bán đã được admin duyệt (seller.status==='approved'),
// admin thì luôn được phép (đăng sản phẩm chính chủ sàn). Sản phẩm vào trạng thái "pending", CHƯA hiện
// công khai cho tới khi admin duyệt riêng TỪNG sản phẩm (2 lớp duyệt: duyệt người bán + duyệt từng món).
router.post('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && req.user.seller?.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: req.user.seller?.status === 'pending' ? 'Đơn đăng ký người bán đang chờ duyệt' : 'Bạn cần đăng ký làm người bán và được admin duyệt trước khi đăng sản phẩm',
      });
    }
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
      moderation: isAdmin ? { status: 'approved', reviewedBy: req.user._id, reviewedAt: new Date() } : { status: 'pending' },
    });
    res.json({
      success: true, product: toClient(product),
      message: isAdmin ? undefined : 'Sản phẩm đã được gửi, chờ admin duyệt trước khi hiển thị công khai.',
    });
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
