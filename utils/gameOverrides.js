const GD = require('../data/gameData');

// "Bảng" ảo cho từng category — trỏ THẲNG vào object đang chạy trong bộ nhớ của gameData.js (KHÔNG
// copy), nên Object.assign(entity, patch) sẽ có hiệu lực NGAY LẬP TỨC cho toàn bộ server, không cần
// khởi động lại. BOSSES là mảng (không phải object theo id) nên xử lý riêng bằng .find().
const CATEGORY_STORE = {
  weapons: () => GD.WEAPONS,
  armor: () => GD.ARMOR,
  consumables: () => GD.CONSUMABLES,
  monsters: () => GD.MONSTERS,
  minions: () => GD.MINIONS,
  specialItems: () => GD.SPECIAL_ITEMS,
  superItems: () => GD.SUPER_ITEMS,
  pets: () => GD.PETS,
};
const CATEGORY_LABEL = {
  weapons: 'Vũ Khí', armor: 'Giáp', consumables: 'Vật Phẩm Tiêu Hao', monsters: 'Quái Vật',
  bosses: 'Boss / Thần Hộ Vệ', minions: 'Thú Triệu Hồi', specialItems: 'Đồ Đặc Biệt',
  superItems: 'Đồ Siêu Cấp', pets: 'Pet',
};
const CATEGORIES = Object.keys(CATEGORY_LABEL);

function getEntity(category, itemId) {
  if (category === 'bosses') return GD.BOSSES.find((b) => b.id === itemId) || null;
  const store = CATEGORY_STORE[category]?.();
  return store ? (store[itemId] || null) : null;
}

function listCategory(category) {
  if (category === 'bosses') return GD.BOSSES.map((b) => ({ ...b }));
  const store = CATEGORY_STORE[category]?.();
  return store ? Object.values(store).map((e) => ({ ...e })) : [];
}

// Áp 1 patch vào ĐÚNG entity đang chạy trong bộ nhớ. Chỉ nhận field kiểu number/string/boolean ở mức
// gốc (không cho sửa field lồng nhau như "skills": [...] qua đường này, tránh làm hỏng cấu trúc) — cho
// phép field MỚI không có sẵn (vd thêm statMult cho boss) miễn giá trị hợp lệ.
function applyPatch(category, itemId, patch) {
  const entity = getEntity(category, itemId);
  if (!entity) return null;
  Object.entries(patch || {}).forEach(([k, v]) => {
    if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') entity[k] = v;
  });
  return entity;
}

// Boss không có field hp/atk/def phẳng (được TÍNH từ công thức guardianBossStatsFor/megaBossBaseStatsFor
// theo continent+level), nên cho admin 1 hệ số nhân riêng thay vì sửa trực tiếp — statMult mặc định
// {hp:1,atk:1,def:1} nếu chưa từng chỉnh; nhân vào ngay bên trong 2 hàm tính đó (xem gameData.js).
function bossStatMult(bossId) {
  const b = GD.BOSSES.find((x) => x.id === bossId);
  return (b && b.statMult) || { hp: 1, atk: 1, def: 1 };
}

async function loadOverridesFromDB() {
  const GameConfigOverride = require('../models/GameConfigOverride');
  const rows = await GameConfigOverride.find();
  let applied = 0;
  rows.forEach((r) => { if (applyPatch(r.category, r.itemId, r.patch)) applied += 1; });
  console.log(`[gameOverrides] Đã áp ${applied}/${rows.length} override đã lưu từ DB vào gameData.`);
}

module.exports = { CATEGORY_LABEL, CATEGORIES, getEntity, listCategory, applyPatch, bossStatMult, loadOverridesFromDB };
