// ============================================================================
// G.LEGENDARY — GAME STATIC DATA (single source of truth, server + client)
// Dựa trên bộ artwork: gods-skills, armor, weapons, items, continents, monsters,
// gods-overview, continents-npc, character-sprites.
// Ghi chú: tên 2 chiêu (Chiêu 1 / Chiêu 2) của 6 nhân vật chơi được KHÔNG có sẵn
// text trong bản vẽ sprite (chỉ có hình), nên được đặt tên mới cho khớp hiệu ứng
// màu sắc mô tả trong ảnh. Toàn bộ tên quái/lục địa/thần/trang bị lấy đúng bản vẽ.
// ============================================================================

const CLASSES = {
  kai: {
    id: 'kai', name: 'Kai', title: 'Đấu Sĩ - Kiếm', color: '#4FA8E8', weaponType: 'sword',
    portrait: '/assets/game/characters/kai.png',
    base: { hp: 110, atk: 13, def: 8, spd: 5, crit: 5 , ki: 100 },
    growth: { hp: 11, atk: 2.0, def: 1.0, spd: 0.25, crit: 0.15 , ki: 9 },
    skills: [
      { id: 'kai_combo', name: 'Trảm Phong', type: 'combo', desc: 'Combo 3 đòn kiếm liên hoàn.', cd: 0, mult: 1.0 },
      { id: 'kai_s1', name: 'Loạn Phong Kiếm', type: 'active', desc: 'Xoay kiếm tạo lốc gió sát thương diện rộng quanh thân.', cd: 4, kiCost: 15, mult: 1.6, maxLv: 10 },
      { id: 'kai_s2', name: 'Cuồng Phong Trảm', type: 'active', desc: 'Vung kiếm tạo vòng cung năng lượng xanh, sát thương lớn theo hướng.', cd: 9, kiCost: 30, mult: 2.6, maxLv: 10 },
    ],
  },
  ryu: {
    id: 'ryu', name: 'Ryu', title: 'Võ Sĩ', color: '#E85C3C', weaponType: 'fist',
    portrait: '/assets/game/characters/ryu.png',
    base: { hp: 100, atk: 15, def: 5, spd: 7, crit: 8 , ki: 100 },
    growth: { hp: 9, atk: 2.3, def: 0.6, spd: 0.35, crit: 0.2 , ki: 9 },
    skills: [
      { id: 'ryu_combo', name: 'Liên Hoàn Cước', type: 'combo', desc: 'Combo 3 đòn quyền cước.', cd: 0, mult: 1.05 },
      { id: 'ryu_s1', name: 'Hỏa Cước', type: 'active', desc: 'Cú đá bọc lửa, sát thương lan cháy.', cd: 4, kiCost: 15, mult: 1.7, maxLv: 10 },
      { id: 'ryu_s2', name: 'Long Viêm Phá', type: 'active', desc: 'Triệu hồi xoáy lửa hình rồng cuốn kẻ địch.', cd: 9, kiCost: 30, mult: 2.8, maxLv: 10 },
    ],
  },
  kenji: {
    id: 'kenji', name: 'Kenji', title: 'Sát Thủ - Song Đao', color: '#A65CE8', weaponType: 'dagger',
    portrait: '/assets/game/characters/kenji.png',
    base: { hp: 85, atk: 17, def: 4, spd: 8, crit: 14 , ki: 100 },
    growth: { hp: 8, atk: 2.5, def: 0.5, spd: 0.4, crit: 0.3 , ki: 9 },
    skills: [
      { id: 'kenji_combo', name: 'Song Đao Loạn Vũ', type: 'combo', desc: 'Combo 3 đòn song đao tốc độ cao.', cd: 0, mult: 1.1 },
      { id: 'kenji_s1', name: 'Ảnh Đao Sát', type: 'active', desc: 'Lướt tới chém một nhát chí mạng cao.', cd: 3.5, kiCost: 10, mult: 1.9, maxLv: 10 },
      { id: 'kenji_s2', name: 'Tử Vong Toàn Ảnh', type: 'active', desc: 'Xoay tròn song đao tạo bão ảnh sát thương liên tục.', cd: 10, kiCost: 30, mult: 2.9, maxLv: 10 },
    ],
  },
  may: {
    id: 'may', name: 'May', title: 'Trị Liệu - Hồi Phục', color: '#6CD86C', weaponType: 'staff',
    portrait: '/assets/game/characters/may.png',
    base: { hp: 90, atk: 9, def: 5, spd: 5, crit: 4 , ki: 100 },
    growth: { hp: 9, atk: 1.4, def: 0.7, spd: 0.25, crit: 0.1 , ki: 9 },
    skills: [
      { id: 'may_combo', name: 'Trượng Phong', type: 'combo', desc: 'Combo 3 đòn trượng gỗ.', cd: 0, mult: 0.9 },
      { id: 'may_s1', name: 'Sinh Mệnh Chi Ân', type: 'active', desc: 'Vòng tròn ánh sáng xanh hồi máu cho bản thân/đồng minh gần.', cd: 6, kiCost: 20, mult: 0.0, heal: 0.22, maxLv: 10 },
      { id: 'may_s2', name: 'Thiên Nhiên Bảo Hộ', type: 'active', desc: 'Tạo khiên năng lượng thiên nhiên + hồi máu diện rộng.', cd: 11, kiCost: 35, mult: 0.4, heal: 0.35, maxLv: 10 },
    ],
  },
  yuki: {
    id: 'yuki', name: 'Yuki', title: 'Võ Sĩ - Khiên', color: '#BFE8F5', weaponType: 'shield',
    portrait: '/assets/game/characters/yuki.png',
    base: { hp: 145, atk: 9, def: 15, spd: 3, crit: 3 , ki: 100 },
    growth: { hp: 15, atk: 1.2, def: 1.6, spd: 0.15, crit: 0.08 , ki: 9 },
    skills: [
      { id: 'yuki_combo', name: 'Khiên Kích', type: 'combo', desc: 'Combo 3 đòn húc khiên + đâm kiếm ngắn.', cd: 0, mult: 0.95 },
      { id: 'yuki_s1', name: 'Băng Thuẫn Hộ Thể', type: 'active', desc: 'Dựng khiên băng, giảm 40% sát thương nhận 3s + phản đòn.', cd: 8, kiCost: 25, mult: 1.2, maxLv: 10 },
      { id: 'yuki_s2', name: 'Băng Giáp Trấn Vũ', type: 'active', desc: 'Đập khiên tạo chấn động pha lê, choáng kẻ địch xung quanh.', cd: 11, kiCost: 35, mult: 2.2, maxLv: 10 },
    ],
  },
  lina: {
    id: 'lina', name: 'Lina', title: 'Võ Nữ', color: '#F55C9C', weaponType: 'fist',
    portrait: '/assets/game/characters/lina.png',
    base: { hp: 95, atk: 14, def: 6, spd: 6, crit: 7 , ki: 100 },
    growth: { hp: 9.5, atk: 2.1, def: 0.8, spd: 0.3, crit: 0.18 , ki: 9 },
    skills: [
      { id: 'lina_combo', name: 'Loan Phong Quyền', type: 'combo', desc: 'Combo 3 đòn quyền cước nhanh.', cd: 0, mult: 1.05 },
      { id: 'lina_s1', name: 'Hồng Liên Cước', type: 'active', desc: 'Cú đá bọc lửa hồng, sát thương đơn mục tiêu cao.', cd: 4, kiCost: 15, mult: 1.75, maxLv: 10 },
      { id: 'lina_s2', name: 'Tâm Ái Bạo Liệt', type: 'active', desc: 'Bùng nổ trái tim năng lượng hồng quanh thân, sát thương diện rộng.', cd: 9, kiCost: 30, mult: 2.7, maxLv: 10 },
    ],
  },
  malakai: {
    id: 'malakai', name: 'Malakai', title: 'Triệu Hồi Sư', color: '#4FD9B0', weaponType: 'tome',
    portrait: '/assets/game/characters/malakai.png',
    base: { hp: 92, atk: 7, def: 5, spd: 5, crit: 4 , ki: 100 },
    growth: { hp: 8.5, atk: 1.1, def: 0.6, spd: 0.25, crit: 0.1 , ki: 9 },
    skills: [
      { id: 'malakai_combo', name: 'Sách Trấn Áp', type: 'combo', desc: 'Combo 3 đòn phép từ cổ thư.', cd: 0, mult: 0.8 },
      { id: 'malakai_s1', name: 'Triệu Hồi Chiến Sĩ Xương', type: 'active', desc: 'Triệu hồi 1 Chiến Sĩ Xương chiến đấu cùng bạn trong 25s.', cd: 14, kiCost: 45, mult: 0, summon: 'bone_warrior', duration: 25, maxLv: 10 },
      { id: 'malakai_s2', name: 'Triệu Hồi Golem Đá', type: 'active', desc: 'Triệu hồi 1 Golem Đá cường tráng, phòng thủ cao, chiến đấu cùng bạn trong 30s.', cd: 20, kiCost: 65, mult: 0, summon: 'stone_golem', duration: 30, maxLv: 10 },
    ],
  },
};

// 4 chỉ số gốc để cộng điểm (point 7 — bảng thuộc tính)
const ATTRIBUTES = {
  str: { name: 'Sức Mạnh', desc: '+1 = +1 ATK', affects: ['atk'] },
  vit: { name: 'Thể Lực', desc: '+1 = +5 HP, +0.2 DEF', affects: ['hp', 'def'] },
  agi: { name: 'Nhanh Nhẹn', desc: '+1 = +0.3 SPD, +0.15% CRIT', affects: ['spd', 'crit'] },
  int: { name: 'Trí Tuệ', desc: '+1 = +1.2 sát thương chiêu thức', affects: ['mag'] },
};

