const Character = require('../models/Character');
const User = require('../models/User');
const GD = require('../data/gameData');
const { userIdsInZone } = require('./onlineRegistry');

const roomOf = (mapId, zone) => `game_${mapId}_z${zone}`;
const FORM_HP_STEP = 0.17; // mỗi 17% máu mất đi -> đổi 1 dạng
const GOD_ZONE = 1; // thần linh chỉ xuất hiện ở khu vực đầu tiên

function formForHpRatio(ratio) {
  const lost = 1 - ratio;
  return Math.min(5, Math.floor(lost / FORM_HP_STEP) + 1);
}

module.exports = (io) => {
  const gods = new Map();       // continentId -> { hp, maxHp, atk, def, mapId, zone, name, color, spawnedAt, despawnAt }
  const godNextSpawn = new Map(); // continentId -> epoch ms
  const bosses = new Map();     // mapId -> { mapId, zone, continentId, base, form, singleFormMode, hp, maxHp, atk, def, spawnedAt, lastActionAt, damageBy: Map }
  const BOSS_COUNT = 4;         // 4 ChaosLord xuất hiện CÙNG LÚC ở 4 map cuối khác nhau (yêu cầu)
  let bossNextSpawn = Date.now() + 90 * 1000; // spawn thử sau 90s đầu tiên server chạy (không bắt chờ đủ 45' mới thấy gì)

  GD.CONTINENTS.forEach((c, i) => godNextSpawn.set(c.id, Date.now() + 60_000 + i * 45_000)); // lệch nhau, không đồng loạt

  function continentOf(id) { return GD.CONTINENTS.find((c) => c.id === id); }

  async function grantGodGift(continent, mapId) {
    const uids = userIdsInZone(mapId, GOD_ZONE);
    for (const uid of uids) {
      try {
        const char = await Character.findOne({ user: uid });
        if (!char) continue;
        const gold = GD.GOD_GIFT_GOLD[0] + Math.floor(Math.random() * (GD.GOD_GIFT_GOLD[1] - GD.GOD_GIFT_GOLD[0] + 1));
        const gem = GD.GOD_GIFT_GEM[0] + Math.floor(Math.random() * (GD.GOD_GIFT_GEM[1] - GD.GOD_GIFT_GEM[0] + 1));
        char.gold += gold; char.gem += gem;
        await char.save();
        io.to(`user_${uid}`).emit('god_gift', { gold, gem, godName: continent.god.name });
      } catch (e) { /* bỏ qua lỗi 1 user, không chặn cả vòng lặp */ }
    }
  }

  function spawnGod(continent) {
    const stats = GD.godStatsFor(continent);
    const mapId = `${continent.id}_6`;
    const g = {
      hp: stats.hp, maxHp: stats.hp, atk: stats.atk, def: stats.def,
      mapId, zone: GOD_ZONE, continentId: continent.id, name: continent.god.name, color: continent.god.color,
      spawnedAt: Date.now(), despawnAt: Date.now() + GD.GOD_LIFESPAN_MS,
    };
    gods.set(continent.id, g);
    io.to(roomOf(mapId, GOD_ZONE)).emit('god_spawned', { continentId: continent.id, name: g.name, color: g.color, hp: g.hp, maxHp: g.maxHp });
    grantGodGift(continent, mapId);
  }

  function despawnGod(continentId, reason) {
    const g = gods.get(continentId);
    if (!g) return;
    gods.delete(continentId);
    io.to(roomOf(g.mapId, g.zone)).emit('god_despawned', { continentId, reason });
    godNextSpawn.set(continentId, Date.now() + GD.GOD_SPAWN_INTERVAL_MS);
  }

  // "map cuối" (map cuối cùng của mỗi lục địa) — role 'god' (map thứ 6, cuối chuỗi hub/A/B/C/boss/god
  // của mỗi lục địa) + map 'boss' riêng của Celestia (đã khoá cố định 1 dạng từ trước). Đây là toàn bộ
  // map "cuối" đủ mạnh để ChaosLord xuất hiện, cũng CHÍNH LÀ nơi Thần Linh thế giới ghé thăm định kỳ,
  // nên 2 bên có cơ hội chạm mặt nhau thật sự (không phải trò trùng hợp).
  function eligibleBossMaps() { return GD.MAPS.filter((m) => m.megaBossEligible); }

  function spawnBosses() {
    const eligible = eligibleBossMaps();
    if (!eligible.length) return;
    const shuffled = eligible.slice().sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, Math.min(BOSS_COUNT, shuffled.length));
    const spawnedList = [];
    picks.forEach((map) => {
      const continent = continentOf(map.continentId);
      const base = GD.megaBossBaseStatsFor(continent);
      const singleFormMode = map.role === 'boss'; // map 5 của lục địa bầu trời (Celestia) -> khóa 1 dạng
      const form = singleFormMode ? (1 + Math.floor(Math.random() * 5)) : 1;
      const zone = map.role === 'god' ? (1 + Math.floor(Math.random() * 5)) : 1;
      const fs = GD.megaBossFormStats(base, form);
      const b = {
        mapId: map.id, zone, continentId: continent.id, base, form, singleFormMode,
        hp: fs.hp, maxHp: fs.hp, atk: fs.atk, def: fs.def,
        spawnedAt: Date.now(), lastActionAt: Date.now(), damageBy: new Map(),
      };
      bosses.set(map.id, b);
      io.to(roomOf(map.id, zone)).emit('boss_spawned', { mapId: map.id, zone, form: b.form, hp: b.hp, maxHp: b.maxHp, singleFormMode });
      spawnedList.push({ mapId: map.id, mapName: map.name, continentName: continent.name });
    });
    // thông báo toàn server 1 lần, liệt kê đủ 4 map — để ai cũng biết cả 4 vị trí dù không đứng đúng map/khu vực
    io.emit('world_boss_alert', { type: 'spawned', locations: spawnedList });
  }

  function despawnBoss(mapId, reason) {
    const b = bosses.get(mapId);
    if (!b) return;
    io.to(roomOf(b.mapId, b.zone)).emit('boss_despawned', { mapId, reason });
    io.emit('world_boss_alert', { type: 'despawned', mapId, reason });
    bosses.delete(mapId);
    if (bosses.size === 0) bossNextSpawn = Date.now() + GD.MEGA_BOSS_SPAWN_INTERVAL_MS; // cả 4 con đều đã hết mới tính giờ hồi tiếp theo
  }

  // Pet vừa được cấp mà char đã ở level >= mốc mở khoá (VD: rơi khi đã 45 level) thì roll ngay
  // skill tương ứng thay vì để trống tới lần lên cấp tiếp theo mới có (đồng bộ với syncPetProgression
  // trong routes/game.js — 2 nơi cùng logic vì worldEvents.js không import trực tiếp file route).
  function rollNewPetSkills(char, pet) {
    if (char.level >= 20 && pet.skill2Version == null) pet.skill2Version = 1 + Math.floor(Math.random() * 4);
    if (char.level >= 40 && pet.skill3Version == null) pet.skill3Version = 1 + Math.floor(Math.random() * 2);
    if (char.level >= 60) pet.hasSkill4 = true;
  }

  // mục 7: Boss ChaosLord (= b_chaoseraph, boss thế giới 5 dạng) rơi Pet — CHỈ cho 3 người gây dame
  // cao nhất + người kết liễu (dedup nếu trùng). Bộ Trang Bị Siêu Cấp thì rơi cho MỌI người tham gia,
  // cùng cơ chế như đá nâng cấp/bộ Đặc Biệt hiện có, chỉ khác tỉ lệ thấp hơn.
  async function killBossReward(mapId, killerUserId) {
    const boss = bosses.get(mapId);
    if (!boss) return;
    const contributors = Array.from(boss.damageBy.entries());
    const zone = boss.zone;
    const top3 = contributors.slice().sort((a, b) => b[1] - a[1]).slice(0, 3).map(([uid]) => uid);
    const petEligible = new Set(top3);
    if (killerUserId) petEligible.add(killerUserId);

    for (const [uid] of contributors) {
      try {
        const user = await User.findById(uid);
        const char = await Character.findOne({ user: uid });
        if (!user || !char) continue;
        user.vipCoin = (user.vipCoin || 0) + GD.MEGA_BOSS_KILL_REWARD_VIPCOIN;
        char.inventory.push({ itemId: 'upgrade_stone_special', kind: 'consumable', qty: 1 });
        const drops = [];
        GD.SPECIAL_SET.pieces.forEach((itemId) => {
          if (Math.random() < GD.MEGA_BOSS_SPECIAL_DROP_CHANCE_EACH) {
            const def = GD.SPECIAL_ITEMS[itemId];
            char.inventory.push({ itemId, kind: def.kind, qty: 1 });
            drops.push(itemId);
          }
        });
        GD.SUPER_SET.pieces.forEach((itemId) => {
          if (Math.random() < GD.MEGA_BOSS_SUPER_DROP_CHANCE_EACH) {
            const def = GD.SUPER_ITEMS[itemId];
            char.inventory.push({ itemId, kind: def.kind, qty: 1 });
            drops.push(itemId);
          }
        });

        let petGained = null;
        if (petEligible.has(uid)) {
          char.pets = char.pets || { slots: [], slot2Unlocked: false };
          const rolls = [];
          if (Math.random() < GD.PET_DROP_CHANCE.normal) rolls.push(Math.random() < 0.5 ? 'pet_ghost' : 'pet_wolf');
          if (Math.random() < GD.PET_DROP_CHANCE.vip) rolls.push(Math.random() < 0.5 ? 'pet_ninja_vip' : 'pet_boy_vip');
          for (const defId of rolls) {
            const hasSlot1 = char.pets.slots.length > 0;
            const hasSlot2 = char.pets.slots.length > 1;
            if (!hasSlot1) {
              const pet = { defId, mode: 'def', skill2Version: null, skill3Version: null, hasSkill4: false, deadUntil: null, obtainedAt: new Date() };
              rollNewPetSkills(char, pet);
              char.pets.slots.push(pet);
              petGained = defId; drops.push(`pet:${defId}`);
            } else if (char.pets.slot2Unlocked && !hasSlot2) {
              const pet = { defId, mode: 'def', skill2Version: null, skill3Version: null, hasSkill4: false, deadUntil: null, obtainedAt: new Date() };
              rollNewPetSkills(char, pet);
              char.pets.slots.push(pet);
              petGained = defId; drops.push(`pet:${defId}`);
            } // đã đủ pet / chưa mở ô 2 -> roll trúng cũng không nhận thêm được (không có ô chứa)
          }
        }

        await user.save(); await char.save();
        io.to(`user_${uid}`).emit('boss_kill_reward', { vipCoin: GD.MEGA_BOSS_KILL_REWARD_VIPCOIN, drops, petGained });
      } catch (e) { /* bỏ qua lỗi 1 user */ }
    }
    io.to(roomOf(mapId, zone)).emit('boss_killed', { mapId });
    bosses.delete(mapId);
    if (bosses.size === 0) bossNextSpawn = Date.now() + GD.MEGA_BOSS_SPAWN_INTERVAL_MS;
  }

  // ---- vòng lặp chính: spawn/despawn theo lịch + ChaosLord CHIẾN ĐẤU THẬT (2 chiều) với Thần nếu cùng map+khu vực ----
  setInterval(async () => {
    const now = Date.now();

    GD.CONTINENTS.forEach((c) => {
      const g = gods.get(c.id);
      if (!g && now >= (godNextSpawn.get(c.id) || 0)) spawnGod(c);
      else if (g && now >= g.despawnAt) despawnGod(c.id, 'timeout');
    });

    if (bosses.size === 0 && now >= bossNextSpawn) spawnBosses();
    bosses.forEach((boss, mapId) => {
      if (now - boss.lastActionAt >= GD.MEGA_BOSS_IDLE_DESPAWN_MS) { despawnBoss(mapId, 'idle'); return; }
      const godHere = gods.get(boss.continentId);
      if (godHere && godHere.mapId === boss.mapId && godHere.zone === boss.zone && godHere.hp > 0) {
        // Chiến đấu THẬT 2 chiều mỗi 3s: ChaosLord đánh Thần VÀ Thần đánh trả lại (trước đây chỉ 1 chiều
        // boss đánh thần, thần đứng chịu trận) — người chơi đứng xem/tham gia đều thấy 2 thanh máu cùng giảm.
        const dmgToGod = Math.max(1, Math.round(boss.atk - godHere.def * 0.5));
        const dmgToBoss = Math.max(1, Math.round(godHere.atk - boss.def * 0.5));
        godHere.hp = Math.max(0, godHere.hp - dmgToGod);
        boss.hp = Math.max(0, boss.hp - dmgToBoss);
        boss.lastActionAt = now;
        io.to(roomOf(boss.mapId, boss.zone)).emit('god_damaged', { continentId: boss.continentId, hp: godHere.hp, maxHp: godHere.maxHp, dmg: dmgToGod });
        io.to(roomOf(boss.mapId, boss.zone)).emit('boss_hp_update', { mapId, hp: boss.hp, maxHp: boss.maxHp });
        io.to(roomOf(boss.mapId, boss.zone)).emit('boss_vs_god_clash', { mapId, continentId: boss.continentId, godName: godHere.name, dmgToGod, dmgToBoss, godHp: godHere.hp, bossHp: boss.hp });
        if (godHere.hp <= 0) despawnGod(boss.continentId, 'boss');
        if (boss.hp <= 0) despawnBoss(mapId, 'god'); // ChaosLord thua Thần -> không ai nhận thưởng (không phải người chơi hạ được)
      }
    });
  }, 3000);

  return (socket) => {
    const userId = socket.handshake.auth.userId;

    // client gửi khi vào map+khu vực để nhận trạng thái hiện tại (thần/boss đang có mặt trong CHÍNH khu vực đó hay không)
    socket.on('world_state_request', ({ mapId, zone }) => {
      const contId = mapId?.split('_')[0];
      const g = gods.get(contId);
      if (g && g.mapId === mapId && g.zone === zone) socket.emit('god_spawned', { continentId: contId, name: g.name, color: g.color, hp: g.hp, maxHp: g.maxHp });
      const b = bosses.get(mapId);
      if (b && b.zone === zone) socket.emit('boss_spawned', { mapId, zone, form: b.form, hp: b.hp, maxHp: b.maxHp, singleFormMode: b.singleFormMode });
    });

    // Ai cũng xem được CẢ 4 boss đang ở đâu, dù không đứng đúng map (dùng cho mục Thông Báo)
    socket.on('world_boss_status_request', () => {
      const list = Array.from(bosses.values()).map((b) => {
        const continent = continentOf(b.continentId);
        const map = GD.MAPS.find((m) => m.id === b.mapId);
        return { mapId: b.mapId, zone: b.zone, mapName: map?.name, continentName: continent?.name, form: b.form, hp: b.hp, maxHp: b.maxHp };
      });
      socket.emit('world_boss_status', { active: list.length > 0, bosses: list });
    });

    socket.on('world_boss_attack', ({ mapId, zone, dmg }) => {
      const boss = bosses.get(mapId);
      if (!boss || boss.zone !== zone) return;
      const clean = Math.max(1, Math.min(9999, Math.round(Number(dmg) || 0))); // chặn giá trị bất thường
      boss.hp = Math.max(0, boss.hp - clean);
      boss.lastActionAt = Date.now();
      boss.damageBy.set(userId, (boss.damageBy.get(userId) || 0) + clean);
      io.to(roomOf(mapId, zone)).emit('boss_hp_update', { mapId, hp: boss.hp, maxHp: boss.maxHp });
      if (boss.hp <= 0) { killBossReward(mapId, userId); return; }
      if (!boss.singleFormMode) {
        const newForm = formForHpRatio(boss.hp / boss.maxHp);
        if (newForm !== boss.form) {
          boss.form = newForm;
          const fs = GD.megaBossFormStats(boss.base, newForm);
          boss.atk = fs.atk; boss.def = fs.def;
          io.to(roomOf(mapId, zone)).emit('boss_form_changed', { mapId, form: newForm, hp: boss.hp, maxHp: boss.maxHp });
        }
      }
    });
  };
};
