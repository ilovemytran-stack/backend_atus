const router = require('express').Router();
const Guild = require('../models/Guild');
const Character = require('../models/Character');
const { protect } = require('../middleware/auth');
const { guildXpToNextLevel } = require('../utils/guildLeveling');

async function myChar(req) {
  return Character.findOne({ user: req.user._id });
}

// Danh sách Bang Hội để duyệt/tham gia
router.get('/list', protect, async (req, res) => {
  try {
    const guilds = await Guild.find().populate('leader', 'name level').sort({ createdAt: -1 }).limit(100);
    res.json({
      success: true,
      guilds: guilds.map((g) => ({
        id: g._id, name: g.name, tag: g.tag, description: g.description,
        level: g.level, memberCount: g.members.length, maxMembers: g.maxMembers,
        leaderName: g.leader?.name || '???',
      })),
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Bang Hội của chính mình (kèm danh sách thành viên đầy đủ)
router.get('/mine', protect, async (req, res) => {
  try {
    const char = await myChar(req);
    if (!char?.guildId) return res.json({ success: true, guild: null });
    const guild = await Guild.findById(char.guildId).populate('members', 'name level classId').populate('leader', 'name level classId');
    if (!guild) { char.guildId = null; await char.save(); return res.json({ success: true, guild: null }); }
    res.json({
      success: true,
      guild: {
        id: guild._id, name: guild.name, tag: guild.tag, description: guild.description,
        level: guild.level, xp: guild.xp, xpToNext: guildXpToNextLevel(guild.level), maxMembers: guild.maxMembers,
        leaderId: String(guild.leader._id),
        members: guild.members.map((m) => ({ id: m._id, name: m.name, level: m.level, classId: m.classId })),
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/create', protect, async (req, res) => {
  try {
    const char = await myChar(req);
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    if (char.guildId) return res.status(400).json({ success: false, message: 'Bạn đã ở trong 1 Bang Hội rồi' });
    const name = (req.body.name || '').trim();
    const tag = (req.body.tag || '').trim().toUpperCase();
    if (name.length < 3 || name.length > 24) return res.status(400).json({ success: false, message: 'Tên Bang Hội phải 3-24 ký tự' });
    if (tag.length < 2 || tag.length > 4) return res.status(400).json({ success: false, message: 'Tag phải 2-4 ký tự' });
    if (char.gold < 500) return res.status(400).json({ success: false, message: 'Cần 500 vàng để lập Bang Hội' });
    const exists = await Guild.findOne({ name });
    if (exists) return res.status(400).json({ success: false, message: 'Tên Bang Hội đã tồn tại' });

    const guild = await Guild.create({ name, tag, description: (req.body.description || '').trim().slice(0, 200), leader: char._id, members: [char._id] });
    char.gold -= 500;
    char.guildId = guild._id;
    await char.save();
    res.json({ success: true, guildId: guild._id, character: { gold: char.gold } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/join', protect, async (req, res) => {
  try {
    const char = await myChar(req);
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    if (char.guildId) return res.status(400).json({ success: false, message: 'Bạn đã ở trong 1 Bang Hội rồi' });
    const guild = await Guild.findById(req.body.guildId);
    if (!guild) return res.status(404).json({ success: false, message: 'Không tìm thấy Bang Hội' });
    if (guild.members.length >= guild.maxMembers) return res.status(400).json({ success: false, message: 'Bang Hội đã đầy' });
    guild.members.push(char._id);
    await guild.save();
    char.guildId = guild._id;
    await char.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/leave', protect, async (req, res) => {
  try {
    const char = await myChar(req);
    if (!char?.guildId) return res.status(400).json({ success: false, message: 'Bạn chưa ở trong Bang Hội nào' });
    const guild = await Guild.findById(char.guildId);
    if (guild) {
      guild.members = guild.members.filter((m) => String(m) !== String(char._id));
      if (!guild.members.length) {
        await Guild.deleteOne({ _id: guild._id });
      } else {
        if (String(guild.leader) === String(char._id)) guild.leader = guild.members[0]; // chuyển bang chủ cho thành viên kế tiếp
        await guild.save();
      }
    }
    char.guildId = null;
    await char.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/kick', protect, async (req, res) => {
  try {
    const char = await myChar(req);
    if (!char?.guildId) return res.status(400).json({ success: false, message: 'Bạn chưa ở trong Bang Hội nào' });
    const guild = await Guild.findById(char.guildId);
    if (!guild || String(guild.leader) !== String(char._id)) return res.status(403).json({ success: false, message: 'Chỉ Bang Chủ mới có quyền này' });
    if (String(req.body.charId) === String(char._id)) return res.status(400).json({ success: false, message: 'Không thể tự đuổi chính mình, dùng Rời Bang' });
    const isMember = guild.members.some((m) => String(m) === String(req.body.charId));
    if (!isMember) return res.status(400).json({ success: false, message: 'Người này không ở trong Bang Hội của bạn' });
    guild.members = guild.members.filter((m) => String(m) !== String(req.body.charId));
    await guild.save();
    // Chỉ gỡ guildId nếu nó vẫn đang trỏ đúng về guild này — tránh race condition (mục tiêu vừa
    // rời/bị đuổi khỏi guild này và tham gia guild khác ngay trước khi request này chạy tới).
    await Character.updateOne({ _id: req.body.charId, guildId: guild._id }, { guildId: null });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Bang Chủ tự giải tán Bang Hội — trước đây không có cách nào làm sạch (phải kick hết từng người)
router.post('/disband', protect, async (req, res) => {
  try {
    const char = await myChar(req);
    if (!char?.guildId) return res.status(400).json({ success: false, message: 'Bạn chưa ở trong Bang Hội nào' });
    const guild = await Guild.findById(char.guildId);
    if (!guild || String(guild.leader) !== String(char._id)) return res.status(403).json({ success: false, message: 'Chỉ Bang Chủ mới có quyền này' });
    await Character.updateMany({ guildId: guild._id }, { guildId: null });
    await Guild.deleteOne({ _id: guild._id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
