const GD = require('../data/gameData');
const Character = require('../models/Character');
const User = require('../models/User');
const CharacterBackup = require('../models/CharacterBackup');

const MAX_BACKUPS_PER_USER = 5;

// Tìm định nghĩa 1 item theo id trong TẤT CẢ bảng vật phẩm/trang bị (không cần biết trước là loại gì)
function findItemDef(id) {
  if (GD.WEAPONS[id]) return { def: GD.WEAPONS[id], kind: 'weapon' };
  if (GD.ARMOR[id]) return { def: GD.ARMOR[id], kind: 'armor' };
  if (GD.CONSUMABLES[id]) return { def: GD.CONSUMABLES[id], kind: 'consumable' };
  if (GD.SPECIAL_ITEMS[id]) return { def: GD.SPECIAL_ITEMS[id], kind: GD.SPECIAL_ITEMS[id].kind };
  if (GD.SUPER_ITEMS[id]) return { def: GD.SUPER_ITEMS[id], kind: GD.SUPER_ITEMS[id].kind };
  if (GD.STARTER_GEAR.weapons[id]) return { def: GD.STARTER_GEAR.weapons[id], kind: 'weapon' };
  if (GD.STARTER_GEAR.armor[id]) return { def: GD.STARTER_GEAR.armor[id], kind: 'armor' };
  return null;
}

async function findTargetChar(targetCharId) {
  if (!targetCharId) return null;
  return Character.findById(targetCharId);
}

async function backupChar(char, adminUserId, reason) {
  await CharacterBackup.create({ user: char.user, snapshot: char.toObject(), reason, createdBy: adminUserId });
  const all = await CharacterBackup.find({ user: char.user }).sort('-createdAt');
  if (all.length > MAX_BACKUPS_PER_USER) {
    const toRemove = all.slice(MAX_BACKUPS_PER_USER).map((b) => b._id);
    await CharacterBackup.deleteMany({ _id: { $in: toRemove } });
  }
}

// Reset về trạng thái khởi đầu — GIỮ user/name/classId/friends/friendRequests/mailbox/guildId (đây là
// dữ liệu tài khoản/xã hội, không phải "tiến trình chơi game" nên không tính vào "reset toàn bộ").
function resetCharFields(char) {
  char.level = 1; char.xp = 0; char.gold = 100; char.gem = 20;
  char.unspentStatPoints = 0; char.unspentSkillPoints = 0;
  char.attributes = { str: 0, vit: 0, agi: 0, int: 0 };
  char.skillLevels = new Map(); char.knownSkills = []; char.equippedSkills = [];
  char.position = { continentId: 'aurelion', mapId: 'aurelion_1', x: 400, y: 300 };
  char.inventory = []; char.equipment = { weapon: null, body: null, legs: null, boots: null, gloves: null, helmet: null };
  char.godBlessings = []; char.pvpWins = 0; char.pvpLosses = 0; char.bossKills = 0; char.gmDamageMultiplier = 1;
  char.godDuels = []; char.questProgress = {};
  char.pets = { slots: [], slot2Unlocked: false }; char.hasAura = false;
  char.permBonus = { atk: 0, def: 0, hp: 0, ki: 0, spd: 0, crit: 0 };
}

async function grantPet(char, defId, qty) {
  if (!GD.PETS[defId]) return { granted: 0, message: `Không tìm thấy pet "${defId}"` };
  char.pets = char.pets || { slots: [], slot2Unlocked: false };
  let granted = 0;
  for (let i = 0; i < qty; i += 1) {
    if (char.pets.slots.length >= 2) break; // giới hạn cứng 2 pet/người chơi, GM cũng không vượt qua được
    if (char.pets.slots.length === 1) char.pets.slot2Unlocked = true; // admin cấp thẳng thì tự mở khoá ô 2 luôn, khỏi cần mua Lệnh Bái Sư
    char.pets.slots.push({ defId, mode: 'def', skill2Version: null, skill3Version: null, hasSkill4: false, deadUntil: null, obtainedAt: new Date() });
    granted += 1;
  }
  const skipped = qty - granted;
  return { granted, message: skipped > 0 ? `Đã cấp ${granted} pet ${GD.PETS[defId].name} (bỏ qua ${skipped} vì đã đủ tối đa 2 pet/người chơi)` : `Đã cấp ${granted} pet ${GD.PETS[defId].name}` };
}

