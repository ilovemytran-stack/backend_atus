const router = require('express').Router();
const Character = require('../models/Character');
const Guild = require('../models/Guild');
const { protect } = require('../middleware/auth');
const GD = require('../data/gameData');

// ---- Nhiệm vụ (point 2 & 11 — NPC giao nhiệm vụ) — trải dài Lv1-60, thưởng XP tăng dần theo mốc cấp ----
const QUESTS = [
  { id: 'q_first_blood', name: 'Diệt 5 quái đầu tiên', desc: 'Hạ 5 quái bất kỳ để làm quen chiến đấu.', type: 'kill', target: 5, reward: { xp: 30, gold: 50 } },
  { id: 'q_gear_up', name: 'Mua 1 vũ khí từ thợ rèn', desc: 'Ghé Thợ Rèn Vũ Khí sắm món đầu tiên.', type: 'buy_weapon', target: 1, reward: { xp: 40, gem: 5 } },
  { id: 'q_armor_up', name: 'Trang bị 1 món giáp', desc: 'Mặc bất kỳ giáp nào vào người.', type: 'equip_armor', target: 1, reward: { xp: 40, gold: 60 } },
  { id: 'q_explorer', name: 'Đạt cấp độ 10', desc: 'Lên cấp 10 để mở Thách Đấu Thần Linh đầu tiên.', type: 'reach_level', target: 10, reward: { xp: 100, gold: 150, gem: 10 } },
  // q_hunter/q_wealthy/q_slayer: tăng target (theo yêu cầu "làm nhiệm vụ khó hơn") — cộng thêm
  // việc vàng/ngọc rơi ít hơn ở scaleMonster() phía trên, các nhiệm vụ tích luỹ này giờ tốn
  // nhiều thời gian hơn hẳn bản trước, đúng hướng "khó hơn" chứ không chỉ số đích tăng suông.
  { id: 'q_hunter', name: 'Diệt 45 quái', desc: 'Tích luỹ 45 lượt hạ quái.', type: 'kill', target: 45, reward: { xp: 150, gold: 200 } },
  { id: 'q_rising_star', name: 'Đạt cấp độ 20', desc: 'Chứng tỏ bản lĩnh ở cấp 20.', type: 'reach_level', target: 20, reward: { xp: 250, gold: 300, gem: 20 } },
  { id: 'q_wealthy', name: 'Tích luỹ 1.500 vàng', desc: 'Buôn bán, săn quái để dư dả hơn.', type: 'earn_gold', target: 1500, reward: { xp: 200, gem: 15 } },
  { id: 'q_first_duel', name: 'Thắng 1 Thách Đấu Thần Linh', desc: 'Đánh bại một vị Thần để nhận phước lành.', type: 'win_duel', target: 1, reward: { xp: 250, gold: 250, gem: 20 } },
  { id: 'q_veteran', name: 'Đạt cấp độ 30', desc: 'Nửa chặng đường tới đỉnh cao.', type: 'reach_level', target: 30, reward: { xp: 400, gold: 500, gem: 30 } },
  { id: 'q_wanderer', name: 'Đặt chân đến 4 lục địa', desc: 'Khám phá ít nhất 4 lục địa khác nhau.', type: 'visit_continents', target: 4, reward: { xp: 500, gem: 35 } },
  { id: 'q_slayer', name: 'Diệt 160 quái', desc: 'Trở thành tay săn quái lão luyện.', type: 'kill', target: 160, reward: { xp: 600, gold: 500 } },
  { id: 'q_champion', name: 'Đạt cấp độ 40', desc: 'Sức mạnh vượt trội hơn hẳn người thường.', type: 'reach_level', target: 40, reward: { xp: 700, gold: 900, gem: 50 } },
  { id: 'q_blessed', name: 'Thắng 3 Thách Đấu Thần Linh', desc: 'Được 3 vị Thần khác nhau ban phước.', type: 'win_duel', target: 3, reward: { xp: 800, gold: 600, gem: 40 } },
  { id: 'q_master', name: 'Đạt cấp độ 50', desc: 'Chỉ còn một bước nữa tới đỉnh.', type: 'reach_level', target: 50, reward: { xp: 1200, gold: 1500, gem: 70 } },
  { id: 'q_legend', name: 'Đạt cấp độ tối đa 60', desc: 'Chinh phục giới hạn sức mạnh hiện tại.', type: 'reach_level', target: 60, reward: { xp: 0, gold: 3000, gem: 150 } },
];

function xpToNextLevel(level) { return Math.round(40 * Math.pow(level, 1.55)); }