const MAX_LEVEL = 60;
const POINTS_EVERY = 5;      // mỗi 5 cấp
const STAT_POINTS_PER_TIER = 10;
const SKILL_POINTS_PER_TIER = 2;

// ---- 8 lục địa, mỗi lục địa 3 loại quái nền (đúng bản vẽ MONSTERS) + 1 thần ----
const CONTINENTS = [
  { id: 'aurelion', idx: 1, name: 'Aurelion', title: 'Continent of Light', color: '#F5D061',
    god: { name: 'Luminos', title: 'Thần Ánh Sáng và Trật Tự', ultimate: 'Thiên Giáng Lâm', color: '#F5D061' },
    monsters: ['light_sentinel', 'celestial_archer', 'holy_priest'],
    maps: ['Luminor City', 'Silverdawn Harbor', 'Dawnwatch Fortress', 'Holy Spring Village', 'Temple of Radiance', 'Skyrise Peaks'] },
  { id: 'draconia', idx: 2, name: 'Draconia', title: 'Continent of Flame', color: '#E85C3C',
    god: { name: 'Pyragos', title: 'Thần Lửa và Chiến Tranh', ultimate: 'Hỏa Long Giáng Thế', color: '#E85C3C' },
    monsters: ['lava_hound', 'fire_elemental', 'draconic_warrior'],
    maps: ['Firegate City', 'Scorchfang Wastes', 'Dragonspine Stronghold', 'Molten Core Mines', 'Crimson Valley', 'Ashen Bastion'] },
  { id: 'verdantia', idx: 3, name: 'Verdantia', title: 'Continent of Nature', color: '#6CD86C',
    god: { name: 'Elundra', title: 'Nữ Thần Sự Sống và Tự Nhiên', ultimate: 'Thảm Thực Tinh Giác', color: '#6CD86C' },
    monsters: ['forest_spirit', 'wild_beast', 'nature_protector'],
    maps: ['Greenheart City', 'Riverbloom Town', 'Spirit Grove', 'Elven Sanctuary', 'Wildbloom Village', 'Ancient Tree Fort'] },
  { id: 'shadowfell', idx: 4, name: 'Shadowfell', title: 'Continent of Darkness', color: '#A65CE8',
    god: { name: 'Nyxaris', title: 'Thần Bóng Tối và Hỗn Loạn', ultimate: 'Hắc Vực Giáng Lâm', color: '#A65CE8' },
    monsters: ['shadow_wraith', 'dark_cultist', 'shadow_fiend'],
    maps: ['Nyxhold City', 'Duskveil Village', 'Forsaken Fortress', 'Shadowcrypt', 'Void Altar', 'Eternal Night Spire'] },
  { id: 'aquaris', idx: 5, name: 'Aquaris', title: 'Continent of the Deep', color: '#4FA8E8',
    god: { name: 'Thalassos', title: 'Thần Biển Cả và Bí Ẩn', ultimate: 'Đại Hồng Thủy', color: '#4FA8E8' },
    monsters: ['coral_guardian', 'deep_sea_hunter', 'abyss_mage'],
    maps: ['Coral Palace', 'Tidal Harbor', 'Abyssal Trench', 'Pearl Village', 'Sunken Ruins', 'Current Temple'] },
  { id: 'crystalia', idx: 6, name: 'Crystalia', title: 'Continent of Ice', color: '#BFE8F5',
    god: { name: 'Glaciera', title: 'Nữ Thần Băng Giá và Thuần Khiết', ultimate: 'Kỷ Nguyên Băng Hà', color: '#BFE8F5' },
    monsters: ['frost_wolf', 'ice_golem', 'frost_shaman'],
    maps: ['Icecrown City', 'Frostvale Town', 'Glacier Fortress', 'Snowfall Village', 'Crystal Cavern', 'Northwind Outpost'] },
  { id: 'sandoria', idx: 7, name: 'Sandoria', title: 'Continent of Sands', color: '#E8B85C',
    god: { name: 'Solaris', title: 'Thần Mặt Trời và Trí Tuệ', ultimate: 'Thần Lốc Sa Mạc', color: '#E8B85C' },
    monsters: ['sand_scorpion', 'desert_raider', 'sand_elemental'],
    maps: ['Sunspire City', 'Dunewalker Town', 'Scorched Fort', 'Oasis Village', 'Ancient Pyramid', 'Sandstorm Wastes'] },
  { id: 'celestia', idx: 8, name: 'Celestia', title: 'Continent of Sky', color: '#8FB8F0',
    god: { name: 'Aerinthia', title: 'Nữ Thần Bầu Trời và Tri Thức', ultimate: 'Thiên Đỉnh Giáng Lâm', color: '#8FB8F0' },
    monsters: ['sky_harpy', 'cloud_knight', 'storm_dragonling'],
    maps: ['Celestial City', 'Skydock Port', 'Windward Town', 'Floating Gardens', 'Stormwatch Outpost', 'Sky Temple'] },
];

// Vai trò 6 map trong 1 lục địa, áp dụng chung cho cả 8 lục địa (thiết kế mới)
// 'hub': map đầu, KHÔNG quái, chủ yếu NPC | 'A'/'B'/'C': mỗi map 1 loại quái | 'boss': map 5 | 'god': map 6 (thần linh)
const MAP_ROLES = ['hub', 'A', 'B', 'C', 'boss', 'god'];
const MAP_PROP_COUNTS = {
  celestia: [22, 12, 22, 22, 22, 22], aurelion: [22, 22, 22, 22, 22, 22], crystalia: [22, 22, 22, 22, 22, 22],
  shadowfell: [22, 22, 22, 22, 22, 22], sandoria: [22, 22, 22, 22, 22, 22], draconia: [22, 22, 22, 22, 22, 22],
  verdantia: [22, 22, 22, 22, 22, 22], aquaris: [22, 22, 22, 22, 22, 22],
};
const ZONE_MAX_PER_MAP = 10;   // point 11 mới: tối đa 10 khu vực/map
const ZONE_PLAYER_CAP = 10;    // tối đa 10 người/khu vực

function buildMaps() {
  const maps = [];
  // Map hub + map quái đầu (index 0,1) dùng CHUNG mức cấp khởi điểm của lục địa —
  // để nhân vật vừa vào lục địa (đúng cấp sàn) là đánh quái map 2 được ngay, không bị vượt cấp vô lý.
  const roleLevelStep = [0, 0, 1, 2, 3, 4];
  CONTINENTS.forEach((cont) => {
    const span = MAX_LEVEL / CONTINENTS.length; // chia đều dải cấp độ cho 8 lục địa
    const lvFloor = Math.round((cont.idx - 1) * span) + 1;
    const lvCeil = Math.round(cont.idx * span);
    const stepSize = (lvCeil - lvFloor) / 4;
    MAP_ROLES.forEach((role, i) => {
      const mapLvMin = Math.max(1, Math.round(lvFloor + roleLevelStep[i] * stepSize));
      const mapLvMax = Math.max(mapLvMin + 2, Math.round(lvFloor + (roleLevelStep[i] + 1) * stepSize));
      let monsterIds = [];
      if (role === 'hub') monsterIds = [];
      else if (role === 'A') monsterIds = [cont.monsters[0]];
      else if (role === 'B') monsterIds = [cont.monsters[1]];
      else if (role === 'C') monsterIds = [cont.monsters[2]];
      else if (role === 'boss') monsterIds = [...cont.monsters]; // + boss riêng, xem BOSSES
      else if (role === 'god') monsterIds = [];
      // Mega-boss 5 dạng: xuất hiện ở TẤT CẢ map thần linh (god) + riêng map boss của lục địa bầu trời (celestia)
      const megaBossEligible = role === 'god' || (cont.id === 'celestia' && role === 'boss');
      maps.push({
        id: `${cont.id}_${i + 1}`,
        continentId: cont.id,
        index: i + 1,
        name: cont.maps[i],
        role,
        monsterIds,
        isMixedTier: role === 'boss',
        hasBoss: role === 'boss',
        godSpawn: role === 'god', // thần linh chỉ ở khu vực đầu tiên của map này (xử lý ở tầng zone)
        megaBossEligible,
        propCount: (MAP_PROP_COUNTS[cont.id] || [])[i] ?? 0,
        levelRange: [mapLvMin, mapLvMax],
        maxMonsters: role === 'hub' || role === 'god' ? 0 : 10,
        zoneMax: ZONE_MAX_PER_MAP,
        zoneCap: ZONE_PLAYER_CAP,
      });
    });
  });
  return maps;
}
const MAPS = buildMaps();

// Boss riêng cho map 'boss' của mỗi lục địa — dùng chính vị thần hộ vệ cấp thấp hơn bản thần thật
function bossIdFor(continentId) { return `${continentId}_boss`; }

