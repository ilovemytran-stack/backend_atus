const router = require('express').Router();
const Character = require('../models/Character');
const { protect } = require('../middleware/auth');
const GD = require('../data/gameData');

// ---- Nhiệm vụ đơn giản (point 2 & 11 — NPC giao nhiệm vụ) ----
const QUESTS = [
  { id: 'q_first_blood', name: 'Diệt 5 quái đầu tiên', type: 'kill', target: 5, reward: { xp: 30, gold: 50 } },
  { id: 'q_gear_up', name: 'Mua 1 vũ khí từ thợ rèn', type: 'buy_weapon', target: 1, reward: { xp: 40, gem: 5 } },
  { id: 'q_explorer', name: 'Đạt cấp độ 10', type: 'reach_level', target: 10, reward: { xp: 0, gold: 150, gem: 10 } },
];

function xpToNextLevel(level) { return Math.round(40 * Math.pow(level, 1.55)); }

// Toàn bộ chiêu nhân vật CÓ THỂ dùng: 2 chiêu gốc của class + các chiêu học thêm (phước lành thần linh)
function getAllSkillsFor(char) {
  const cls = GD.CLASSES[char.classId];
  const blessingSkills = (char.knownSkills || []).map((id) => {
    const contId = id.replace('blessing_', '');
    const cont = GD.CONTINENTS.find((c) => c.id === contId);
    return cont ? GD.blessingSkillFor(cont, 1) : null;
  }).filter(Boolean);
  return [...cls.skills, ...blessingSkills];
}

function findGear(itemId, kind) {
  if (!itemId) return null;
  if (itemId.startsWith('starter_')) return kind === 'weapon' ? GD.STARTER_GEAR.weapons[itemId] : GD.STARTER_GEAR.armor[itemId];
  if (itemId.startsWith('special_')) return GD.SPECIAL_ITEMS[itemId];
  return kind === 'weapon' ? GD.WEAPONS[itemId] : GD.ARMOR[itemId];
}

function computeStats(char) {
  const cls = GD.CLASSES[char.classId];
  const lv = char.level;
  const a = char.attributes || { str: 0, vit: 0, agi: 0, int: 0 };
  let hp = cls.base.hp + cls.growth.hp * (lv - 1) + a.vit * 5;
  let ki = cls.base.ki + cls.growth.ki * (lv - 1) + a.int * 2;
  let atk = cls.base.atk + cls.growth.atk * (lv - 1) + a.str * 1;
  let def = cls.base.def + cls.growth.def * (lv - 1) + a.vit * 0.2;
  let spd = cls.base.spd + cls.growth.spd * (lv - 1) + a.agi * 0.3;
  let crit = cls.base.crit + cls.growth.crit * (lv - 1) + a.agi * 0.15;
  let mag = a.int * 1.2;

  // cộng trang bị
  Object.entries(char.equipment || {}).forEach(([slot, itemId]) => {
    if (!itemId) return;
    const item = findGear(itemId, slot === 'weapon' ? 'weapon' : 'armor');
    if (!item) return;
    atk += item.atk || 0; def += item.def || 0; hp += item.hp || 0;
    spd += item.spd || 0; crit += item.crit || 0;
  });

  // set đặc biệt (point 9)
  const equippedIds = Object.values(char.equipment || {}).filter(Boolean);
  const specialCount = equippedIds.filter((id) => id && id.startsWith('special_')).length;
  const hasFullSet = specialCount >= 4;
  if (hasFullSet) { atk += GD.SPECIAL_SET.setBonus.atk; def += GD.SPECIAL_SET.setBonus.def; hp += GD.SPECIAL_SET.setBonus.hp; }

  // phước lành từ thần linh (thắng thách đấu mỗi 10 cấp) — mỗi phước +chỉ số nhỏ, vĩnh viễn
  const blessingCount = (char.godBlessings || []).length;
  hp += blessingCount * 25; atk += blessingCount * 3; def += blessingCount * 2;

  return {
    hp: Math.round(hp), ki: Math.round(ki), atk: Math.round(atk), def: Math.round(def),
    spd: +spd.toFixed(2), crit: +crit.toFixed(1), mag: +mag.toFixed(1),
    hasFullSpecialSet: hasFullSet, executeChance: hasFullSet ? GD.SPECIAL_SET.setBonus.executeChance : 0,
  };
}

