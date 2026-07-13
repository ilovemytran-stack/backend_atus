const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Video = require('../models/Video');
const Character = require('../models/Character');
const GD = require('../data/gameData');
const { protect } = require('../middleware/auth');

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền thao tác này' });
  next();
};
const staffOnly = (req, res, next) => {
  if (!['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Chỉ admin/điều hành mới có quyền truy cập' });
  next();
};

router.use(protect, staffOnly);

// ===== STATS =====
router.get('/stats', async (req, res) => {
  try {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const [totalUsers, totalPosts, totalVideos, bannedUsers, newUsersToday, admins] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Video.countDocuments(),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ role: 'admin' }),
    ]);
    res.json({ success: true, stats: { totalUsers, totalPosts, totalVideos, bannedUsers, newUsersToday, admins } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== USERS =====
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = search
      ? { $or: [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { displayName: new RegExp(search, 'i') }] }
      : {};
    const [users, total] = await Promise.all([
      User.find(query).sort('-createdAt').skip((page - 1) * limit).limit(+limit).select('-password'),
      User.countDocuments(query),
    ]);
    res.json({ success: true, users, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === String(req.user._id)) return res.status(400).json({ success: false, message: 'Không thể tự xóa chính mình' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    if (req.user.role !== 'admin' && ['admin', 'moderator'].includes(target.role)) {
      return res.status(403).json({ success: false, message: 'Điều hành không thể xóa tài khoản admin hoặc điều hành khác' });
    }
    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Post.deleteMany({ author: req.params.id }),
      Video.deleteMany({ author: req.params.id }),
    ]);
    res.json({ success: true, message: 'Đã xóa người dùng cùng bài viết/video của họ' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id/role', adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'moderator', 'admin'].includes(role)) return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
    if (req.params.id === String(req.user._id) && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Không thể tự hạ quyền chính mình' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    res.json({ success: true, user, message: `Đã đổi quyền thành ${role}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Tăng/giảm Xu VIP cho user — CHỈ ADMIN, điều hành không có quyền này
router.put('/users/:id/coin', adminOnly, async (req, res) => {
  try {
    const { amount } = req.body; // số dương = cộng, số âm = trừ
    const delta = Number(amount);
    if (!delta || Number.isNaN(delta)) return res.status(400).json({ success: false, message: 'Số xu không hợp lệ' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    target.vipCoin = Math.max(0, (target.vipCoin || 0) + delta);
    await target.save();
    res.json({ success: true, vipCoin: target.vipCoin, message: `Đã ${delta > 0 ? 'cộng' : 'trừ'} ${Math.abs(delta)} Xu VIP cho ${target.username}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id/ban', async (req, res) => {
  try {
    if (req.params.id === String(req.user._id)) return res.status(400).json({ success: false, message: 'Không thể tự khóa chính mình' });
    const targetCheck = await User.findById(req.params.id);
    if (!targetCheck) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    if (req.user.role !== 'admin' && ['admin', 'moderator'].includes(targetCheck.role)) {
      return res.status(403).json({ success: false, message: 'Điều hành không thể khóa tài khoản admin hoặc điều hành khác' });
    }
    const { isBanned, banReason = '' } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: !!isBanned, banReason: isBanned ? banReason : '' },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    res.json({ success: true, user, message: isBanned ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== POSTS =====
router.get('/posts', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = search ? { content: new RegExp(search, 'i') } : {};
    const [posts, total] = await Promise.all([
      Post.find(query).sort('-createdAt').skip((page - 1) * limit).limit(+limit).populate('author', 'username displayName avatar'),
      Post.countDocuments(query),
    ]);
    res.json({ success: true, posts, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    await User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });
    res.json({ success: true, message: 'Đã xóa bài viết' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== VIDEOS =====
router.get('/videos', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const query = search ? { title: new RegExp(search, 'i') } : {};
    const [videos, total] = await Promise.all([
      Video.find(query).sort('-createdAt').skip((page - 1) * limit).limit(+limit).populate('author', 'username displayName avatar'),
      Video.countDocuments(query),
    ]);
    res.json({ success: true, videos, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
    await User.findByIdAndUpdate(video.author, { $inc: { videosCount: -1 } });
    res.json({ success: true, message: 'Đã xóa video' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== GM TOOLS (G.Legendary) — admin + điều hành đều dùng được để test =====
router.get('/game/characters', async (req, res) => {
  try {
    const q = (req.query.search || '').trim();
    const filter = q ? { name: new RegExp(q, 'i') } : {};
    const chars = await Character.find(filter).limit(20).populate('user', 'username displayName role');
    res.json({ success: true, characters: chars });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/game/characters/:id/set-level', async (req, res) => {
  try {
    const { level } = req.body;
    const lv = Math.max(1, Math.min(GD.MAX_LEVEL, Number(level)));
    const char = await Character.findById(req.params.id);
    if (!char) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân vật' });
    const oldLevel = char.level;
    char.level = lv; char.xp = 0;
    // cấp cao hơn -> cấp bù điểm thuộc tính/kỹ năng và mở khoá thách đấu thần cho các mốc đã đi qua (để test được đầy đủ)
    if (lv > oldLevel) {
      for (let l = oldLevel + 1; l <= lv; l++) {
        if (l % GD.POINTS_EVERY === 0) { char.unspentStatPoints += GD.STAT_POINTS_PER_TIER; char.unspentSkillPoints += GD.SKILL_POINTS_PER_TIER; }
        if (l % 10 === 0) {
          const tier = l / 10;
          if (!char.godDuels.some((d) => d.tier === tier)) {
            const cont = GD.CONTINENTS.find((c) => c.id === char.position.continentId) || GD.CONTINENTS[0];
            char.godDuels.push({ tier, continentId: cont.id, godName: cont.god.name, status: 'pending' });
          }
        }
      }
    }
    await char.save();
    res.json({ success: true, message: `Đã đặt cấp ${char.name} thành ${lv}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/game/characters/:id/currency', async (req, res) => {
  try {
    const { gold = 0, gem = 0 } = req.body;
    const char = await Character.findById(req.params.id);
    if (!char) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân vật' });
    char.gold = Math.max(0, char.gold + Number(gold || 0));
    char.gem = Math.max(0, char.gem + Number(gem || 0));
    await char.save();
    res.json({ success: true, message: `Đã cộng ${gold}🪙 ${gem}💎 cho ${char.name}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/game/characters/:id/damage-buff', async (req, res) => {
  try {
    const { multiplier } = req.body; // 1 = bình thường, vd 5 = x5 sát thương để test
    const char = await Character.findById(req.params.id);
    if (!char) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân vật' });
    char.gmDamageMultiplier = Math.max(0.1, Math.min(50, Number(multiplier) || 1));
    await char.save();
    res.json({ success: true, message: `Đã đặt buff sát thương x${char.gmDamageMultiplier} cho ${char.name}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/game/characters/:id/complete-quests', async (req, res) => {
  try {
    const char = await Character.findById(req.params.id);
    if (!char) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân vật' });
    char.questProgress = char.questProgress || {};
    Object.assign(char.questProgress, {
      totalKills: 9999, q_gear_up: 1, duelsWon: 9999, continentsVisited: GD.CONTINENTS.map((c) => c.id),
    });
    char.markModified('questProgress');
    await char.save();
    res.json({ success: true, message: `Đã đánh dấu hoàn thành nhiệm vụ hiện tại cho ${char.name} (vào game bấm Nhận thưởng)` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ===== THÔNG BÁO HỆ THỐNG (popup toàn server cho mọi người dùng) =====
const Announcement = require('../models/Announcement');

router.get('/announcements', async (req, res) => {
  try {
    const list = await Announcement.find().sort('-createdAt').limit(50).populate('createdBy', 'username displayName');
    res.json({ success: true, announcements: list });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/announcements', async (req, res) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ success: false, message: 'Nội dung thông báo không được để trống' });
    if (text.length > 1000) return res.status(400).json({ success: false, message: 'Nội dung tối đa 1000 ký tự' });
    // chỉ giữ 1 thông báo đang hoạt động tại 1 thời điểm — thông báo mới sẽ thay thế thông báo cũ
    await Announcement.updateMany({ active: true }, { active: false });
    const ann = await Announcement.create({ text, createdBy: req.user._id, active: true });
    res.json({ success: true, announcement: ann });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