// ---- Quái (đúng tên/mô tả bản vẽ MONSTERS) ----
const MONSTERS = {
  light_sentinel: { id: 'light_sentinel', name: 'Light Sentinel', nameVN: 'Chiến Binh Ánh Sáng', continent: 'aurelion', color: '#F5D061', shape: 'knight', baseHp: 60, baseAtk: 8, baseDef: 4 },
  celestial_archer: { id: 'celestial_archer', name: 'Celestial Archer', nameVN: 'Cung Thủ Thiên Quang', continent: 'aurelion', color: '#FFF0B0', shape: 'archer', baseHp: 45, baseAtk: 10, baseDef: 2 },
  holy_priest: { id: 'holy_priest', name: 'Holy Priest', nameVN: 'Tế Tư Thánh Quang', continent: 'aurelion', color: '#FFFFFF', shape: 'caster', baseHp: 50, baseAtk: 7, baseDef: 3 },

  lava_hound: { id: 'lava_hound', name: 'Lava Hound', nameVN: 'Chó Săn Dung Nham', continent: 'draconia', color: '#FF6A3C', shape: 'beast', baseHp: 65, baseAtk: 9, baseDef: 3 },
  fire_elemental: { id: 'fire_elemental', name: 'Fire Elemental', nameVN: 'Nguyên Tố Hỏa', continent: 'draconia', color: '#FF9A3C', shape: 'caster', baseHp: 55, baseAtk: 10, baseDef: 2 },
  draconic_warrior: { id: 'draconic_warrior', name: 'Draconic Warrior', nameVN: 'Chiến Binh Hỏa Long', continent: 'draconia', color: '#B03C2C', shape: 'knight', baseHp: 70, baseAtk: 11, baseDef: 5 },

  forest_spirit: { id: 'forest_spirit', name: 'Forest Spirit', nameVN: 'Linh Hồn Rừng', continent: 'verdantia', color: '#6CD86C', shape: 'beast', baseHp: 60, baseAtk: 8, baseDef: 4 },
  wild_beast: { id: 'wild_beast', name: 'Wild Beast', nameVN: 'Thú Rừng Hoang Dã', continent: 'verdantia', color: '#4C9C4C', shape: 'beast', baseHp: 65, baseAtk: 10, baseDef: 3 },
  nature_protector: { id: 'nature_protector', name: 'Nature Protector', nameVN: 'Người Bảo Hộ Thiên Nhiên', continent: 'verdantia', color: '#2C7C3C', shape: 'caster', baseHp: 55, baseAtk: 9, baseDef: 4 },

  shadow_wraith: { id: 'shadow_wraith', name: 'Shadow Wraith', nameVN: 'Hồn Ma Bóng Tối', continent: 'shadowfell', color: '#8A5CE8', shape: 'beast', baseHp: 55, baseAtk: 11, baseDef: 2 },
  dark_cultist: { id: 'dark_cultist', name: 'Dark Cultist', nameVN: 'Tín Đồ Hắc Ám', continent: 'shadowfell', color: '#6A3CB8', shape: 'caster', baseHp: 50, baseAtk: 10, baseDef: 3 },
  shadow_fiend: { id: 'shadow_fiend', name: 'Shadow Fiend', nameVN: 'Yêu Ma Bóng Tối', continent: 'shadowfell', color: '#4A2C88', shape: 'knight', baseHp: 65, baseAtk: 12, baseDef: 4 },

  coral_guardian: { id: 'coral_guardian', name: 'Coral Guardian', nameVN: 'Vệ Thần San Hô', continent: 'aquaris', color: '#3CA8C8', shape: 'knight', baseHp: 70, baseAtk: 8, baseDef: 6 },
  deep_sea_hunter: { id: 'deep_sea_hunter', name: 'Deep Sea Hunter', nameVN: 'Thợ Săn Biển Sâu', continent: 'aquaris', color: '#2C7C9C', shape: 'beast', baseHp: 55, baseAtk: 11, baseDef: 3 },
  abyss_mage: { id: 'abyss_mage', name: 'Abyss Mage', nameVN: 'Pháp Sư Vực Thẳm', continent: 'aquaris', color: '#5C8CE8', shape: 'caster', baseHp: 50, baseAtk: 10, baseDef: 3 },

  frost_wolf: { id: 'frost_wolf', name: 'Frost Wolf', nameVN: 'Sói Băng Giá', continent: 'crystalia', color: '#BFE8F5', shape: 'beast', baseHp: 60, baseAtk: 10, baseDef: 4 },
  ice_golem: { id: 'ice_golem', name: 'Ice Golem', nameVN: 'Người Đá Băng', continent: 'crystalia', color: '#8FCFE8', shape: 'knight', baseHp: 85, baseAtk: 9, baseDef: 8 },
  frost_shaman: { id: 'frost_shaman', name: 'Frost Shaman', nameVN: 'Pháp Sư Băng Giá', continent: 'crystalia', color: '#5CB8E8', shape: 'caster', baseHp: 50, baseAtk: 11, baseDef: 3 },

  sand_scorpion: { id: 'sand_scorpion', name: 'Sand Scorpion', nameVN: 'Bọ Cạp Cát', continent: 'sandoria', color: '#E8B85C', shape: 'beast', baseHp: 60, baseAtk: 11, baseDef: 4 },
  desert_raider: { id: 'desert_raider', name: 'Desert Raider', nameVN: 'Kẻ Cướp Sa Mạc', continent: 'sandoria', color: '#C89050', shape: 'knight', baseHp: 65, baseAtk: 10, baseDef: 5 },
  sand_elemental: { id: 'sand_elemental', name: 'Sand Elemental', nameVN: 'Nguyên Tố Cát', continent: 'sandoria', color: '#D8C078', shape: 'caster', baseHp: 55, baseAtk: 9, baseDef: 4 },

  sky_harpy: { id: 'sky_harpy', name: 'Sky Harpy', nameVN: 'Harpy Trên Không', continent: 'celestia', color: '#B8CCE8', shape: 'beast', baseHp: 55, baseAtk: 11, baseDef: 3 },
  cloud_knight: { id: 'cloud_knight', name: 'Cloud Knight', nameVN: 'Kỵ Sĩ Mây', continent: 'celestia', color: '#8FB8F0', shape: 'knight', baseHp: 75, baseAtk: 10, baseDef: 6 },
  storm_dragonling: { id: 'storm_dragonling', name: 'Storm Dragonling', nameVN: 'Rồng Con Bão Tố', continent: 'celestia', color: '#6C9CE8', shape: 'beast', baseHp: 70, baseAtk: 12, baseDef: 4 },
};

// XP/vàng rơi ra dùng theo levelRange của map lúc spawn (server tính theo hàm scaleMonster bên dưới)
function scaleMonster(monsterDef, mapLevel, isBoss = false, isMixTier = false) {
  const mult = isBoss ? 6 : (isMixTier ? 1.8 : 1);
  const lvGrow = 1 + (mapLevel - 1) * 0.12;
  return {
    hp: Math.round(monsterDef.baseHp * lvGrow * mult),
    atk: Math.round(monsterDef.baseAtk * lvGrow * (isBoss ? 2.2 : (isMixTier ? 1.4 : 1))),
    def: Math.round(monsterDef.baseDef * lvGrow * (isBoss ? 1.8 : (isMixTier ? 1.3 : 1))),
    xp: Math.round((8 + mapLevel * 2) * mult),
    // Kinh tế thắt chặt hơn bản trước (theo yêu cầu "kiếm vàng ngọc khó hơn"): giảm ~35% vàng rơi
    // mỗi lượt và giảm ~45% cơ hội rơi ngọc (quái thường 0.04 -> 0.022, quái map boss 0.9 -> 0.5).
    goldMin: Math.round((1.3 + mapLevel * 0.4) * (isBoss ? 8 : 1)),
    goldMax: Math.round((4 + mapLevel * 0.8) * (isBoss ? 10 : 1)),
    gemChance: isBoss ? 0.5 : 0.022,
  };
}

// Thần Hộ Vệ (BOSSES, mỗi lục địa 1 vị, đứng ở map role='boss') — mạnh hơn hẳn quái isBoss thường,
// lấy trung bình 3 quái nền của lục địa làm gốc rồi nhân hệ số lớn.
function guardianBossStatsFor(continent, mapLevel) {
  const mons = continent.monsters.map((id) => MONSTERS[id]);
  const avgHp = mons.reduce((s, m) => s + m.baseHp, 0) / mons.length;
  const avgAtk = mons.reduce((s, m) => s + m.baseAtk, 0) / mons.length;
  const avgDef = mons.reduce((s, m) => s + m.baseDef, 0) / mons.length;
  const lvGrow = 1 + (mapLevel - 1) * 0.12;
  // statMult: hệ số nhân admin có thể chỉnh qua bảng quản trị (mặc định 1 = không đổi gì) — xem
  // utils/gameOverrides.js. Boss guardian không có field hp/atk/def phẳng để sửa trực tiếp vì các
  // số này vốn TÍNH RA từ quái trung bình của lục địa, nên dùng hệ số nhân thay vì field cố định.
  const boss = BOSSES.find((b) => b.continent === continent.id);
  const mult = (boss && boss.statMult) || { hp: 1, atk: 1, def: 1 };
  return {
    hp: Math.round(avgHp * lvGrow * 14 * mult.hp),
    atk: Math.round(avgAtk * lvGrow * 2.6 * mult.atk),
    def: Math.round(avgDef * lvGrow * 2.2 * mult.def),
    xp: Math.round((8 + mapLevel * 2) * 14),
    goldMin: Math.round((1.3 + mapLevel * 0.4) * 16),
    goldMax: Math.round((4 + mapLevel * 0.8) * 18),
    gemChance: 0.22,
  };
}

// ---- Vũ khí theo class x 5 phẩm chất (đúng bản vẽ WEAPONS, gán theo weaponType) ----
const RARITY = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const RARITY_LABEL = { common: 'Thường', uncommon: 'Hiếm', rare: 'Sử Thi', epic: 'Huyền Thoại', legendary: 'Thần Thoại' };
const RARITY_COLOR = { common: '#B8B8C8', uncommon: '#5CD86C', rare: '#4FA8E8', epic: '#A65CE8', legendary: '#F5B84C' };
const RARITY_MULT = { common: 1, uncommon: 1.35, rare: 1.8, epic: 2.4, legendary: 3.2 };
// Giới hạn cấp độ sử dụng theo phẩm chất (yêu cầu mới)
const WEAPON_REQ_LEVEL = { common: 10, uncommon: 20, rare: 30, epic: 40, legendary: 50 };
const ARMOR_REQ_LEVEL = { common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 45 };