function publicChar(char) {
  const obj = char.toObject();
  obj.skillLevels = Object.fromEntries(char.skillLevels || []);
  obj.stats = computeStats(char);
  obj.xpToNext = xpToNextLevel(char.level);
  obj.allSkills = getAllSkillsFor(char);
  obj.effectiveEquippedSkills = (char.equippedSkills && char.equippedSkills.length === 2)
    ? char.equippedSkills
    : GD.CLASSES[char.classId].skills.filter((s) => s.type === 'active').map((s) => s.id);
  obj.quests = QUESTS.map((q) => ({ ...q, progress: char.questProgress?.[q.id] || 0, claimed: !!char.questProgress?.[q.id + '_claimed'] }));
  return obj;
}

// ---- Dữ liệu tĩnh cho client tải 1 lần lúc vào game ----
router.get('/data', (req, res) => {
  res.json({
    success: true,
    classes: GD.CLASSES, attributes: GD.ATTRIBUTES,
    maxLevel: GD.MAX_LEVEL, pointsEvery: GD.POINTS_EVERY,
    statPointsPerTier: GD.STAT_POINTS_PER_TIER, skillPointsPerTier: GD.SKILL_POINTS_PER_TIER,
    continents: GD.CONTINENTS, maps: GD.MAPS, monsters: GD.MONSTERS,
    rarity: GD.RARITY, rarityLabel: GD.RARITY_LABEL, rarityColor: GD.RARITY_COLOR,
    weapons: GD.WEAPONS, armorSlots: GD.ARMOR_SLOTS, armor: GD.ARMOR,
    consumables: GD.CONSUMABLES, specialSet: GD.SPECIAL_SET, quests: QUESTS,
    minions: GD.MINIONS, bosses: GD.BOSSES,
    starterGear: GD.STARTER_GEAR, weaponReqLevel: GD.WEAPON_REQ_LEVEL, armorReqLevel: GD.ARMOR_REQ_LEVEL,
    zoneMax: GD.ZONE_MAX_PER_MAP, zoneCap: GD.ZONE_PLAYER_CAP, specialItems: GD.SPECIAL_ITEMS,
    worldEvents: {
      godSpawnMs: GD.GOD_SPAWN_INTERVAL_MS, godLifespanMs: GD.GOD_LIFESPAN_MS,
      bossSpawnMs: GD.MEGA_BOSS_SPAWN_INTERVAL_MS, bossIdleDespawnMs: GD.MEGA_BOSS_IDLE_DESPAWN_MS,
    },
  });
});

