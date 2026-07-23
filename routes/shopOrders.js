const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const ShopProduct = require('../models/ShopProduct');
const ShopOrder = require('../models/ShopOrder');
const { protect } = require('../middleware/auth');

const PLATFORM_COMMISSION_RATE = 0.2; // chiết khấu sàn 20%, khớp root-shop.html
const DIGITAL_HOLD_HOURS = 72; // giữ tiền 3 ngày trước khi tự động chuyển cho người bán

function genOrderCode(prefix) {
  return prefix + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function toClient(o) {
  return {
    id: o._id, code: o.code, productId: o.productId, productName: o.productName,
    qty: o.qty, price: o.price, total: o.total, isDigital: o.isDigital,
    deliveryInfo: o.deliveryInfo, status: o.status, disputeReason: o.disputeReason,
    sellerId: o.sellerId ? String(o.sellerId) : null,
    autoReleaseAt: o.autoReleaseAt, completedAt: o.completedAt, createdAt: o.createdAt,
  };
}

// Tự giải ngân các đơn hàng số đã hết hạn giữ tiền mà người mua không xác
// nhận và cũng không khiếu nại — chạy "lười" (mỗi lần có người gọi route
// /mine) thay vì cron riêng, vì Render có thể ngủ khi không có traffic nên
// setInterval phía server không đáng tin cậy bằng cách này.
async function releaseDueOrders() {
  const due = await ShopOrder.find({ status: 'delivered', autoReleaseAt: { $lte: new Date() } });
  for (const order of due) {
    await payoutToSeller(order);
  }
}

async function payoutToSeller(order) {
  if (order.sellerId) {
    const payout = Math.round(order.total * (1 - PLATFORM_COMMISSION_RATE));
    await User.findByIdAndUpdate(order.sellerId, { $inc: { walletBalance: payout } });
  }
  order.status = 'completed';
  order.completedAt = new Date();
  await order.save();
}

// Mua ngay bằng ví — atomic: trừ ví người mua, trừ/giao kho, cộng ví người
// bán (vật lý cộng ngay; hàng số giữ escrow DIGITAL_HOLD_HOURS giờ).
router.post('/buy-now', protect, async (req, res) => {
  const { productId, qty } = req.body;
  const quantity = Math.max(1, Number(qty) || 1);

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const buyer = await User.findById(req.user._id).session(session);
      const product = await ShopProduct.findById(productId).session(session);
      if (!product || product.deleted) throw Object.assign(new Error('Không tìm thấy sản phẩm'), { code: 'NOT_FOUND' });

      const total = product.price * quantity;
      if ((buyer.walletBalance || 0) < total) throw Object.assign(new Error('Số dư ví không đủ'), { code: 'INSUFFICIENT' });

      const isDigital = product.category === 'digital';
      let deliveryInfo = '';
      if (isDigital) {
        if (product.digitalStock.length < quantity) throw Object.assign(new Error('Hết hàng'), { code: 'OUT_OF_STOCK' });
        const claimed = product.digitalStock.splice(0, quantity);
        product.stock = product.digitalStock.length;
        if (product.stock === 0) product.status = 'out-of-stock';
        deliveryInfo = claimed.join('\n');
        await product.save({ session });
      } else {
        if (product.stock < quantity) throw Object.assign(new Error('Hết hàng'), { code: 'OUT_OF_STOCK' });
        product.stock -= quantity;
        if (product.stock === 0) product.status = 'out-of-stock';
        await product.save({ session });
      }

      buyer.walletBalance = (buyer.walletBalance || 0) - total;
      await buyer.save({ session });

      const code = genOrderCode(isDigital ? 'DG' : 'ORD');
      const orderDoc = {
        code, buyerId: buyer._id, sellerId: product.sellerId || null,
        productId: product._id, productName: product.name, qty: quantity, price: product.price, total,
        isDigital, deliveryInfo,
      };
      if (isDigital) {
        orderDoc.status = 'delivered';
        orderDoc.autoReleaseAt = new Date(Date.now() + DIGITAL_HOLD_HOURS * 3600 * 1000);
      } else {
        orderDoc.status = 'completed';
        orderDoc.completedAt = new Date();
        if (product.sellerId) {
          const payout = Math.round(total * (1 - PLATFORM_COMMISSION_RATE));
          await User.findByIdAndUpdate(product.sellerId, { $inc: { walletBalance: payout } }, { session });
        }
      }
      const [created] = await ShopOrder.create([orderDoc], { session });
      result = created;
    });
    res.json({ success: true, order: toClient(result) });
  } catch (err) {
    const map = { NOT_FOUND: 404, INSUFFICIENT: 400, OUT_OF_STOCK: 400 };
    res.status(map[err.code] || 500).json({ success: false, message: err.message });
  } finally {
    await session.endSession();
  }
});

// Đơn của tôi (đã mua) — dùng để hiện "cần xử lý" (đơn hàng số vừa giao cần xác nhận)
router.get('/mine', protect, async (req, res) => {
  try {
    await releaseDueOrders();
    const orders = await ShopOrder.find({ buyerId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders: orders.map(toClient) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Đơn đang khiếu nại cần admin xử lý
router.get('/disputed', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền' });
    const orders = await ShopOrder.find({ status: 'disputed' }).sort({ createdAt: -1 });
    res.json({ success: true, orders: orders.map(toClient) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Người mua xác nhận đã nhận hàng số đúng như mô tả — giải ngân ngay cho người bán
router.post('/:id/confirm', protect, async (req, res) => {
  try {
    const order = await ShopOrder.findOne({ _id: req.params.id, buyerId: req.user._id });
    if (!order || order.status !== 'delivered') return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hoặc đơn không ở trạng thái chờ xác nhận' });
    await payoutToSeller(order);
    res.json({ success: true, order: toClient(order) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Người mua khiếu nại (hàng không đúng mô tả, thông tin sai...) — tạm giữ tiền chờ admin xử lý
router.post('/:id/dispute', protect, async (req, res) => {
  try {
    const order = await ShopOrder.findOne({ _id: req.params.id, buyerId: req.user._id });
    if (!order || order.status !== 'delivered') return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hoặc đơn không ở trạng thái chờ xác nhận' });
    order.status = 'disputed';
    order.disputeReason = req.body.reason || 'Không có mô tả';
    await order.save();
    res.json({ success: true, order: toClient(order) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Admin phân xử khiếu nại: hoàn tiền người mua, hoặc giải ngân cho người bán
router.post('/:id/resolve', protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền' });
    const { outcome } = req.body; // 'refund_buyer' | 'release_seller'
    let result;
    await session.withTransaction(async () => {
      const order = await ShopOrder.findOne({ _id: req.params.id, status: 'disputed' }).session(session);
      if (!order) throw Object.assign(new Error('Không tìm thấy đơn đang khiếu nại'), { code: 'NOT_FOUND' });
      if (outcome === 'refund_buyer') {
        await User.findByIdAndUpdate(order.buyerId, { $inc: { walletBalance: order.total } }, { session });
        order.status = 'refunded';
        await order.save({ session });
      } else {
        if (order.sellerId) {
          const payout = Math.round(order.total * (1 - PLATFORM_COMMISSION_RATE));
          await User.findByIdAndUpdate(order.sellerId, { $inc: { walletBalance: payout } }, { session });
        }
        order.status = 'completed';
        order.completedAt = new Date();
        await order.save({ session });
      }
      result = order;
    });
    res.json({ success: true, order: toClient(result) });
  } catch (err) {
    res.status(err.code === 'NOT_FOUND' ? 404 : 500).json({ success: false, message: err.message });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