const WEAPON_LINES = {
  sword: { names: ['Kiếm Thép Thường', 'Kiếm Sắt Phong', 'Kiếm Băng Tinh', 'Kiếm Hủy Diệt', 'Thần Kiếm Aurelion'], baseAtk: 6 },
  dagger: { names: ['Dao Ngắn Thường', 'Dao Gấm Lục Độc', 'Dao Ảnh Vũ', 'Dao Bóng Đêm', 'Song Đao Vô Cực'], baseAtk: 5 },
  shield: { names: ['Khiên Sát Thương', 'Khiên Lá Phong', 'Khiên Băng Giá', 'Khiên Huyền Ảnh', 'Khiên Thánh Quang'], baseAtk: 3, baseDef: 4 },
  staff: { names: ['Trượng Gỗ', 'Trượng Sinh Mộc', 'Trượng Thiên Nhiên', 'Trượng Thánh Ẩm', 'Trượng Thần Linh'], baseAtk: 4, baseHeal: 3 },
  fist: { names: ['Găng Luyện Thường', 'Găng Cuồng Phong', 'Găng Bão Tố', 'Găng Hủy Diệt', 'Găng Thiên Thần'], baseAtk: 6 },
  tome: { names: ['Sách Phép Cũ', 'Cổ Thư Triệu Hồi', 'Huyền Thư Vong Linh', 'Ma Thư Hắc Ám', 'Thiên Thư Triệu Hồi Thần'], baseAtk: 3, baseHeal: 1 },
};

function buildWeapons() {
  const out = {};
  Object.entries(WEAPON_LINES).forEach(([weaponType, line]) => {
    RARITY.forEach((r, i) => {
      const id = `${weaponType}_${r}`;
      out[id] = {
        id, weaponType, rarity: r, name: line.names[i],
        atk: Math.round((line.baseAtk || 0) * 3 * RARITY_MULT[r]),
        def: Math.round((line.baseDef || 0) * 3 * RARITY_MULT[r]),
        heal: Math.round((line.baseHeal || 0) * 3 * RARITY_MULT[r]),
        price: Math.round(40 * RARITY_MULT[r] ** 2.1),
        currency: i <= 1 ? 'gold' : 'gem', // common/uncommon mua bằng vàng, còn lại kim cương (point 0)
        reqLevel: WEAPON_REQ_LEVEL[r],
      };
    });
  });
  return out;
}
const WEAPONS = buildWeapons();

// ---- Trang bị 5 phẩm chất x 5 slot (đúng bản vẽ ARMORS) ----
const ARMOR_SLOTS = ['body', 'legs', 'boots', 'gloves', 'helmet'];
const ARMOR_SLOT_LABEL = { body: 'Áo Giáp', legs: 'Quần Giáp', boots: 'Giày Giáp', gloves: 'Găng Tay', helmet: 'Mũ Giáp' };
function buildArmor() {
  const out = {};
  ARMOR_SLOTS.forEach((slot) => {
    RARITY.forEach((r) => {
      const id = `${slot}_${r}`;
      const base = { body: 10, legs: 8, boots: 5, gloves: 4, helmet: 7 }[slot];
      out[id] = {
        id, slot, rarity: r, name: `${ARMOR_SLOT_LABEL[slot]} ${RARITY_LABEL[r]}`,
        def: Math.round(base * RARITY_MULT[r]),
        hp: Math.round(base * 2.2 * RARITY_MULT[r]),
        spd: slot === 'boots' ? Math.round(1.5 * RARITY_MULT[r]) : 0,
        atk: slot === 'gloves' ? Math.round(2 * RARITY_MULT[r]) : 0,
        crit: slot === 'gloves' ? +(0.4 * RARITY_MULT[r]).toFixed(1) : 0,
        price: Math.round(30 * RARITY_MULT[r] ** 2.1),
        currency: RARITY.indexOf(r) <= 1 ? 'gold' : 'gem',
        reqLevel: ARMOR_REQ_LEVEL[r],
      };
    });
  });
  return out;
}
const ARMOR = buildArmor();

// ---- Trang bị khởi điểm khi mới tạo nhân vật — không yêu cầu cấp, chỉ số dưới cả hạng Thường ----
const STARTER_WEAPON_RATIO = 0.7; // ~70% chỉ số vũ khí Thường
const STARTER_ARMOR_RATIO = 0.6;
function buildStarterGear() {
  const weapons = {};
  Object.entries(WEAPON_LINES).forEach(([weaponType]) => {
    const common = WEAPONS[`${weaponType}_common`];
    weapons[`starter_${weaponType}`] = {
      id: `starter_${weaponType}`, weaponType, rarity: 'starter', name: `${common.name} Tập Sự`,
      atk: Math.round(common.atk * STARTER_WEAPON_RATIO), def: Math.round((common.def || 0) * STARTER_WEAPON_RATIO),
      heal: Math.round((common.heal || 0) * STARTER_WEAPON_RATIO), price: 0, currency: 'gold', reqLevel: 0,
    };
  });
  const armor = {};
  ARMOR_SLOTS.forEach((slot) => {
    const common = ARMOR[`${slot}_common`];
    armor[`starter_${slot}`] = {
      id: `starter_${slot}`, slot, rarity: 'starter', name: `${ARMOR_SLOT_LABEL[slot]} Tập Sự`,
      def: Math.round(common.def * STARTER_ARMOR_RATIO), hp: Math.round(common.hp * STARTER_ARMOR_RATIO),
      spd: Math.round((common.spd || 0) * STARTER_ARMOR_RATIO), atk: Math.round((common.atk || 0) * STARTER_ARMOR_RATIO),
      crit: 0, price: 0, currency: 'gold', reqLevel: 0,
    };
  });
  return { weapons, armor };
}
const STARTER_GEAR = buildStarterGear();
RARITY_LABEL.starter = 'Tập Sự';
RARITY_COLOR.starter = '#8A8272';

// ---- Vật phẩm hồi phục / tăng cường (rút gọn từ bản vẽ ITEMS, đủ dùng NPC bán) ----
const CONSUMABLES = {
  minor_hp_potion: { id: 'minor_hp_potion', name: 'Minor HP Potion', desc: 'Hồi 20% HP', effect: { hp: 0.2 }, price: 15, currency: 'gold' },
  hp_potion: { id: 'hp_potion', name: 'HP Potion', desc: 'Hồi 40% HP', effect: { hp: 0.4 }, price: 35, currency: 'gold' },
  greater_hp_potion: { id: 'greater_hp_potion', name: 'Greater HP Potion', desc: 'Hồi 60% HP', effect: { hp: 0.6 }, price: 70, currency: 'gold' },
  mega_hp_potion: { id: 'mega_hp_potion', name: 'Mega HP Potion', desc: 'Hồi 100% HP', effect: { hp: 1.0 }, price: 140, currency: 'gold' },
  minor_ki_potion: { id: 'minor_ki_potion', name: 'Minor Ki Potion', desc: 'Hồi 25% Ki', effect: { ki: 0.25 }, price: 15, currency: 'gold' },
  ki_potion: { id: 'ki_potion', name: 'Ki Potion', desc: 'Hồi 50% Ki', effect: { ki: 0.5 }, price: 35, currency: 'gold' },
  greater_ki_potion: { id: 'greater_ki_potion', name: 'Greater Ki Potion', desc: 'Hồi 80% Ki', effect: { ki: 0.8 }, price: 65, currency: 'gold' },
  mega_ki_potion: { id: 'mega_ki_potion', name: 'Mega Ki Potion', desc: 'Hồi 100% Ki ngay lập tức', effect: { ki: 1.0 }, price: 130, currency: 'gold' },
  elixir_of_life: { id: 'elixir_of_life', name: 'Elixir of Life', desc: 'Hồi 100% HP + tăng 20% HP tối đa 600s', effect: { hp: 1.0, buffMaxHp: 0.2, buffSec: 600 }, price: 12, currency: 'gem' },
  might_potion: { id: 'might_potion', name: 'Might Potion', desc: 'Tăng 20% sát thương vật lý 300s', effect: { buffAtk: 0.2, buffSec: 300 }, price: 25, currency: 'gold' },
  swiftness_potion: { id: 'swiftness_potion', name: 'Swiftness Potion', desc: 'Tăng 15% tốc độ di chuyển 300s', effect: { buffSpd: 0.15, buffSec: 300 }, price: 20, currency: 'gold' },
  teleport_scroll: { id: 'teleport_scroll', name: 'Truyền Tống Phù', desc: 'Di chuyển ngay sang một lục địa khác mà không cần đi bộ qua các map trung gian. Mỗi lá dùng được 10 LẦN đổi lục địa (mua 1 lần dùng dần, không phải mua lại từng lượt). Di chuyển giữa các map TRONG CÙNG 1 lục địa vẫn đi bộ tự do, không cần lá này.', effect: {}, price: 15, currency: 'gem' },
  upgrade_stone_special: { id: 'upgrade_stone_special', name: 'Đá Nâng Trang Bị Đặc Biệt', desc: 'Nguyên liệu nâng cấp bộ trang bị đặc biệt (chỉ rơi từ Boss Thế Giới).', effect: {}, price: 0, currency: 'gem', dropOnly: true },
};

