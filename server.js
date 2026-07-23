const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] }
});
app.set('io', io);

// Middleware
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));

// Webhook SePay: PHẢI đăng ký trước express.json() và dùng express.raw(),
// vì SePay ký HMAC-SHA256 trên raw bytes của body — nếu đứng sau
// express.json(), body sẽ bị parse thành object trước và chữ ký luôn sai.
// Đường dẫn giữ đúng "/weebhook/sepay" (thừa 1 chữ "e") vì đó là URL đã
// đăng ký thật trên dashboard SePay — đổi lại là webhook sẽ 404.
app.post('/weebhook/sepay', express.raw({ type: '*/*' }), require('./routes/sepayWebhook'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/ai', rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: { success: false, message: 'Bạn hỏi AI quá nhanh, thử lại sau ít phút.' } }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/search', require('./routes/search'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/game', require('./routes/game'));
app.use('/api/guild', require('./routes/guild'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/shop/wallet', require('./routes/shopWallet'));
app.use('/api/shop/products', require('./routes/shopProducts'));
app.use('/api/shop/orders', require('./routes/shopOrders'));
app.use('/api/media', require('./routes/media'));
app.use('/api/atelier/projects', require('./routes/atelierProjects'));
app.use('/api/ai', require('./routes/ai'));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// Socket.io handlers
require('./utils/socket')(io);

// MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    // Nạp 12 sản phẩm mẫu ban đầu của Root Shop nếu collection còn trống —
    // chỉ chạy 1 lần, không đụng dữ liệu nếu đã có sản phẩm nào (kể cả do
    // người bán tự thêm).
    try {
      const ShopProduct = require('./models/ShopProduct');
      const count = await ShopProduct.countDocuments();
      if (count === 0) {
        await ShopProduct.insertMany(require('./data/shopSeedProducts'));
        console.log('✅ Đã nạp sản phẩm mẫu Root Shop');
      }
    } catch (seedErr) {
      console.error('❌ Lỗi nạp sản phẩm mẫu:', seedErr.message);
    }
  })
  .catch(err => console.error('❌ MongoDB error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = { io };