// Xử lý lên cấp DÙNG CHUNG cho mọi nguồn XP (diệt quái, nhận thưởng nhiệm vụ...) để không
// nguồn nào bị "quên" cộng điểm thuộc tính / điểm chiêu / mở Thách Đấu Thần Linh.
function applyLevelUps(char) {
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
        // Ngẫu nhiên 1 vị Thần chưa từng mời đấu (còn lại), để mỗi mốc 10 cấp là 1 lời mời khác nhau
        // thay vì luôn khoá cứng theo lục địa đang đứng.
        const usedContinents = new Set(char.godDuels.map((d) => d.continentId));
        const pool = GD.CONTINENTS.filter((c) => !usedContinents.has(c.id));
        const options = pool.length ? pool : GD.CONTINENTS;
        const cont = options[Math.floor(Math.random() * options.length)];
        char.godDuels.push({ tier, continentId: cont.id, godName: cont.god.name, status: 'pending' });
      }
    }
  }
  if (leveledUp.length) syncPetProgression(char);
  return leveledUp;
}

function guildXpToNextLevel(level) { return Math.round(1000 * Math.pow(level, 1.35)); }

// Bang Hội nhận 1 phần XP mỗi khi thành viên diệt quái/boss — cộng dồn, lên cấp mở thêm chỗ (maxMembers)
async function grantGuildXp(guildId, amount) {
  if (!guildId || amount <= 0) return;
  const guild = await Guild.findById(guildId);
  if (!guild) return;
  guild.xp += amount;
  while (guild.xp >= guildXpToNextLevel(guild.level)) {
    guild.xp -= guildXpToNextLevel(guild.level);
    guild.level += 1;
    guild.maxMembers += 3; // mỗi cấp bang mở thêm 3 chỗ
  }
  await guild.save();
}

// Tính tiến độ hiện tại của 1 nhiệm vụ theo type — gộp về 1 chỗ để dễ thêm loại nhiệm vụ mới.
function questProgressValue(char, quest) {
  switch (quest.type) {
    case 'reach_level': return char.level;
    case 'earn_gold': return char.gold;
    case 'equip_armor': return ['body', 'legs', 'boots', 'gloves', 'helmet'].some((k) => char.equipment[k]) ? 1 : 0;
    case 'win_duel': return char.questProgress?.duelsWon || 0;
    case 'visit_continents': return (char.questProgress?.continentsVisited || []).length;
    case 'buy_weapon': return char.questProgress?.q_gear_up || 0;
    case 'kill': return char.questProgress?.totalKills || 0;
    default: return char.questProgress?.[quest.id] || 0;
  }
}

function findSkillById(skillId) {
  for (const cid in GD.CLASSES) {
    const found = GD.CLASSES[cid].skills.find((s) => s.id === skillId);
    if (found) return { ...found, fromClass: GD.CLASSES[cid].name, color: found.color || GD.CLASSES[cid].color };
  }
  return null;
}

// Toàn bộ chiêu nhân vật CÓ THỂ dùng: 2 chiêu gốc của class + chiêu học thêm qua
// Thách Đấu Thần Linh (mỗi lần thắng = ngẫu nhiên 1 chiêu của MỘT NHÂN VẬT KHÁC, không phải chiêu của Thần).
function getAllSkillsFor(char) {
  const cls = GD.CLASSES[char.classId];
  const extra = (char.knownSkills || []).map((id) => {
    if (id.startsWith('blessing_')) { // tương thích ngược với dữ liệu cũ (chiêu của Thần)
      const contId = id.replace('blessing_', '');
      const cont = GD.CONTINENTS.find((c) => c.id === contId);
      return cont ? GD.blessingSkillFor(cont, 1) : null;
    }
    return findSkillById(id); // chiêu mượn từ một nhân vật khác
  }).filter(Boolean);
  return [...cls.skills, ...extra];
}

function findGear(itemId, kind) {
  if (!itemId) return null;
  if (itemId.startsWith('starter_')) return kind === 'weapon' ? GD.STARTER_GEAR.weapons[itemId] : GD.STARTER_GEAR.armor[itemId];
  if (itemId.startsWith('special_')) return GD.SPECIAL_ITEMS[itemId];
  if (itemId.startsWith('super_')) return GD.SUPER_ITEMS[itemId];
  return kind === 'weapon' ? GD.WEAPONS[itemId] : GD.ARMOR[itemId];
}