// Set trang bị đặc biệt rơi từ boss (point 9) — 4 món cùng bộ, đủ 4 kích hoạt hiệu ứng
const SPECIAL_SET = {
  id: 'crimson_reaper', name: 'Bộ Trang Bị Crimson Reaper', hiddenClass: 'reaper',
  desc: 'Bộ 4 món (vũ khí/áo/quần/giày) rơi ngẫu nhiên từ Boss Thế Giới. Đủ 4 món: +40% cơ hội đòn chí mạng của chiêu thức xử tử ngay mục tiêu (chỉ áp dụng PvE).',
  pieces: ['special_weapon', 'special_body', 'special_legs', 'special_boots'],
  setBonus: { executeChance: 0.4, atk: 25, def: 15, hp: 80 },
};
// Vật phẩm thật (không bán được, chỉ rơi từ Boss Thế Giới)
const SPECIAL_ITEMS = {
  special_weapon: { id: 'special_weapon', kind: 'weapon', weaponType: 'special', name: 'Lưỡi Hái Crimson Reaper', rarity: 'special', atk: 55, def: 0, price: 0, currency: 'gem', reqLevel: 0, dropOnly: true },
  special_body: { id: 'special_body', kind: 'armor', slot: 'body', name: 'Áo Choàng Crimson Reaper', rarity: 'special', def: 30, hp: 60, price: 0, currency: 'gem', reqLevel: 0, dropOnly: true },
  special_legs: { id: 'special_legs', kind: 'armor', slot: 'legs', name: 'Quần Giáp Crimson Reaper', rarity: 'special', def: 25, hp: 40, price: 0, currency: 'gem', reqLevel: 0, dropOnly: true },
  special_boots: { id: 'special_boots', kind: 'armor', slot: 'boots', name: 'Giày Crimson Reaper', rarity: 'special', def: 15, hp: 20, spd: 3, price: 0, currency: 'gem', reqLevel: 0, dropOnly: true },
};
RARITY_LABEL.special = 'Đặc Biệt';
RARITY_COLOR.special = '#E85C4C';

// ---- Thần linh (gods) & Boss Thế Giới (world boss) — chỉ số + lịch spawn ----
const GOD_SPAWN_INTERVAL_MS = (60 * 60 + 30) * 1000; // 60 phút 30 giây
const GOD_LIFESPAN_MS = 15 * 60 * 1000;               // 15 phút
const MEGA_BOSS_SPAWN_INTERVAL_MS = 45 * 60 * 1000;   // 45 phút (đúng như yêu cầu — giờ spawn 4 con cùng lúc ở 4 map cuối khác nhau nên không cần rút ngắn nữa)
const MEGA_BOSS_IDLE_DESPAWN_MS = 14 * 60 * 1000;     // 14 phút không ai đánh / không đánh ai
const GOD_GIFT_GOLD = [40, 90];
const GOD_GIFT_GEM = [2, 5];
const MEGA_BOSS_KILL_REWARD_VIPCOIN = 5;
const MEGA_BOSS_SPECIAL_DROP_CHANCE_EACH = 0.15; // 4 món x 15% = 60%

function godStatsFor(continent) {
  const hp = Math.round(500 * continent.idx * 1.6);
  const atk = Math.round(45 * continent.idx * 1.3);
  const def = Math.round(22 * continent.idx * 1.2);
  return { hp, atk, def };
}
function megaBossBaseStatsFor(continent) {
  const g = godStatsFor(continent);
  const boss = BOSSES.find((b) => b.id === 'b_chaoseraph');
  const mult = (boss && boss.statMult) || { hp: 1, atk: 1, def: 1 };
  return { hp: Math.round(g.hp * 1.45 * mult.hp), atk: Math.round(g.atk * 1.45 * mult.atk), def: Math.round(g.def * mult.def), skillCdBonus: 2.5 };
}
// form 1..5, mỗi form sau +15% sát thương / +5% giáp so với form liền trước (dồn tích)
function megaBossFormStats(base, form) {
  const mult = Math.pow(1.15, form - 1);
  const defMult = Math.pow(1.05, form - 1);
  return { hp: base.hp, atk: Math.round(base.atk * mult), def: Math.round(base.def * defMult) };
}

// Chiêu ban phước từ thắng thách đấu thần linh (mỗi 10 cấp) — kỹ năng thật, dùng được, không phải chỉ số suông
function blessingSkillFor(continent, tier) {
  return {
    id: `blessing_${continent.id}`, name: continent.god.ultimate, type: 'active', isBlessing: true,
    desc: `Phước lành của ${continent.god.name}. Bùng nổ sức mạnh thần thánh diện rộng quanh thân.`,
    cd: 18, kiCost: 55, mult: 3.0 + tier * 0.25, maxLv: 1, color: continent.god.color,
  };
}

// ---- Thú triệu hồi của Malakai (đúng bản vẽ Chiến Sĩ Xương / Golem Đá) ----
// hp/atk/def tính theo % chỉ số CHỦ NHÂN tại thời điểm triệu hồi + cộng thêm theo cấp chiêu
const MINIONS = {
  bone_warrior: {
    id: 'bone_warrior', name: 'Bone Warrior', nameVN: 'Chiến Sĩ Xương', color: '#D8D0C0', weaponType: 'sword',
    portrait: '/assets/game/summons/bone_warrior.png',
    hpPct: 0.5, hpPerLv: 9, atkPct: 0.6, atkPerLv: 1.6, defPct: 0.4, defPerLv: 0.6, speed: 82,
  },
  stone_golem: {
    id: 'stone_golem', name: 'Stone Golem', nameVN: 'Golem Đá', color: '#8FA88C', weaponType: 'fist',
    portrait: '/assets/game/summons/stone_golem.png',
    hpPct: 0.95, hpPerLv: 15, atkPct: 0.45, atkPerLv: 1.2, defPct: 1.1, defPerLv: 1.4, speed: 58,
  },
};

// ---- Boss Compendium: 10 Thần Linh Hộ Vệ (dữ liệu sẵn sàng, chưa gắn AI riêng — xem ghi chú cuối file) ----
const BOSSES = [
  { id: 'b_aurelion', continent: 'aurelion', name: 'Aurelion', title: 'Thần Ánh Sáng', element: 'Ánh Sáng', weapon: 'Kiếm Quang Thần', trait: 'Tấn công tầm xa, gây sát thương và hỗ trợ đồng minh.', skills: ['Chém Thánh Thương', 'Thiên Quang Thức', 'Quang Ảnh Liên Kích', 'Vòng Quang Hộ Thể'], ult: 'Thiên Hạ Giáng Lâm' },
  { id: 'b_umbraxia', continent: 'shadowfell', name: 'Umbraxia', title: 'Nữ Hoàng Bóng Tối', element: 'Bóng Tối', weapon: 'Trượng Hư Vô', trait: 'Gây hiệu ứng tiêu cực, hút máu và triệu hồi bóng tối.', skills: ['Hắc Ám Xé Toạc', 'Xiềng Hắc Ám', 'Bước Ảnh', 'Hắc Vực Nuốt Chửng'], ult: 'Lưỡi Hái Tử Thần' },
  { id: 'b_ignis', continent: 'draconia', name: 'Ignis', title: 'Thần Lửa Hủy Diệt', element: 'Lửa', weapon: 'Đại Đao Hỏa Diệm', trait: 'Sát thương diện rộng, đốt cháy và phá hủy phòng thủ.', skills: ['Hỏa Cầu', 'Dòng Magma Phun Trào', 'Giáp Hỏa Long', 'Hỏa Long Giáng Thế'], ult: 'Hủy Diệt Bất Tận' },
  { id: 'b_aquaris', continent: 'aquaris', name: 'Aquaris', title: 'Thần Nước Sâu Thẳm', element: 'Nước', weapon: 'Thương Tam Xoa', trait: 'Kiểm soát đám đông, phòng thủ cao và hồi phục.', skills: ['Đòn Sóng Thần', 'Dòng Chảy Sinh Mệnh', 'Xoáy Nước', 'Thủy Triều'], ult: 'Đại Hồng Thủy' },
  { id: 'b_verdantia', continent: 'verdantia', name: 'Verdantia', title: 'Thần Tự Nhiên', element: 'Gió', weapon: 'Trượng Sinh Mệnh', trait: 'Triệu hồi sinh vật, hồi phục và gây độc.', skills: ['Lưỡi Dao Gió', 'Hồi Sinh Tự Nhiên', 'Bão Lá Cuốn', 'Vòng Sinh Mệnh'], ult: 'Nộ Thần Rừng Già' },
  { id: 'b_terranos', continent: 'sandoria', name: 'Terranos', title: 'Thần Đất Kiên Cố', element: 'Đất', weapon: 'Búa Địa Tâm', trait: 'Phòng thủ cực cao, gây choáng và làm chậm.', skills: ['Đập Địa Chấn', 'Dải Đất Nhô Lên', 'Giáp Đá', 'Lốc Cát'], ult: 'Thần Lốc Sa Mạc' },
  { id: 'b_voltarion', continent: 'celestia', name: 'Voltarion', title: 'Thần Sấm Sét', element: 'Sấm', weapon: 'Thương Lôi Điện', trait: 'Tốc độ cực nhanh, gây choáng và sát thương bộc phát.', skills: ['Lôi Kích', 'Dây Lôi', 'Giáp Lôi', 'Thiên Lôi Giáng Thế'], ult: 'Phán Quyết Thiên Đình' },
  { id: 'b_glaciera', continent: 'crystalia', name: 'Glaciera', title: 'Thần Băng Giá', element: 'Băng', weapon: 'Trượng Băng Hàn', trait: 'Làm chậm, đóng băng và tăng phòng thủ.', skills: ['Tia Băng', 'Băng Gai', 'Bão Tuyết', 'Đóng Băng Vĩnh Cửu'], ult: 'Kỷ Nguyên Băng Hà' },
  { id: 'b_chaoseraph', name: 'Chaoseraph', title: 'Thần Hỗn Mang', element: 'Hỗn Mang', weapon: 'Trượng Hỗn Mang', trait: 'Tấn công hỗn hợp, biến ảo và phá hủy tất cả.', skills: ['Cầu Hồn Đọa', 'Xé Không Gian', 'Biến Ảo', 'Hắc Vortex'], ult: 'Hỗn Mang Vĩnh Hằng' },
  { id: 'b_morphiel', name: 'Morphiel', title: 'Thần Biến Ảo Vô Hình', element: 'Thay Đổi Hình Dạng', weapon: 'Song Kiếm Ảo Ảnh', trait: 'Thay đổi hình dạng, đòn đánh khó lường.',
    forms: [
      { name: 'Dạng Rồng', skills: ['Hỏa Diệm Phun Trào', 'Vồ Lửa Hủy Diệt'] },
      { name: 'Dạng Bóng Tối', skills: ['Ảnh Kích', 'Hắc Ám Nuốt Chửng'] },
      { name: 'Dạng Thú', skills: ['Vuốt Xé', 'Cuồng Nộ'] },
      { name: 'Dạng Thần', skills: ['Ánh Sáng Xuyên Thấu'] },
    ], ult: 'Phán Quyết Ảo Ảnh' },
];