// ---- Nhân vật của tôi ----
router.get('/character', protect, async (req, res) => {
  try {
    const char = await Character.findOne({ user: req.user._id });
    if (char) { char.lastSeenAt = new Date(); await char.save(); }
    res.json({ success: true, character: char ? publicChar(char) : null });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point 1: tạo nhân vật, đặt tên hoặc đồng bộ username web
router.post('/character', protect, async (req, res) => {
  try {
    const existing = await Character.findOne({ user: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: 'Bạn đã có nhân vật rồi' });
    const { classId, name } = req.body;
    if (!GD.CLASSES[classId]) return res.status(400).json({ success: false, message: 'Class không hợp lệ' });
    const charName = (name && name.trim()) ? name.trim().slice(0, 20) : req.user.displayName || req.user.username;
    const char = await Character.create({
      user: req.user._id, classId, name: charName,
      inventory: [{ itemId: `starter_${GD.CLASSES[classId].weaponType}`, kind: 'weapon', qty: 1 }],
      equipment: { weapon: `starter_${GD.CLASSES[classId].weaponType}` },
    });
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point 6/7: cộng điểm thuộc tính
router.post('/character/allocate-stats', protect, async (req, res) => {
  try {
    const { str = 0, vit = 0, agi = 0, int = 0 } = req.body;
    const total = str + vit + agi + int;
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    if (total <= 0 || total > char.unspentStatPoints) return res.status(400).json({ success: false, message: 'Không đủ điểm thuộc tính' });
    char.attributes.str += str; char.attributes.vit += vit; char.attributes.agi += agi; char.attributes.int += int;
    char.unspentStatPoints -= total;
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point 7: nâng cấp 1 chiêu thức (2 điểm/cấp chiêu)
router.post('/character/allocate-skill', protect, async (req, res) => {
  try {
    const { skillId } = req.body;
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const cls = GD.CLASSES[char.classId];
    const skill = cls.skills.find((s) => s.id === skillId && s.type === 'active');
    if (!skill) return res.status(400).json({ success: false, message: 'Chiêu thức không hợp lệ' });
    const curLv = char.skillLevels.get(skillId) || 0;
    if (curLv >= skill.maxLv) return res.status(400).json({ success: false, message: 'Chiêu đã đạt cấp tối đa' });
    if (char.unspentSkillPoints < 2) return res.status(400).json({ success: false, message: 'Không đủ điểm kỹ năng' });
    char.skillLevels.set(skillId, curLv + 1);
    char.unspentSkillPoints -= 2;
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point 7: đặt lại điểm chiêu thức (hoàn điểm, miễn phí ở bản demo)
router.post('/character/reset-skills', protect, async (req, res) => {
  try {
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    let refunded = 0;
    for (const [, lv] of char.skillLevels) refunded += lv * 2;
    char.skillLevels = new Map();
    char.unspentSkillPoints += refunded;
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point 4: nhận thưởng sau khi hạ quái (server tính lại sát thương/rơi đồ để tránh gian lận số liệu thô)
router.post('/character/kill-monster', protect, async (req, res) => {
  try {
    const { mapId } = req.body;
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const map = GD.MAPS.find((m) => m.id === mapId);
    if (!map || !map.monsterIds.length) return res.status(400).json({ success: false, message: 'Map không hợp lệ' });
    const monsterId = map.monsterIds[Math.floor(Math.random() * map.monsterIds.length)];
    const monsterDef = GD.MONSTERS[monsterId];
    const mapLevel = map.levelRange[1];
    const drop = GD.scaleMonster(monsterDef, mapLevel, false, map.isMixedTier);

    char.xp += drop.xp;
    const gold = drop.goldMin + Math.floor(Math.random() * (drop.goldMax - drop.goldMin + 1));
    char.gold += gold;
    let gemWon = 0;
    if (Math.random() < drop.gemChance) { gemWon = 1; char.gem += 1; }

    const leveledUp = [];
    while (char.level < GD.MAX_LEVEL && char.xp >= xpToNextLevel(char.level)) {
      char.xp -= xpToNextLevel(char.level);
      char.level += 1;
      leveledUp.push(char.level);
      if (char.level % GD.POINTS_EVERY === 0) {
        char.unspentStatPoints += GD.STAT_POINTS_PER_TIER;
        char.unspentSkillPoints += GD.SKILL_POINTS_PER_TIER;
      }
      if (char.level % 10 === 0) {
        const tier = char.level / 10;
        const already = char.godDuels.some((d) => d.tier === tier);
        if (!already) {
          const cont = GD.CONTINENTS.find((c) => c.id === char.position.continentId) || GD.CONTINENTS[0];
          char.godDuels.push({ tier, continentId: cont.id, godName: cont.god.name, status: 'pending' });
        }
      }
    }

    // tiến độ nhiệm vụ diệt quái
    const kills = (char.questProgress.q_first_blood || 0) + 1;
    char.questProgress = { ...char.questProgress, q_first_blood: kills };
    char.markModified('questProgress');

    await char.save();
    res.json({ success: true, character: publicChar(char), loot: { monster: monsterDef.nameVN, xp: drop.xp, gold, gem: gemWon }, leveledUp });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point 9/11: mua đồ từ NPC (vũ khí / trang bị / vật phẩm hồi phục)
router.post('/character/buy', protect, async (req, res) => {
  try {
    const { itemId, kind } = req.body; // kind: weapon | armor | consumable
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const table = kind === 'weapon' ? GD.WEAPONS : kind === 'armor' ? GD.ARMOR : GD.CONSUMABLES;
    const item = table[itemId];
    if (!item) return res.status(400).json({ success: false, message: 'Vật phẩm không tồn tại' });
    if (item.dropOnly) return res.status(400).json({ success: false, message: 'Vật phẩm này chỉ rơi ra từ Boss Thế Giới, không thể mua' });
    const currency = item.currency || 'gold';
    if (char[currency] < item.price) return res.status(400).json({ success: false, message: `Không đủ ${currency === 'gold' ? 'vàng' : 'kim cương'}` });
    char[currency] -= item.price;
    const existing = char.inventory.find((i) => i.itemId === itemId && i.kind === kind);
    if (existing && kind === 'consumable') existing.qty += 1;
    else char.inventory.push({ itemId, kind, qty: 1 });
    if (kind === 'weapon') { char.questProgress = { ...char.questProgress, q_gear_up: 1 }; char.markModified('questProgress'); }
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point 8: trang bị / tháo vật phẩm
router.post('/character/equip', protect, async (req, res) => {
  try {
    const { itemId, kind, slot } = req.body; // slot chỉ cần khi kind=armor
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const owns = char.inventory.some((i) => i.itemId === itemId && i.kind === kind);
    if (!owns) return res.status(400).json({ success: false, message: 'Bạn không sở hữu vật phẩm này' });
    const item = findGear(itemId, kind);
    if (!item) return res.status(400).json({ success: false, message: 'Vật phẩm không hợp lệ' });
    if (char.level < (item.reqLevel || 0)) {
      return res.status(400).json({ success: false, message: `Cần đạt cấp ${item.reqLevel} để trang bị món này` });
    }
    if (kind === 'weapon') char.equipment.weapon = itemId;
    else if (kind === 'armor') char.equipment[slot] = itemId;
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/character/use-item', protect, async (req, res) => {
  try {
    const { itemId } = req.body;
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const inv = char.inventory.find((i) => i.itemId === itemId && i.kind === 'consumable');
    if (!inv || inv.qty < 1) return res.status(400).json({ success: false, message: 'Không có vật phẩm' });
    inv.qty -= 1;
    if (inv.qty <= 0) char.inventory = char.inventory.filter((i) => i !== inv);
    await char.save();
    res.json({ success: true, character: publicChar(char), effect: GD.CONSUMABLES[itemId]?.effect });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point 5/11: di chuyển lục địa / map (NPC dẫn đường hoặc đi bộ giữa các map trong lục địa)
router.post('/character/move', protect, async (req, res) => {
  try {
    const { mapId, x, y } = req.body;
    const map = GD.MAPS.find((m) => m.id === mapId);
    if (!map) return res.status(400).json({ success: false, message: 'Map không hợp lệ' });
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    char.position = { continentId: map.continentId, mapId: map.id, x: x ?? 400, y: y ?? 300 };
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point 11: nhận thưởng nhiệm vụ
router.post('/character/quests/claim', protect, async (req, res) => {
  try {
    const { questId } = req.body;
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest) return res.status(400).json({ success: false, message: 'Nhiệm vụ không tồn tại' });
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    if (char.questProgress?.[questId + '_claimed']) return res.status(400).json({ success: false, message: 'Đã nhận thưởng' });
    const progressVal = quest.type === 'reach_level' ? char.level : (char.questProgress?.[questId] || 0);
    const done = quest.type === 'reach_level' ? progressVal >= quest.target : progressVal >= quest.target;
    if (!done) return res.status(400).json({ success: false, message: 'Chưa hoàn thành nhiệm vụ' });
    char.xp += quest.reward.xp || 0; char.gold += quest.reward.gold || 0; char.gem += quest.reward.gem || 0;
    char.questProgress = { ...char.questProgress, [questId + '_claimed']: true };
    char.markModified('questProgress');
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Bảng xếp hạng cấp độ (nhẹ, phục vụ cảm giác nhiều người chơi)
router.get('/leaderboard', async (req, res) => {
  try {
    const top = await Character.find().sort('-level -xp').limit(20).populate('user', 'username displayName avatar');
    res.json({ success: true, top: top.map((c) => ({ name: c.name, classId: c.classId, level: c.level, user: c.user })) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Nhận 1 mục trong hòm thư (point: nạp Xu VIP đổi vàng/ngọc gửi qua đây)
router.post('/character/mailbox/claim', protect, async (req, res) => {
  try {
    const { mailId } = req.body;
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const mail = char.mailbox.id(mailId);
    if (!mail) return res.status(404).json({ success: false, message: 'Không tìm thấy thư' });
    if (mail.claimed) return res.status(400).json({ success: false, message: 'Đã nhận rồi' });
    char.gold += mail.gold || 0;
    char.gem += mail.gem || 0;
    mail.claimed = true;
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ---------- Bạn bè ----------
function friendCardOf(c) {
  if (!c) return null;
  return { id: c._id, userId: c.user, name: c.name, classId: c.classId, level: c.level, online: (Date.now() - new Date(c.lastSeenAt).getTime()) < 2 * 60 * 1000 };
}

router.get('/friends', protect, async (req, res) => {
  try {
    const char = await Character.findOne({ user: req.user._id }).populate('friends.character', 'name classId level lastSeenAt user').populate('friendRequests.from', 'name classId level');
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    res.json({
      success: true,
      friends: char.friends.map((f) => friendCardOf(f.character)).filter(Boolean),
      requests: char.friendRequests.map((r) => ({ id: r.from?._id, name: r.from?.name, classId: r.from?.classId, level: r.from?.level })).filter((r) => r.id),
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/friends/search', protect, async (req, res) => {
  try {
    const q = (req.query.name || '').trim();
    if (q.length < 2) return res.json({ success: true, results: [] });
    const me = await Character.findOne({ user: req.user._id });
    const results = await Character.find({ name: new RegExp(q, 'i'), _id: { $ne: me?._id } }).limit(10).select('name classId level');
    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/friends/request', protect, async (req, res) => {
  try {
    const { targetId } = req.body;
    const me = await Character.findOne({ user: req.user._id });
    if (!me) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    if (String(me._id) === String(targetId)) return res.status(400).json({ success: false, message: 'Không thể tự kết bạn với chính mình' });
    const target = await Character.findById(targetId);
    if (!target) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân vật' });
    if (me.friends.some((f) => String(f.character) === String(targetId))) return res.status(400).json({ success: false, message: 'Đã là bạn bè' });
    if (target.friendRequests.some((r) => String(r.from) === String(me._id))) return res.status(400).json({ success: false, message: 'Đã gửi lời mời trước đó' });
    target.friendRequests.push({ from: me._id });
    await target.save();
    res.json({ success: true, message: `Đã gửi lời mời kết bạn tới ${target.name}` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/friends/accept', protect, async (req, res) => {
  try {
    const { fromId } = req.body;
    const me = await Character.findOne({ user: req.user._id });
    if (!me) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const reqIdx = me.friendRequests.findIndex((r) => String(r.from) === String(fromId));
    if (reqIdx === -1) return res.status(400).json({ success: false, message: 'Không có lời mời này' });
    me.friendRequests.splice(reqIdx, 1);
    me.friends.push({ character: fromId });
    await me.save();
    const other = await Character.findById(fromId);
    if (other) { other.friends.push({ character: me._id }); await other.save(); }
    res.json({ success: true, message: 'Đã chấp nhận kết bạn' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/friends/decline', protect, async (req, res) => {
  try {
    const { fromId } = req.body;
    const me = await Character.findOne({ user: req.user._id });
    if (!me) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    me.friendRequests = me.friendRequests.filter((r) => String(r.from) !== String(fromId));
    await me.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/friends/:id', protect, async (req, res) => {
  try {
    const me = await Character.findOne({ user: req.user._id });
    if (!me) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    me.friends = me.friends.filter((f) => String(f.character) !== String(req.params.id));
    await me.save();
    const other = await Character.findById(req.params.id);
    if (other) { other.friends = other.friends.filter((f) => String(f.character) !== String(me._id)); await other.save(); }
    res.json({ success: true, message: 'Đã hủy kết bạn' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ---------- Thách đấu Thần Linh (mỗi 10 cấp) ----------
router.post('/character/duel/start', protect, async (req, res) => {
  try {
    const { tier } = req.body;
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const duel = char.godDuels.find((d) => d.tier === tier && d.status === 'pending');
    if (!duel) return res.status(400).json({ success: false, message: 'Không có thách đấu nào ở bậc này' });
    const continent = GD.CONTINENTS.find((c) => c.id === duel.continentId);
    const godStats = GD.godStatsFor(continent);
    res.json({ success: true, duel, god: { name: continent.god.name, color: continent.god.color, ...godStats }, playerStats: computeStats(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/character/duel/resolve', protect, async (req, res) => {
  try {
    const { tier, won } = req.body;
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const duel = char.godDuels.find((d) => d.tier === tier && d.status === 'pending');
    if (!duel) return res.status(400).json({ success: false, message: 'Không có thách đấu nào ở bậc này' });
    if (won) {
      duel.status = 'won';
      const continent = GD.CONTINENTS.find((c) => c.id === duel.continentId);
      char.godBlessings.push({ god: continent.god.name, skillName: continent.god.ultimate, grantedAtLevel: tier * 10 });
      const skillId = `blessing_${continent.id}`;
      if (!char.knownSkills.includes(skillId)) char.knownSkills.push(skillId);
      await char.save();
      res.json({ success: true, character: publicChar(char), message: `${continent.god.name} đã ban phước chiêu thức "${continent.god.ultimate}" cho bạn! Vào Menu > Kỹ Năng để gắn ra ngoài màn hình.` });
    } else {
      res.json({ success: true, character: publicChar(char), message: 'Bạn đã thua. Thư thách đấu vẫn còn trong Thông Báo, thử lại bất cứ lúc nào — không mất gì.' });
    }
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point mới: chọn 2 trong số các chiêu đã biết để hiện ra nút bấm ngoài màn hình
router.post('/character/equip-skills', protect, async (req, res) => {
  try {
    const { skillIds } = req.body; // mảng đúng 2 phần tử
    if (!Array.isArray(skillIds) || skillIds.length !== 2) return res.status(400).json({ success: false, message: 'Cần chọn đúng 2 chiêu' });
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const valid = getAllSkillsFor(char).filter((s) => s.type === 'active').map((s) => s.id);
    if (!skillIds.every((id) => valid.includes(id))) return res.status(400).json({ success: false, message: 'Chiêu không hợp lệ hoặc chưa học' });
    char.equippedSkills = skillIds;
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