// ---- Pet: đồng bộ HP/Ki/ATK/DEF trực tiếp theo người chơi + hệ số Thường/VIP (mục 5 bản spec), có trần riêng ----
function computePetStats(playerStats, tier) {
  const mult = GD.PET_TIER_MULT[tier] || 1;
  const hpCap = tier === 'vip' ? GD.STAT_CAPS.HP_PET_VIP : GD.STAT_CAPS.HP_PET_NORMAL;
  const dmgCap = tier === 'vip' ? GD.STAT_CAPS.DMG_PET_VIP : GD.STAT_CAPS.DMG_PET_NORMAL;
  return {
    hp: Math.min(Math.round(playerStats.hp * mult), hpCap),
    ki: Math.min(Math.round(playerStats.ki * mult), GD.STAT_CAPS.KI_ALL),
    atk: Math.min(Math.round(playerStats.atk * mult), dmgCap),
    def: Math.min(Math.round(playerStats.def * mult), GD.STAT_CAPS.ARMOR_ALL),
  };
}

// Roll skill2/skill3/skill4 khi pet (đồng bộ level người chơi) vừa đủ điều kiện mở khoá, và tự hồi
// sinh khi đã hết hạn chết. Gọi TRƯỚC publicChar ở mọi nơi có thể làm char lên cấp / có pet mới.
function syncPetProgression(char) {
  if (!char.pets || !char.pets.slots || !char.pets.slots.length) return false;
  let changed = false;
  const now = Date.now();
  char.pets.slots.forEach((pet) => {
    if (char.level >= 20 && pet.skill2Version == null) { pet.skill2Version = 1 + Math.floor(Math.random() * 4); changed = true; }
    if (char.level >= 40 && pet.skill3Version == null) { pet.skill3Version = 1 + Math.floor(Math.random() * 2); changed = true; }
    if (char.level >= 60 && !pet.hasSkill4) { pet.hasSkill4 = true; changed = true; }
    if (pet.deadUntil && pet.deadUntil.getTime() <= now) { pet.deadUntil = null; changed = true; }
  });
  return changed;
}

function publicPets(char, stats) {
  if (!char.pets || !char.pets.slots) return [];
  return char.pets.slots.map((pet, idx) => {
    const def = GD.PETS[pet.defId];
    if (!def) return null;
    return {
      slot: idx, role: idx === 0 ? 'daica' : 'tieude', defId: pet.defId, name: def.name, tier: def.tier,
      portrait: def.portrait, diePortrait: def.diePortrait, frameCount: def.frameCount,
      mode: pet.mode, skill2Version: pet.skill2Version, skill3Version: pet.skill3Version, hasSkill4: pet.hasSkill4,
      isDead: !!(pet.deadUntil && pet.deadUntil.getTime() > Date.now()),
      deadUntil: pet.deadUntil, obtainedAt: pet.obtainedAt,
      stats: computePetStats(stats, def.tier),
    };
  }).filter(Boolean);
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

  // Bộ Trang Bị Siêu Cấp (Super Set — GLG mới, mạnh hơn 1 bậc so với Đặc Biệt)
  const superCount = equippedIds.filter((id) => id && id.startsWith('super_')).length;
  const hasFullSuperSet = superCount >= 4;
  if (hasFullSuperSet) { atk += GD.SUPER_SET.setBonus.atk; def += GD.SUPER_SET.setBonus.def; hp += GD.SUPER_SET.setBonus.hp; }

  // phước lành từ thần linh (thắng thách đấu mỗi 10 cấp) — mỗi phước +chỉ số nhỏ, vĩnh viễn
  const blessingCount = (char.godBlessings || []).length;
  hp += blessingCount * 25; atk += blessingCount * 3; def += blessingCount * 2;

  // cộng dồn vĩnh viễn từ đá cường hoá / huy hiệu (mục vật phẩm mới, dùng 1 lần)
  const pb = char.permBonus || {};
  atk += pb.atk || 0; def += pb.def || 0; hp += pb.hp || 0; spd += pb.spd || 0; crit += pb.crit || 0;
  ki += pb.ki || 0;

  // Hào Quang (Aura) — % nhân sau khi đã cộng hết đồ + phước lành + cường hoá
  if (char.hasAura) {
    atk *= (1 + GD.AURA.buff.atkPct); def *= (1 + GD.AURA.buff.defPct); hp *= (1 + GD.AURA.buff.hpPct);
    crit += GD.AURA.buff.critAdd;
  }

  // công cụ GM: buff sát thương để test (mặc định x1 = không đổi)
  if (char.gmDamageMultiplier && char.gmDamageMultiplier !== 1) atk *= char.gmDamageMultiplier;

  // Trần chỉ số (mục 10) — xem STAT_CAPS trong gameData.js để biết lý do các mốc này còn xa mới chạm tới
  hp = Math.min(hp, GD.STAT_CAPS.HP_PLAYER);
  ki = Math.min(ki, GD.STAT_CAPS.KI_ALL);
  atk = Math.min(atk, GD.STAT_CAPS.DMG_PLAYER);
  def = Math.min(def, GD.STAT_CAPS.ARMOR_ALL);

  return {
    hp: Math.round(hp), ki: Math.round(ki), atk: Math.round(atk), def: Math.round(def),
    spd: +spd.toFixed(2), crit: +crit.toFixed(1), mag: +mag.toFixed(1),
    hasFullSpecialSet: hasFullSet, executeChance: Math.max(hasFullSet ? GD.SPECIAL_SET.setBonus.executeChance : 0, hasFullSuperSet ? GD.SUPER_SET.setBonus.executeChance : 0),
    hasFullSuperSet, allDmgPct: hasFullSuperSet ? GD.SUPER_SET.setBonus.allDmgPct : 0,
    hasAura: !!char.hasAura, auraLifestealPct: char.hasAura ? GD.AURA.buff.lifestealPct : 0, auraEnergyStealPct: char.hasAura ? GD.AURA.buff.energyStealPct : 0,
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
  obj.quests = QUESTS.map((q) => ({ ...q, progress: questProgressValue(char, q), claimed: !!char.questProgress?.[q.id + '_claimed'] }));
  obj.pets = publicPets(char, obj.stats);
  obj.petSlot2Unlocked = !!(char.pets && char.pets.slot2Unlocked);
  obj.hasAura = !!char.hasAura;
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
    // ---- Pet & Hào Quang & Super Set (bản cập nhật GLG) ----
    pets: GD.PETS, petTierMult: GD.PET_TIER_MULT, petDeathMs: GD.PET_DEATH_MS,
    petSkill2Versions: GD.PET_SKILL2_VERSIONS, petSkill3Versions: GD.PET_SKILL3_VERSIONS, petSkill4: GD.PET_SKILL4,
    aura: GD.AURA, superSet: GD.SUPER_SET, superItems: GD.SUPER_ITEMS, statCaps: GD.STAT_CAPS,
    universalSkills: GD.UNIVERSAL_SKILLS, spriteManifest: GD.SPRITE_MANIFEST,
  });
});