// ============================================================================
// PET & HÀO QUANG (AURA) — bản cập nhật dựa trên GLG/Pet-Aura/pet-aura-system-spec.md
// Toàn bộ số liệu ở mục "chưa tự điền số" trong bản spec (Aura buff %, chênh lệch VIP/Thường,
// mult/cd từng version chiêu...) do Claude tự quyết định ở đây — dễ tìm, dễ chỉnh tay sau này.
// ============================================================================

// ---- 4 loại pet: Thường (Ghost/Wolf) và VIP (Ninja/Boy) ----
const PETS = {
  pet_ghost: { id: 'pet_ghost', name: 'Bóng Ma Nhỏ', tier: 'normal', portrait: '/assets/game/pets/pet_ghost/1.png', diePortrait: '/assets/game/pets/pet_ghost/Die.png', frameCount: 26 },
  pet_wolf: { id: 'pet_wolf', name: 'Sói Con', tier: 'normal', portrait: '/assets/game/pets/pet_wolf/1.png', diePortrait: '/assets/game/pets/pet_wolf/Die.png', frameCount: 26 },
  pet_ninja_vip: { id: 'pet_ninja_vip', name: 'Ninja Nhí', tier: 'vip', portrait: '/assets/game/pets/pet_ninja_vip/1.png', diePortrait: '/assets/game/pets/pet_ninja_vip/Die.png', frameCount: 26 },
  pet_boy_vip: { id: 'pet_boy_vip', name: 'Thiếu Niên Bí Ẩn', tier: 'vip', portrait: '/assets/game/pets/pet_boy_vip/1.png', diePortrait: '/assets/game/pets/pet_boy_vip/Die.png', frameCount: 26 },
};
// Mục 2: "VIP cao hơn Thường ~20-30%" — chọn mức giữa 25%, nhân lên TRÊN chỉ số đã đồng bộ (mục 5).
const PET_TIER_MULT = { normal: 1.0, vip: 1.25 };
const PET_DEATH_MS = 3 * 60 * 1000; // mục 4: chết 3 phút rồi tự hồi sinh
const PET_DROP_CHANCE = { normal: 0.23, vip: 0.18 }; // mục 7, rơi từ Boss ChaosLord (= b_chaoseraph)
const PET_MAX_CONTRIBUTORS = 4; // 3 dame cao nhất + 1 người kết liễu (có thể trùng)
const PET_BASIC_ATK_MULT = 1.0; // "chiêu 1" mặc định = đấm thường, dùng đúng ATK đã đồng bộ

// Skill 2 (mở khoá level 20) — 4 version ngẫu nhiên, cd lấy đúng theo Skill 2.md, mult tự quyết định
// (version càng mạnh hồi chiêu càng lâu, cùng tinh thần "v4 mạnh nhất, hồi chiêu lâu nhất").
const PET_SKILL2_VERSIONS = {
  1: { mult: 1.0, cd: 0.5 },
  2: { mult: 1.2, cd: 0.7 },
  3: { mult: 1.45, cd: 0.8 },
  4: { mult: 1.75, cd: 1.0 },
};
// Skill 3 (mở khoá level 40) — 2 version ngẫu nhiên, đúng theo Skill3.md.
// "mỗi lần cộng điểm +0.3s": pet không có điểm chiêu riêng để cộng (mục 5 nói rõ pet đồng bộ hoàn
// toàn theo người chơi, không tự cày như NRO) nên Claude quy đổi thành tự scale theo LEVEL hiện tại
// (level đã đồng bộ với người chơi) thay vì điểm cộng tay — cứ mỗi 6 level thì +0.3s, tối đa +3s.
const PET_SKILL3_VERSIONS = {
  1: { effect: 'stun', durationBase: 3, durationPerLevelStep: 0.3, levelStep: 6, maxBonus: 3, cd: 66 },
  2: { effect: 'dot', pctPerSec: 0.03, duration: 3, cd: 66 },
};
// Skill 4 (mở khoá level 60, chỉ 1 version) — đúng theo skill4.md.
const PET_SKILL4 = { duration: 40, dmgPctOfPet: 0.30, cd: 120 }; // cd 120s (2 phút) là mức Claude tự đặt cho 1 skill "cấp tối thượng"

// ---- Hào Quang (Aura) — mục 1 ----
const AURA = {
  id: 'aura_ascendant', name: 'Hào Quang Thăng Hoa',
  npcId: 'npc_quest', continentId: 'aurelion', reqLevel: 15,
  costSpecialPieces: 3, costUpgradeStones: 3,
  dialogue: 'Ta ở đây có 1 nguồn sức mạnh vô tận, hãy trao đổi với ta bằng 3 trang bị đặc biệt bất kỳ và 3 viên đá nâng cấp trang bị đặc biệt - yêu cầu level 15 trở lên.',
  // % passive khi đang sở hữu (mục "chưa tự điền số" — Claude tự quyết định mức vừa mạnh vừa không phá vỡ cân bằng hiện có)
  buff: { atkPct: 0.18, defPct: 0.18, hpPct: 0.20, critAdd: 6, lifestealPct: 0.20, energyStealPct: 0.20 },
  // Hiệu ứng đặc biệt: mỗi 6s chat "Tôn Sùng" + bản thân/người chơi & pet gần đó (không tính quái/boss) +8% sát thương
  pulse: { intervalSec: 6, buffDurationSec: 8, dmgPct: 0.08, radius: 150, chatText: 'Tôn Sùng' },
};

// ---- Bộ Trang Bị Siêu Cấp (Super Set) — GLG/Super_Set, không có spec riêng nên Claude tự thiết kế
// cơ chế: cùng khuôn với SPECIAL_SET (crimson reaper) nhưng mạnh hơn 1 bậc + có animation biến hình
// riêng khi mặc đủ bộ (equip_motion, xem client). Rơi từ CÙNG Boss ChaosLord, tỉ lệ thấp hơn special.
const SUPER_SET = {
  id: 'super_ascendant', name: 'Bộ Trang Bị Siêu Cấp Thăng Hoa', hiddenClass: 'ascendant',
  desc: 'Bộ 4 món (vũ khí/áo/quần/giày) hiếm hơn cả bộ Đặc Biệt, rơi ngẫu nhiên từ Boss ChaosLord. Đủ 4 món: +55% cơ hội đòn xử tử (PvE) + 12% toàn bộ sát thương gây ra + hiệu ứng biến hình khi trang bị đủ bộ.',
  pieces: ['super_weapon', 'super_body', 'super_legs', 'super_boots'],
  setBonus: { executeChance: 0.55, atk: 60, def: 35, hp: 160, allDmgPct: 0.12 },
  reqLevel: 40,
  equipMotionFrames: 31, equipMotionPath: '/assets/game/super-set/equip_motion',
};
const SUPER_ITEMS = {
  super_weapon: { id: 'super_weapon', kind: 'weapon', weaponType: 'special', name: 'Vũ Khí Thăng Hoa', rarity: 'super', atk: 85, def: 0, price: 0, currency: 'gem', reqLevel: 40, dropOnly: true, icon: '/assets/game/super-set/equipment_set/weapon.png' },
  super_body: { id: 'super_body', kind: 'armor', slot: 'body', name: 'Giáp Thăng Hoa', rarity: 'super', def: 45, hp: 90, price: 0, currency: 'gem', reqLevel: 40, dropOnly: true, icon: '/assets/game/super-set/equipment_set/body.png' },
  super_legs: { id: 'super_legs', kind: 'armor', slot: 'legs', name: 'Quần Giáp Thăng Hoa', rarity: 'super', def: 38, hp: 60, price: 0, currency: 'gem', reqLevel: 40, dropOnly: true, icon: '/assets/game/super-set/equipment_set/legs.png' },
  super_boots: { id: 'super_boots', kind: 'armor', slot: 'boots', name: 'Giày Thăng Hoa', rarity: 'super', def: 22, hp: 30, spd: 4, price: 0, currency: 'gem', reqLevel: 40, dropOnly: true, icon: '/assets/game/super-set/equipment_set/boots.png' },
};
RARITY_LABEL.super = 'Siêu Cấp';
RARITY_COLOR.super = '#5CE8D8';
const MEGA_BOSS_SUPER_DROP_CHANCE_EACH = 0.06; // hiếm hơn special (0.15) — đúng tinh thần "cao cấp hơn"

