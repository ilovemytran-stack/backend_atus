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
  let boss = null;              // { mapId, zone, continentId, base, form, singleFormMode, hp, maxHp, atk, def, spawnedAt, lastActionAt, damageBy: Map }
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

  function eligibleBossMaps() { return GD.MAPS.filter((m) => m.megaBossEligible); }

  function spawnBoss() {
    const eligible = eligibleBossMaps();
    if (!eligible.length) return;
    const map = eligible[Math.floor(Math.random() * eligible.length)];
    const continent = continentOf(map.continentId);
    const base = GD.megaBossBaseStatsFor(continent);
    const singleFormMode = map.role === 'boss'; // map 5 của lục địa bầu trời (Celestia) -> khóa 1 dạng
    const form = singleFormMode ? (1 + Math.floor(Math.random() * 5)) : 1; // singleForm: random 1 trong 5 dạng cố định
    // map 'god': chỉ xuất hiện trong 5 khu vực đầu tiên | map 'boss' (celestia_5): mặc định khu 1
    const zone = map.role === 'god' ? (1 + Math.floor(Math.random() * 5)) : 1;
    const fs = GD.megaBossFormStats(base, form);
    boss = {
      mapId: map.id, zone, continentId: continent.id, base, form, singleFormMode,
      hp: fs.hp, maxHp: fs.hp, atk: fs.atk, def: fs.def,
      spawnedAt: Date.now(), lastActionAt: Date.now(), damageBy: new Map(),
    };
    io.to(roomOf(map.id, zone)).emit('boss_spawned', { mapId: map.id, zone, form, hp: boss.hp, maxHp: boss.maxHp, singleFormMode });
  }

  function despawnBoss(reason) {
    if (!boss) return;
    io.to(roomOf(boss.mapId, boss.zone)).emit('boss_despawned', { reason });
    boss = null;
    bossNextSpawn = Date.now() + GD.MEGA_BOSS_SPAWN_INTERVAL_MS;
  }

  async function killBossReward() {
    const contributors = Array.from(boss.damageBy.entries());
    const mapId = boss.mapId, zone = boss.zone;
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
        await user.save(); await char.save();
        io.to(`user_${uid}`).emit('boss_kill_reward', { vipCoin: GD.MEGA_BOSS_KILL_REWARD_VIPCOIN, drops });
      } catch (e) { /* bỏ qua lỗi 1 user */ }
    }
    io.to(roomOf(mapId, zone)).emit('boss_killed', { mapId });
    boss = null;
    bossNextSpawn = Date.now() + GD.MEGA_BOSS_SPAWN_INTERVAL_MS;
  }

  // ---- vòng lặp chính: spawn/despawn theo lịch + boss ưu tiên đánh thần nếu cùng map+khu vực ----
  setInterval(async () => {
    const now = Date.now();

    GD.CONTINENTS.forEach((c) => {
      const g = gods.get(c.id);
      if (!g && now >= (godNextSpawn.get(c.id) || 0)) spawnGod(c);
      else if (g && now >= g.despawnAt) despawnGod(c.id, 'timeout');
    });

    if (!boss && now >= bossNextSpawn) spawnBoss();
    else if (boss && now - boss.lastActionAt >= GD.MEGA_BOSS_IDLE_DESPAWN_MS) despawnBoss('idle');

    if (boss) {
      const godHere = gods.get(boss.continentId);
      if (godHere && godHere.mapId === boss.mapId && godHere.zone === boss.zone && godHere.hp > 0) {
        // Boss ưu tiên đánh thần trước (chỉ khi cùng map VÀ cùng khu vực)
        const dmg = Math.max(1, Math.round(boss.atk - godHere.def * 0.5));
        godHere.hp = Math.max(0, godHere.hp - dmg);
        boss.lastActionAt = now;
        io.to(roomOf(boss.mapId, boss.zone)).emit('god_damaged', { continentId: boss.continentId, hp: godHere.hp, maxHp: godHere.maxHp, dmg });
        if (godHere.hp <= 0) despawnGod(boss.continentId, 'boss');
      }
    }
  }, 3000);

  return (socket) => {
    const userId = socket.handshake.auth.userId;

    // client gửi khi vào map+khu vực để nhận trạng thái hiện tại (thần/boss đang có mặt trong CHÍNH khu vực đó hay không)
    socket.on('world_state_request', ({ mapId, zone }) => {
      const contId = mapId?.split('_')[0];
      const g = gods.get(contId);
      if (g && g.mapId === mapId && g.zone === zone) socket.emit('god_spawned', { continentId: contId, name: g.name, color: g.color, hp: g.hp, maxHp: g.maxHp });
      if (boss && boss.mapId === mapId && boss.zone === zone) socket.emit('boss_spawned', { mapId, zone, form: boss.form, hp: boss.hp, maxHp: boss.maxHp, singleFormMode: boss.singleFormMode });
    });

    socket.on('world_boss_attack', ({ mapId, zone, dmg }) => {
      if (!boss || boss.mapId !== mapId || boss.zone !== zone) return;
      const clean = Math.max(1, Math.min(9999, Math.round(Number(dmg) || 0))); // chặn giá trị bất thường
      boss.hp = Math.max(0, boss.hp - clean);
      boss.lastActionAt = Date.now();
      boss.damageBy.set(userId, (boss.damageBy.get(userId) || 0) + clean);
      io.to(roomOf(mapId, zone)).emit('boss_hp_update', { hp: boss.hp, maxHp: boss.maxHp });
      if (boss.hp <= 0) { killBossReward(); return; }
      if (!boss.singleFormMode) {
        const newForm = formForHpRatio(boss.hp / boss.maxHp);
        if (newForm !== boss.form) {
          boss.form = newForm;
          const fs = GD.megaBossFormStats(boss.base, newForm);
          boss.atk = fs.atk; boss.def = fs.def;
          io.to(roomOf(mapId, zone)).emit('boss_form_changed', { form: newForm, hp: boss.hp, maxHp: boss.maxHp });
        }
      }
    });
  };
};