// ---- Nhân vật của tôi ----
router.get('/character', protect, async (req, res) => {
  try {
    const char = await Character.findOne({ user: req.user._id });
    if (char) { syncPetProgression(char); char.lastSeenAt = new Date(); await char.save(); }
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
    const { mapId, isBoss } = req.body;
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const map = GD.MAPS.find((m) => m.id === mapId);
    if (!map) return res.status(400).json({ success: false, message: 'Map không hợp lệ' });

    let drop, lootName;
    if (isBoss && map.hasBoss) {
      const continent = GD.CONTINENTS.find((c) => c.id === map.continentId);
      const guardian = GD.BOSSES.find((b) => b.continent === map.continentId);
      drop = GD.guardianBossStatsFor(continent, map.levelRange[1]);
      lootName = guardian?.name || continent.name;
    } else {
      if (!map.monsterIds.length) return res.status(400).json({ success: false, message: 'Map không hợp lệ' });
      const monsterId = map.monsterIds[Math.floor(Math.random() * map.monsterIds.length)];
      const monsterDef = GD.MONSTERS[monsterId];
      drop = GD.scaleMonster(monsterDef, map.levelRange[1], false, map.isMixedTier);
      lootName = monsterDef.nameVN;
    }

    char.xp += drop.xp;
    const gold = drop.goldMin + Math.floor(Math.random() * (drop.goldMax - drop.goldMin + 1));
    char.gold += gold;
    let gemWon = 0;
    if (Math.random() < drop.gemChance) { gemWon = 1; char.gem += 1; }

    const leveledUp = applyLevelUps(char);

    if (char.guildId) grantGuildXp(char.guildId, Math.round(drop.xp * (isBoss ? 0.35 : 0.15))).catch(() => {});

    // tiến độ nhiệm vụ diệt quái (đếm chung cho mọi nhiệm vụ loại 'kill')
    const kills = (char.questProgress.totalKills || 0) + 1;
    char.questProgress = { ...char.questProgress, totalKills: kills };
    char.markModified('questProgress');

    await char.save();
    res.json({ success: true, character: publicChar(char), loot: { monster: lootName, xp: drop.xp, gold, gem: gemWon, isBoss: !!isBoss }, leveledUp });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point 9/11: mua đồ từ NPC (vũ khí / trang bị / vật phẩm hồi phục)
// Vật phẩm "nhiều lần dùng / 1 cái" — mua 1 lần nhưng cộng thẳng số LƯỢT (charges) vào qty luôn, dùng
// route use-item/move như cũ (mỗi lượt vẫn trừ qty -1) nên không cần sửa logic tiêu thụ ở đâu khác.
const MULTI_CHARGE_ITEMS = { teleport_scroll: 10 }; // Truyền Tống Phù: 1 lá = 10 lượt dịch chuyển

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
    const grantQty = MULTI_CHARGE_ITEMS[itemId] || 1;
    const existing = char.inventory.find((i) => i.itemId === itemId && i.kind === kind);
    if (existing && kind === 'consumable') existing.qty += grantQty;
    else char.inventory.push({ itemId, kind, qty: grantQty });
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

function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function rollPetDefId() {
  // đúng tỉ lệ Thường/VIP như rơi từ boss (mục 7), rồi random đều trong 2 con của nhóm đó
  const isVip = Math.random() < (GD.PET_DROP_CHANCE.vip / (GD.PET_DROP_CHANCE.normal + GD.PET_DROP_CHANCE.vip));
  return isVip ? (Math.random() < 0.5 ? 'pet_ninja_vip' : 'pet_boy_vip') : (Math.random() < 0.5 ? 'pet_ghost' : 'pet_wolf');
}

// point mới: dùng vật phẩm tiêu hao — phần lớn hiệu ứng (hp/ki/buff tạm thời...) trả nguyên `effect`
// để CLIENT tự áp dụng (giống cách hp_potion/might_potion đã hoạt động từ trước), nhưng các hiệu ứng
// đụng tới dữ liệu lưu trữ vĩnh viễn (vàng, chỉ số cộng vĩnh viễn, pet, tên nhân vật) PHẢI xử lý ở
// server để không thể gian lận từ phía client.
router.post('/character/use-item', protect, async (req, res) => {
  try {
    const { itemId, newName, petSlot } = req.body;
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const def = GD.CONSUMABLES[itemId];
    if (!def) return res.status(400).json({ success: false, message: 'Vật phẩm không hợp lệ' });
    const inv = char.inventory.find((i) => i.itemId === itemId && i.kind === 'consumable');
    if (!inv || inv.qty < 1) return res.status(400).json({ success: false, message: 'Không có vật phẩm' });

    // Nguyên liệu (mat_*) chỉ để bán, chìa khoá + rương phải mở cùng nhau qua route riêng
    if (itemId.startsWith('mat_')) return res.status(400).json({ success: false, message: 'Vật phẩm này chỉ có thể bán cho NPC, không thể sử dụng trực tiếp' });
    if (itemId.startsWith('key_') || itemId === 'treasure_chest') return res.status(400).json({ success: false, message: 'Dùng route mở rương (cần cả rương + 1 chìa khoá)' });

    let extra = {};
    if (itemId === 'bai_su_token') {
      if (char.pets?.slot2Unlocked) return res.status(400).json({ success: false, message: 'Bạn đã mở ô Tiểu Đệ rồi' });
      char.pets = char.pets || { slots: [] };
      char.pets.slot2Unlocked = true;
    } else if (itemId === 'change_pet_1' || itemId === 'change_pet_2') {
      const idx = itemId === 'change_pet_1' ? 0 : 1;
      const pet = char.pets?.slots?.[idx];
      if (!pet) return res.status(400).json({ success: false, message: 'Ô pet này chưa có pet để đổi' });
      let newDef = rollPetDefId();
      while (newDef === pet.defId) newDef = rollPetDefId(); // đảm bảo đổi thật sự khác con cũ
      pet.defId = newDef;
    } else if (itemId.startsWith('reroll_skill2_pet') || itemId.startsWith('reroll_skill3_pet')) {
      const idx = itemId.endsWith('pet1') ? 0 : 1;
      const pet = char.pets?.slots?.[idx];
      if (!pet) return res.status(400).json({ success: false, message: 'Ô pet này chưa có pet' });
      if (itemId.startsWith('reroll_skill2')) {
        if (pet.skill2Version == null) return res.status(400).json({ success: false, message: 'Pet chưa học Chiêu 2 (cần level 20)' });
        pet.skill2Version = 1 + Math.floor(Math.random() * 4);
      } else {
        if (pet.skill3Version == null) return res.status(400).json({ success: false, message: 'Pet chưa học Chiêu 3 (cần level 40)' });
        pet.skill3Version = 1 + Math.floor(Math.random() * 2);
      }
    } else if (itemId === 'feather_quill') {
      const trimmed = (newName || '').trim().slice(0, 20);
      if (trimmed.length < 2) return res.status(400).json({ success: false, message: 'Tên mới cần ít nhất 2 ký tự' });
      char.name = trimmed;
    } else if (itemId === 'coin_pouch') {
      const gained = randInt(def.effect.randomGoldMin, def.effect.randomGoldMax);
      char.gold += gained;
      extra.goldGained = gained;
    }

    // Hiệu ứng cộng vĩnh viễn (đá cường hoá / huy hiệu) — luôn xử lý ở server bất kể item nào có key này
    if (def.effect) {
      const pb = char.permBonus || { atk: 0, def: 0, hp: 0, spd: 0, crit: 0 };
      if (def.effect.permAtk) pb.atk = (pb.atk || 0) + def.effect.permAtk;
      if (def.effect.permDef) pb.def = (pb.def || 0) + def.effect.permDef;
      if (def.effect.permHp) pb.hp = (pb.hp || 0) + def.effect.permHp;
      if (def.effect.permSpd) pb.spd = (pb.spd || 0) + def.effect.permSpd;
      if (def.effect.permCrit) pb.crit = (pb.crit || 0) + def.effect.permCrit;
      char.permBonus = pb;
    }
    void petSlot; // giữ tham số cho FE gọi thống nhất dù nhánh trên đã tự suy ra idx từ itemId

    inv.qty -= 1;
    if (inv.qty <= 0) char.inventory = char.inventory.filter((i) => i !== inv);
    await char.save();
    res.json({ success: true, character: publicChar(char), effect: def.effect, ...extra });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Mở Rương Kho Báu: cần 1 "treasure_chest" + 1 "key_*" bất kỳ trong túi đồ, tiêu cả 2, thưởng theo tầng chìa khoá
router.post('/character/chest/open', protect, async (req, res) => {
  try {
    const { keyId } = req.body;
    const tier = GD.KEY_TIERS[keyId];
    if (!tier) return res.status(400).json({ success: false, message: 'Chìa khoá không hợp lệ' });
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const chestInv = char.inventory.find((i) => i.itemId === 'treasure_chest' && i.kind === 'consumable');
    const keyInv = char.inventory.find((i) => i.itemId === keyId && i.kind === 'consumable');
    if (!chestInv || chestInv.qty < 1) return res.status(400).json({ success: false, message: 'Bạn chưa có Rương Kho Báu' });
    if (!keyInv || keyInv.qty < 1) return res.status(400).json({ success: false, message: 'Bạn chưa có chìa khoá này' });
    chestInv.qty -= 1; keyInv.qty -= 1;
    char.inventory = char.inventory.filter((i) => i.qty > 0);
    const gold = randInt(tier.gold[0], tier.gold[1]);
    const gem = randInt(tier.gem[0], tier.gem[1]);
    char.gold += gold; char.gem += gem;
    const rewards = [`${gold} vàng`, gem > 0 ? `${gem} ngọc` : null].filter(Boolean);
    if (Math.random() < tier.matChance) {
      const matIds = Object.keys(GD.CONSUMABLES).filter((k) => k.startsWith('mat_'));
      const matId = matIds[Math.floor(Math.random() * matIds.length)];
      const invItem = char.inventory.find((i) => i.itemId === matId && i.kind === 'consumable');
      if (invItem) invItem.qty += 1; else char.inventory.push({ itemId: matId, kind: 'consumable', qty: 1 });
      rewards.push(GD.CONSUMABLES[matId].name);
    }
    if (tier.superShardChance && Math.random() < tier.superShardChance) {
      const invItem = char.inventory.find((i) => i.itemId === 'gem_super' && i.kind === 'consumable');
      if (invItem) invItem.qty += 1; else char.inventory.push({ itemId: 'gem_super', kind: 'consumable', qty: 1 });
      rewards.push(GD.CONSUMABLES.gem_super.name);
    }
    await char.save();
    res.json({ success: true, character: publicChar(char), rewards });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Bán vật phẩm (chưa có route bán trước đây) — không bán được đồ đang trang bị / vật phẩm dropOnly không có sellPrice
router.post('/character/sell', protect, async (req, res) => {
  try {
    const { itemId, kind, qty = 1 } = req.body;
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const inv = char.inventory.find((i) => i.itemId === itemId && i.kind === kind);
    if (!inv || inv.qty < qty || qty < 1) return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ' });
    let unitPrice;
    if (kind === 'consumable') {
      const def = GD.CONSUMABLES[itemId];
      unitPrice = def?.sellPrice ?? Math.round((def?.price || 0) * (def?.currency === 'gold' ? 0.4 : 0));
    } else {
      const equippedElsewhere = Object.values(char.equipment || {}).includes(itemId);
      if (equippedElsewhere) return res.status(400).json({ success: false, message: 'Đang trang bị, hãy tháo ra trước khi bán' });
      const item = findGear(itemId, kind);
      unitPrice = Math.round((item?.price || 0) * 0.4);
    }
    if (!unitPrice) return res.status(400).json({ success: false, message: 'Vật phẩm này không bán được' });
    const total = unitPrice * qty;
    inv.qty -= qty;
    if (inv.qty <= 0) char.inventory = char.inventory.filter((i) => i !== inv);
    char.gold += total;
    await char.save();
    res.json({ success: true, character: publicChar(char), goldGained: total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point mới: đặt lệnh cho pet (def/atk/fl) — gõ trong chat hoặc bấm trong bảng Pet đều gọi route này
router.post('/character/pet/mode', protect, async (req, res) => {
  try {
    const { slot, mode } = req.body;
    if (!['def', 'atk', 'fl'].includes(mode)) return res.status(400).json({ success: false, message: 'Lệnh không hợp lệ (def/atk/fl)' });
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const pet = char.pets?.slots?.[slot];
    if (!pet) return res.status(400).json({ success: false, message: 'Không có pet ở ô này' });
    pet.mode = mode;
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Pet chết (client báo lên khi HP pet giả lập phía client chạm 0) — lưu deadUntil để còn đúng hạn
// hồi sinh 3 phút xuyên suốt kể cả khi người chơi tải lại trang giữa chừng.
router.post('/character/pet/death', protect, async (req, res) => {
  try {
    const { slot } = req.body;
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    const pet = char.pets?.slots?.[slot];
    if (!pet) return res.status(400).json({ success: false, message: 'Không có pet ở ô này' });
    pet.deadUntil = new Date(Date.now() + GD.PET_DEATH_MS);
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Trao đổi Hào Quang tại NPC "Trưởng Lão Nhiệm Vụ" — chỉ tại Lục Địa Ánh Sáng, cần level 15+
// và 3 trang bị đặc biệt (bất kỳ) + 3 đá nâng cấp trang bị đặc biệt.
router.post('/character/aura/exchange', protect, async (req, res) => {
  try {
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });
    if (char.hasAura) return res.status(400).json({ success: false, message: 'Bạn đã sở hữu Hào Quang rồi' });
    if (char.level < GD.AURA.reqLevel) return res.status(400).json({ success: false, message: `Cần đạt cấp ${GD.AURA.reqLevel} để đổi Hào Quang` });
    const specialInv = char.inventory.filter((i) => i.kind === 'armor' || i.kind === 'weapon').filter((i) => i.itemId.startsWith('special_'));
    const specialCount = specialInv.reduce((s, i) => s + i.qty, 0);
    const stoneInv = char.inventory.find((i) => i.itemId === 'upgrade_stone_special' && i.kind === 'consumable');
    if (specialCount < GD.AURA.costSpecialPieces) return res.status(400).json({ success: false, message: `Cần ${GD.AURA.costSpecialPieces} trang bị đặc biệt bất kỳ (đang có ${specialCount})` });
    if (!stoneInv || stoneInv.qty < GD.AURA.costUpgradeStones) return res.status(400).json({ success: false, message: `Cần ${GD.AURA.costUpgradeStones} Đá Nâng Trang Bị Đặc Biệt` });
    // trừ 3 trang bị đặc biệt bất kỳ (ưu tiên món KHÔNG đang trang bị trước để tránh tự tháo đồ người chơi)
    let need = GD.AURA.costSpecialPieces;
    const equippedIds = new Set(Object.values(char.equipment || {}).filter(Boolean));
    specialInv.sort((a, b) => (equippedIds.has(a.itemId) ? 1 : 0) - (equippedIds.has(b.itemId) ? 1 : 0));
    for (const i of specialInv) {
      if (need <= 0) break;
      const take = Math.min(i.qty, need);
      i.qty -= take; need -= take;
      if (equippedIds.has(i.itemId) && i.qty === 0) {
        Object.entries(char.equipment).forEach(([slot, id]) => { if (id === i.itemId) char.equipment[slot] = null; });
      }
    }
    stoneInv.qty -= GD.AURA.costUpgradeStones;
    char.inventory = char.inventory.filter((i) => i.qty > 0);
    char.hasAura = true;
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// point 5/11: di chuyển lục địa / map (NPC dẫn đường hoặc đi bộ giữa các map trong lục địa)
router.post('/character/move', protect, async (req, res) => {
  try {
    const { mapId, x, y, freeTeleport } = req.body;
    const map = GD.MAPS.find((m) => m.id === mapId);
    if (!map) return res.status(400).json({ success: false, message: 'Map không hợp lệ' });
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });

    // Đổi LỤC ĐỊA (khác continentId hiện tại) bắt buộc có Truyền Tống Phù, trừ khi là
    // freeTeleport (ví dụ: dịch chuyển tới Boss Thế Giới từ Thông Báo — vẫn miễn phí để
    // khuyến khích tham gia world event). Di chuyển giữa các map TRONG CÙNG 1 lục địa
    // (đi bộ qua hành lang) luôn miễn phí, không cần vật phẩm gì.
    const fromContinentId = char.position?.continentId;
    if (!freeTeleport && fromContinentId && fromContinentId !== map.continentId) {
      const scroll = char.inventory.find((i) => i.itemId === 'teleport_scroll' && i.kind === 'consumable');
      if (!scroll || scroll.qty < 1) {
        return res.status(400).json({ success: false, message: 'Cần có Truyền Tống Phù để di chuyển sang lục địa khác. Mua tại cửa hàng vật phẩm.', needsScroll: true });
      }
      scroll.qty -= 1;
      if (scroll.qty <= 0) char.inventory = char.inventory.filter((i) => i !== scroll);
    }

    char.position = { continentId: map.continentId, mapId: map.id, x: x ?? 400, y: y ?? 300 };
    const visited = new Set(char.questProgress?.continentsVisited || []);
    if (!visited.has(map.continentId)) {
      visited.add(map.continentId);
      char.questProgress = { ...char.questProgress, continentsVisited: Array.from(visited) };
      char.markModified('questProgress');
    }
    await char.save();
    res.json({ success: true, character: publicChar(char) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Hồi sinh sau khi gục: 'home' (miễn phí, dịch chuyển về map khởi đầu — không cần Truyền Tống
// Phù dù đang ở lục địa khác, vì đây là hình phạt chết chứ không phải di chuyển thường) hoặc
// 'gem' (hồi sinh tại chỗ, tốn 30 ngọc, giữ nguyên vị trí/map hiện tại).
router.post('/character/revive', protect, async (req, res) => {
  try {
    const { mode } = req.body; // 'home' | 'gem'
    const char = await Character.findOne({ user: req.user._id });
    if (!char) return res.status(404).json({ success: false, message: 'Chưa có nhân vật' });

    if (mode === 'gem') {
      const REVIVE_GEM_COST = 30;
      if (char.gem < REVIVE_GEM_COST) {
        return res.status(400).json({ success: false, message: `Cần ${REVIVE_GEM_COST} ngọc để hồi sinh tại chỗ, bạn không đủ.` });
      }
      char.gem -= REVIVE_GEM_COST;
      await char.save();
      return res.json({ success: true, character: publicChar(char), mode: 'gem' });
    }

    const homeMap = GD.MAPS.find((m) => m.id === 'aurelion_1');
    char.position = { continentId: homeMap.continentId, mapId: homeMap.id, x: 400, y: 300 };
    await char.save();
    res.json({ success: true, character: publicChar(char), mode: 'home', map: { id: homeMap.id, continentId: homeMap.continentId } });
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
    const progressVal = questProgressValue(char, quest);
    const done = progressVal >= quest.target;
    if (!done) return res.status(400).json({ success: false, message: 'Chưa hoàn thành nhiệm vụ' });
    char.xp += quest.reward.xp || 0; char.gold += quest.reward.gold || 0; char.gem += quest.reward.gem || 0;
    const leveledUp = applyLevelUps(char);
    char.questProgress = { ...char.questProgress, [questId + '_claimed']: true };
    char.markModified('questProgress');
    await char.save();
    res.json({ success: true, character: publicChar(char), leveledUp });
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
      // Thang dau Than = duoc ban phuoc de linh hoi 1 chieu NGAU NHIEN cua MOT NHAN VAT KHAC
      // (khong phai class cua minh), chua tung hoc qua. Vi Than chi la nguoi ban phuoc.
      const otherClassSkills = Object.values(GD.CLASSES)
        .filter((c) => c.id !== char.classId)
        .flatMap((c) => c.skills.filter((s) => s.type === 'active').map((s) => s.id));
      const notYetKnown = otherClassSkills.filter((id) => !(char.knownSkills || []).includes(id));
      const pool = notYetKnown.length ? notYetKnown : otherClassSkills;
      const grantedId = pool[Math.floor(Math.random() * pool.length)];
      const grantedSkill = findSkillById(grantedId);
      char.godBlessings.push({ god: continent.god.name, skillName: grantedSkill.name, grantedAtLevel: tier * 10 });
      if (!char.knownSkills.includes(grantedId)) char.knownSkills.push(grantedId);
      char.questProgress = { ...char.questProgress, duelsWon: (char.questProgress?.duelsWon || 0) + 1 };
      char.markModified('questProgress');
      await char.save();
      const msg = continent.god.name + ' đã ban phước, giúp bạn lĩnh hội chiêu "' + grantedSkill.name + '" của ' + grantedSkill.fromClass + '! Vào Menu > Kỹ Năng để gắn ra ngoài màn hình.';
      res.json({ success: true, character: publicChar(char), message: msg });
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