// ---- Giới hạn chỉ số (mục 10) — TRẦN CỨNG, không phải mục tiêu phải đạt tới ngay. Số liệu hiện tại
// (level 60, đồ Thần Thoại) còn thấp hơn trần rất nhiều, nên trần này chủ yếu để phòng khi tự tăng
// chỉ số item/boss về sau không bị vượt mất kiểm soát. Boss/Thần thường (không phải ChaosLord) dùng
// mức trần thấp hơn theo đúng khoảng "yếu hơn 25-45%/10-60% tuỳ map" — Claude lấy mốc giữa (35%) làm
// hằng số dùng chung, có thể chỉnh riêng từng map sau này nếu cần.
const STAT_CAPS = {
  HP_CHAOSLORD: 1_000_000, ATK_CHAOSLORD: 40_000, ENERGY_BOSS_GOD: 1_000_000, DEF_BOSS_GOD: 6_000,
  HP_GUARDIAN_GOD: Math.round(1_000_000 * 0.65), ATK_GUARDIAN_GOD: Math.round(40_000 * 0.65),
  HP_PLAYER: 80_000, HP_PET_VIP: 80_000, HP_PET_NORMAL: 55_000,
  KI_ALL: 70_000,
  DMG_PLAYER: 8_000, DMG_PET_VIP: 8_000, DMG_PET_NORMAL: 6_500,
  ARMOR_ALL: 2_800,
};

// ---- 48 vật phẩm mới từ GLG/Weapon-Armor-Items (17 đã đặt tên + 31 icon rời Claude tự nghĩ cơ chế) ----
// 17 món đã đặt tên (Items.md) — effect đọc theo route use-item (backend/routes/game.js) xử lý riêng
// cho nhóm liên quan tới pet (đổi pet/thay chiêu/lệnh bái sư), còn lại theo object "effect" như cũ.
const NEW_CONSUMABLES_NAMED = {
  heal_potion: { id: 'heal_potion', name: 'Hồi Máu', desc: 'Hồi 50% HP.', effect: { hp: 0.5 }, price: 30, currency: 'gold', icon: '/assets/game/items/heal_potion.png' },
  heal_potion_vip: { id: 'heal_potion_vip', name: 'Hồi Máu VIP', desc: 'Hồi ngay 100% HP + hồi thêm 5%/giây trong 5 giây.', effect: { hp: 1.0, hotPct: 0.05, hotSec: 5 }, price: 8, currency: 'gem', icon: '/assets/game/items/heal_potion_vip.png' },
  energy_potion: { id: 'energy_potion', name: 'Hồi Năng Lượng', desc: 'Hồi 50% Ki.', effect: { ki: 0.5 }, price: 30, currency: 'gold', icon: '/assets/game/items/energy_potion.png' },
  energy_potion_vip: { id: 'energy_potion_vip', name: 'Hồi Năng Lượng VIP', desc: 'Hồi ngay 100% Ki + tăng 50% tốc độ hồi Ki trong 120 giây.', effect: { ki: 1.0, buffKiRegenPct: 0.5, buffSec: 120 }, price: 8, currency: 'gem', icon: '/assets/game/items/energy_potion_vip.png' },
  exp_x2: { id: 'exp_x2', name: 'x2 EXP', desc: 'Nhân đôi EXP nhận được trong 30 phút (chỉ tác dụng với người dùng).', effect: { buffExpMult: 2, buffSec: 1800 }, price: 15, currency: 'gem', icon: '/assets/game/items/exp_x2.png' },
  exp_x3: { id: 'exp_x3', name: 'x3 EXP', desc: 'Nhân ba EXP nhận được trong 20 phút (chỉ tác dụng với người dùng).', effect: { buffExpMult: 3, buffSec: 1200 }, price: 28, currency: 'gem', icon: '/assets/game/items/exp_x3.png' },
  skill_dmg_boost: { id: 'skill_dmg_boost', name: 'Tăng Sát Thương Chiêu', desc: 'Tăng 25% sát thương gây ra bởi CHIÊU THỨC trong 300 giây.', effect: { buffSkillDmgPct: 0.25, buffSec: 300 }, price: 45, currency: 'gold', icon: '/assets/game/items/skill_dmg_boost.png' },
  all_dmg_boost: { id: 'all_dmg_boost', name: 'Tăng Toàn Bộ Sát Thương Gây Ra', desc: 'Tăng 15% TOÀN BỘ sát thương gây ra (đánh thường + chiêu) trong 300 giây.', effect: { buffAllDmgPct: 0.15, buffSec: 300 }, price: 18, currency: 'gem', icon: '/assets/game/items/all_dmg_boost.png' },
  exp_x2_pet: { id: 'exp_x2_pet', name: 'x2 EXP Cho Pet', desc: 'Cả 2 pet (nếu có) tạm thời +15% HP/ATK/DEF trong 300 giây, như đang tiến bộ nhanh hơn (pet vốn đồng bộ cấp theo bạn nên không "cày" EXP riêng — vật phẩm quy đổi thành buff chỉ số tạm thời).', effect: { buffPetStatPct: 0.15, buffSec: 300 }, price: 20, currency: 'gem', icon: '/assets/game/items/exp_x2_pet.png' },
  bai_su_token: { id: 'bai_su_token', name: 'Lệnh Bái Sư', desc: 'Mở thêm 1 ô pet (tối đa 2 pet/người chơi). Dùng 1 lần duy nhất.', effect: {}, price: 60, currency: 'gem', icon: '/assets/game/items/bai_su_token.png' },
  change_pet_1: { id: 'change_pet_1', name: 'Đổi Pet 1 (Đại Ca)', desc: 'Đổi ngẫu nhiên sang 1 trong 4 loại pet khác cho pet ở ô Đại Ca (giữ nguyên chiêu đã học).', effect: {}, price: 35, currency: 'gem', icon: '/assets/game/items/change_pet_1.png' },
  change_pet_2: { id: 'change_pet_2', name: 'Đổi Pet 2 (Tiểu Đệ)', desc: 'Đổi ngẫu nhiên sang 1 trong 4 loại pet khác cho pet ở ô Tiểu Đệ (giữ nguyên chiêu đã học).', effect: {}, price: 35, currency: 'gem', icon: '/assets/game/items/change_pet_2.png' },
  reroll_skill2_pet1: { id: 'reroll_skill2_pet1', name: 'Thay Chiêu 2 - Pet 1 (Đại Ca)', desc: 'Random lại version Chiêu 2 (V1-V4) của pet Đại Ca.', effect: {}, price: 25, currency: 'gem', icon: '/assets/game/items/reroll_skill2_pet1.png' },
  reroll_skill3_pet1: { id: 'reroll_skill3_pet1', name: 'Thay Chiêu 3 - Pet 1 (Đại Ca)', desc: 'Random lại version Chiêu 3 (V1-V2) của pet Đại Ca.', effect: {}, price: 25, currency: 'gem', icon: '/assets/game/items/reroll_skill3_generic.png' },
  reroll_skill2_pet2: { id: 'reroll_skill2_pet2', name: 'Thay Chiêu 2 - Pet 2 (Tiểu Đệ)', desc: 'Random lại version Chiêu 2 (V1-V4) của pet Tiểu Đệ.', effect: {}, price: 25, currency: 'gem', icon: '/assets/game/items/reroll_skill2_generic.png' },
  reroll_skill3_pet2: { id: 'reroll_skill3_pet2', name: 'Thay Chiêu 3 - Pet 2 (Tiểu Đệ)', desc: 'Random lại version Chiêu 3 (V1-V2) của pet Tiểu Đệ.', effect: {}, price: 25, currency: 'gem', icon: '/assets/game/items/reroll_skill3_pet2.png' },
};
// 31 icon KHÔNG có tên gốc — Claude tự nghĩ cơ chế (yêu cầu của Le Tu). Chia 4 nhóm theo hình dáng icon:
// 7 viên đá màu theo phẩm chất (r3) = đá cường hoá cộng vĩnh viễn 1 ít chỉ số; 8 icon khoáng vật/nguyên
// liệu (r4) = vật phẩm rơi ra chỉ để BÁN lấy vàng; 4 chìa khoá + rương (r5c1-4 & r6c8) = mở rương nhận
// thưởng theo tầng chìa khoá; 4 huy hiệu (r5c5-8) = trang sức cộng vĩnh viễn 1 chỉ số; còn lại (r6) là
// vật phẩm tiện ích rời.
const RARITY_GEM_TIER_BONUS = { common: 1, uncommon: 1.4, rare: 1.9, epic: 2.6, legendary: 3.4, special: 4.2, super: 5.2 };
function buildEnhancementGems() {
  const out = {};
  const tiers = [
    ['gem_common', 'common', 'Đá Cường Hoá Thường'], ['gem_uncommon', 'uncommon', 'Đá Cường Hoá Hiếm'],
    ['gem_rare', 'rare', 'Đá Cường Hoá Sử Thi'], ['gem_epic', 'epic', 'Đá Cường Hoá Huyền Thoại'],
    ['gem_legendary', 'legendary', 'Đá Cường Hoá Thần Thoại'], ['gem_special', 'special', 'Đá Cường Hoá Đặc Biệt'],
    ['gem_super', 'super', 'Đá Cường Hoá Siêu Cấp'],
  ];
  tiers.forEach(([id, tier, name]) => {
    const b = RARITY_GEM_TIER_BONUS[tier];
    out[id] = {
      id, name, desc: `Dùng 1 lần: cộng vĩnh viễn +${Math.round(2 * b)} ATK, +${Math.round(1.2 * b)} DEF, +${Math.round(8 * b)} HP cho nhân vật.`,
      effect: { permAtk: Math.round(2 * b), permDef: Math.round(1.2 * b), permHp: Math.round(8 * b) },
      price: Math.round(20 * b), currency: 'gem', icon: `/assets/game/items/${id}.png`,
    };
  });
  return out;
}
function buildMaterials() {
  const mats = [
    ['mat_herb_bundle', 'Bó Thảo Dược', 25], ['mat_gold_nugget', 'Cục Vàng Thô', 60],
    ['mat_coal', 'Đá Than', 40], ['mat_silver_ingot', 'Thỏi Bạc', 90],
    ['mat_gold_ingot', 'Thỏi Vàng', 150], ['mat_crystal_cluster', 'Cụm Pha Lê Tím', 320],
    ['mat_dragon_scale', 'Vảy Rồng', 400], ['mat_pearl', 'Ngọc Trai Vực Sâu', 380],
  ];
  const out = {};
  mats.forEach(([id, name, sellPrice]) => {
    out[id] = { id, name, desc: `Nguyên liệu quý hiếm, không dùng được — chỉ có thể bán cho NPC lấy vàng (${sellPrice} vàng).`, effect: {}, price: 0, sellPrice, currency: 'gold', dropOnly: true, icon: `/assets/game/items/${id}.png` };
  });
  return out;
}
const KEY_TIERS = {
  key_silver: { label: 'Bạc', gold: [80, 150], gem: [0, 2], matChance: 0.15 },
  key_green: { label: 'Lục', gold: [150, 280], gem: [1, 4], matChance: 0.3 },
  key_purple: { label: 'Tím', gold: [280, 500], gem: [3, 8], matChance: 0.5 },
  key_red: { label: 'Đỏ', gold: [500, 900], gem: [6, 15], matChance: 0.75, superShardChance: 0.05 },
};
function buildKeysAndChest() {
  const out = {};
  Object.entries(KEY_TIERS).forEach(([id, t]) => {
    out[id] = { id, name: `Chìa Khoá ${t.label}`, desc: `Dùng cùng 1 Rương Kho Báu để mở, phần thưởng theo tầng ${t.label}.`, effect: {}, price: 0, currency: 'gem', dropOnly: true, icon: `/assets/game/items/${id}.png` };
  });
  out.treasure_chest = { id: 'treasure_chest', name: 'Rương Kho Báu', desc: 'Cần 1 chìa khoá bất kỳ để mở — phần thưởng (vàng/ngọc/nguyên liệu) phụ thuộc tầng chìa khoá dùng.', effect: {}, price: 0, currency: 'gold', dropOnly: true, icon: '/assets/game/items/treasure_chest.png' };
  return out;
}
const TRINKET_DEFS = {
  emblem_compass: { id: 'emblem_compass', name: 'Huy Hiệu La Bàn', stat: 'permSpd', amount: 3, label: '+3 Tốc Độ' },
  emblem_shield: { id: 'emblem_shield', name: 'Huy Hiệu Khiên', stat: 'permDef', amount: 12, label: '+12 Giáp' },
  emblem_lion: { id: 'emblem_lion', name: 'Huy Hiệu Sư Tử', stat: 'permAtk', amount: 10, label: '+10 ATK' },
  emblem_eye: { id: 'emblem_eye', name: 'Huy Hiệu Con Mắt', stat: 'permCrit', amount: 2, label: '+2% Chí Mạng' },
};
function buildTrinkets() {
  const out = {};
  Object.values(TRINKET_DEFS).forEach((t) => {
    out[t.id] = { id: t.id, name: t.name, desc: `Dùng 1 lần: cộng vĩnh viễn ${t.label} cho nhân vật.`, effect: { [t.stat]: t.amount }, price: 45, currency: 'gem', icon: `/assets/game/items/${t.id}.png` };
  });
  return out;
}
const NEW_CONSUMABLES_MISC = {
  coin_pouch: { id: 'coin_pouch', name: 'Túi Vàng Bí Ẩn', desc: 'Mở ra nhận ngẫu nhiên 80-220 vàng.', effect: { randomGoldMin: 80, randomGoldMax: 220 }, price: 30, currency: 'gold', icon: '/assets/game/items/coin_pouch.png' },
  chalice: { id: 'chalice', name: 'Chén Thánh', desc: 'Hồi đầy 100% HP & Ki ngay lập tức + tăng 30% toàn bộ sát thương gây ra trong 60 giây.', effect: { hp: 1.0, ki: 1.0, buffAllDmgPct: 0.3, buffSec: 60 }, price: 20, currency: 'gem', icon: '/assets/game/items/chalice.png' },
  hourglass: { id: 'hourglass', name: 'Đồng Hồ Cát', desc: 'Đặt lại hồi chiêu (cooldown) toàn bộ chiêu thức đang có về 0 ngay lập tức.', effect: { resetCooldowns: true }, price: 22, currency: 'gem', icon: '/assets/game/items/hourglass.png' },
  horn: { id: 'horn', name: 'Tù Và Triệu Hồi', desc: 'Gọi (các) pet của bạn dịch chuyển ngay về cạnh bạn, dù đang ở đâu hoặc đang chờ hồi sinh xa.', effect: { recallPets: true }, price: 12, currency: 'gold', icon: '/assets/game/items/horn.png' },
  energy_orb: { id: 'energy_orb', name: 'Cầu Năng Lượng', desc: 'Hồi đầy 100% Ki + tăng 30% tốc độ hồi Ki trong 180 giây.', effect: { ki: 1.0, buffKiRegenPct: 0.3, buffSec: 180 }, price: 40, currency: 'gold', icon: '/assets/game/items/energy_orb.png' },
  feather_quill: { id: 'feather_quill', name: 'Bút Lông Đổi Tên', desc: 'Cho phép đổi tên nhân vật 1 lần.', effect: { renameToken: true }, price: 25, currency: 'gem', icon: '/assets/game/items/feather_quill.png' },
  ring_undying: { id: 'ring_undying', name: 'Nhẫn Bất Tử', desc: 'Kích hoạt: trong 60 giây tới, nếu nhận sát thương đáng lẽ gây tử vong thì bạn giữ lại 1 HP thay vì gục (chỉ kích hoạt 1 lần).', effect: { guardianAngelSec: 60 }, price: 35, currency: 'gem', icon: '/assets/game/items/ring_undying.png' },
};
const CONSUMABLES_PET_AURA_ITEMS = { ...NEW_CONSUMABLES_NAMED, ...buildEnhancementGems(), ...buildMaterials(), ...buildKeysAndChest(), ...buildTrinkets(), ...NEW_CONSUMABLES_MISC };
Object.assign(CONSUMABLES, CONSUMABLES_PET_AURA_ITEMS);
RARITY_COLOR.super = RARITY_COLOR.super || '#5CE8D8';