// ==========================================================================
// executeGmCommand: parse 1 dòng lệnh dạng text và thực thi.
// targetCharId dùng cho mọi lệnh NGOẠI TRỪ "del" khi lệnh del có kèm sẵn userId riêng trong câu lệnh.
// ==========================================================================
async function executeGmCommand(rawCommand, { targetCharId, adminUserId }) {
  const parts = rawCommand.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { success: false, message: 'Lệnh trống' };
  const cmd = parts[0].toLowerCase();

  if (cmd === 'buff') {
    const [, id, qtyRaw] = parts;
    const qty = Math.max(1, parseInt(qtyRaw, 10) || 1);
    if (!id) return { success: false, message: 'Cú pháp: buff [id] [số lượng]' };
    const char = await findTargetChar(targetCharId);
    if (!char) return { success: false, message: 'Chưa chọn nhân vật mục tiêu' };
    if (GD.PETS[id]) {
      const r = await grantPet(char, id, qty);
      await char.save();
      return { success: true, message: r.message };
    }
    const found = findItemDef(id);
    if (!found) return { success: false, message: `Không tìm thấy id "${id}" trong vũ khí/giáp/vật phẩm/pet` };
    const inv = char.inventory.find((i) => i.itemId === id && i.kind === found.kind);
    if (inv) inv.qty += qty; else char.inventory.push({ itemId: id, kind: found.kind, qty });
    await char.save();
    return { success: true, message: `Đã cấp ${qty} × ${found.def.name || id} cho ${char.name}` };
  }

  if (['hp', 'mp', 'damage', 'armor'].includes(cmd)) {
    const qty = parseInt(parts[1], 10);
    if (Number.isNaN(qty)) return { success: false, message: `Cú pháp: ${cmd} [số lượng] (số âm để giảm)` };
    const char = await findTargetChar(targetCharId);
    if (!char) return { success: false, message: 'Chưa chọn nhân vật mục tiêu' };
    char.permBonus = char.permBonus || { atk: 0, def: 0, hp: 0, ki: 0, spd: 0, crit: 0 };
    const fieldMap = { hp: 'hp', mp: 'ki', damage: 'atk', armor: 'def' };
    const field = fieldMap[cmd];
    char.permBonus[field] = Math.max(0, (char.permBonus[field] || 0) + qty);
    await char.save();
    const labelMap = { hp: 'Máu', mp: 'Ki', damage: 'Sát thương', armor: 'Giáp' };
    return { success: true, message: `${labelMap[cmd]} vĩnh viễn của ${char.name}: ${qty >= 0 ? '+' : ''}${qty} (hiện: ${char.permBonus[field]})` };
  }

  if (cmd === 'rs') {
    const char = await findTargetChar(targetCharId);
    if (!char) return { success: false, message: 'Chưa chọn nhân vật mục tiêu' };
    await backupChar(char, adminUserId, 'rs');
    resetCharFields(char);
    await char.save();
    return { success: true, message: `Đã reset toàn bộ tiến trình của ${char.name} về ban đầu (đã lưu bản trước đó, dùng re1 để khôi phục nếu cần)` };
  }

  if (cmd.startsWith('re')) {
    const step = parseInt(cmd.slice(2), 10) || 1; // "re1" -> 1, "re" đơn lẻ cũng coi là 1
    const char = await findTargetChar(targetCharId);
    if (!char) return { success: false, message: 'Chưa chọn nhân vật mục tiêu' };
    const backups = await CharacterBackup.find({ user: char.user }).sort('-createdAt').limit(step);
    if (backups.length < step) return { success: false, message: `Không đủ bản lưu để lùi ${step} lần (hiện có ${backups.length})` };
    const target = backups[step - 1];
    const snap = target.snapshot;
    delete snap._id; delete snap.__v; delete snap.createdAt; delete snap.updatedAt;
    Object.assign(char, snap);
    await char.save();
    await CharacterBackup.deleteMany({ _id: { $in: backups.map((b) => b._id) } });
    return { success: true, message: `Đã khôi phục ${char.name} về trạng thái trước lần reset gần nhất (${step === 1 ? '' : `lùi ${step} lần`})` };
  }

  if (cmd === 'del') {
    const [, id, userIdOrTarget, qtyRaw] = parts;
    if (!id) return { success: false, message: 'Cú pháp: del [id] [user id] [số lượng]' };
    let char = null;
    if (userIdOrTarget) {
      char = await Character.findById(userIdOrTarget).catch(() => null);
      if (!char) char = await Character.findOne({ user: userIdOrTarget }).catch(() => null);
      if (!char) {
        const u = await User.findOne({ username: userIdOrTarget }).catch(() => null);
        if (u) char = await Character.findOne({ user: u._id });
      }
    } else {
      char = await findTargetChar(targetCharId);
    }
    if (!char) return { success: false, message: `Không tìm thấy người chơi "${userIdOrTarget || ''}"` };
    const qty = Math.max(1, parseInt(qtyRaw, 10) || 999999);
    if (GD.PETS[id]) {
      const before = char.pets?.slots?.length || 0;
      char.pets.slots = (char.pets.slots || []).filter((p) => p.defId !== id);
      await char.save();
      return { success: true, message: `Đã xoá ${before - char.pets.slots.length} pet ${GD.PETS[id].name} của ${char.name}` };
    }
    const inv = char.inventory.find((i) => i.itemId === id);
    if (!inv) return { success: false, message: `${char.name} không có vật phẩm "${id}"` };
    const removed = Math.min(qty, inv.qty);
    inv.qty -= removed;
    if (inv.qty <= 0) char.inventory = char.inventory.filter((i) => i !== inv);
    // nếu món đang trang bị bị xoá hết -> tự tháo ra để tránh tham chiếu tới item không còn trong túi
    Object.entries(char.equipment || {}).forEach(([slot, itemId]) => { if (itemId === id && !char.inventory.find((i) => i.itemId === id)) char.equipment[slot] = null; });
    await char.save();
    return { success: true, message: `Đã xoá ${removed} × "${id}" của ${char.name}` };
  }

  return { success: false, message: `Không nhận diện được lệnh "${cmd}" — dùng: buff / hp / mp / damage / armor / rs / re1 / del` };
}

module.exports = { executeGmCommand };