// ============================================================================
// 2 SKILL MẶC ĐỊNH cho MỌI class (không cần chọn/học, luôn có sẵn từ đầu) — nút riêng cạnh nút Đánh,
// tốn Ki để dùng. Không thuộc `skills` của CLASSES vì áp dụng chung, độc lập nhân vật đang chơi lớp nào.
// Số liệu (kiCost/cd/quãng đường/độ cao...) không có trong spec — Claude tự đặt mức vừa hữu dụng vừa
// không phá cân bằng combat hiện có (kiCost tương đương skill nhẹ nhất của class, xem CLASSES.*.skills).
// ============================================================================
const UNIVERSAL_SKILLS = {
  dash: {
    id: 'dash', name: 'Lướt', desc: 'Lướt nhanh 1 đoạn theo hướng đang di chuyển (hoặc hướng đang quay mặt nếu đứng yên) — né đòn, rút ngắn khoảng cách tới mục tiêu.',
    kiCost: 15, cd: 5, distance: 170, durationMs: 160,
  },
  fly: {
    id: 'fly', name: 'Bay', desc: 'Bật/tắt bay lên khỏi mặt đất. Tốn Ki ngay khi bật + tốn thêm theo từng giây khi đang bay; hết Ki hoặc bấm lại sẽ tự hạ cánh.',
    kiCostActivate: 10, kiDrainPerSec: 6, cd: 3, height: 56,
  },
};

const SPRITE_MANIFEST = require('./spriteManifest.json'); // characters/monsters/npc/gods/bosses/summons -> {clip: frameCount}

module.exports = {
  CLASSES, ATTRIBUTES, MAX_LEVEL, POINTS_EVERY, STAT_POINTS_PER_TIER, SKILL_POINTS_PER_TIER,
  CONTINENTS, MAPS, MAP_ROLES, MONSTERS, scaleMonster, bossIdFor,
  RARITY, RARITY_LABEL, RARITY_COLOR, RARITY_MULT, WEAPONS, ARMOR_SLOTS, ARMOR, CONSUMABLES, SPECIAL_SET, SPECIAL_ITEMS,
  MINIONS, BOSSES, WEAPON_REQ_LEVEL, ARMOR_REQ_LEVEL, STARTER_GEAR, ZONE_MAX_PER_MAP, ZONE_PLAYER_CAP,
  GOD_SPAWN_INTERVAL_MS, GOD_LIFESPAN_MS, MEGA_BOSS_SPAWN_INTERVAL_MS, MEGA_BOSS_IDLE_DESPAWN_MS,
  GOD_GIFT_GOLD, GOD_GIFT_GEM, MEGA_BOSS_KILL_REWARD_VIPCOIN, MEGA_BOSS_SPECIAL_DROP_CHANCE_EACH,
  godStatsFor, megaBossBaseStatsFor, megaBossFormStats, blessingSkillFor, guardianBossStatsFor,
  // ---- Pet & Aura & Super Set & stat caps (mới) ----
  PETS, PET_TIER_MULT, PET_DEATH_MS, PET_DROP_CHANCE, PET_MAX_CONTRIBUTORS, PET_BASIC_ATK_MULT,
  PET_SKILL2_VERSIONS, PET_SKILL3_VERSIONS, PET_SKILL4,
  AURA, SUPER_SET, SUPER_ITEMS, MEGA_BOSS_SUPER_DROP_CHANCE_EACH,
  STAT_CAPS, KEY_TIERS, TRINKET_DEFS, UNIVERSAL_SKILLS, SPRITE_MANIFEST,
};
