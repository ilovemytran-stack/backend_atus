const Guild = require('../models/Guild');

// Trước đây Guild.xp / Guild.level tồn tại trong model nhưng KHÔNG có bất kỳ route/socket nào
// từng cộng dồn hay đọc để lên cấp — đây là phần "update logic guild": hiện thực hoá đúng như
// comment gốc trong model ("cộng dồn khi thành viên diệt quái/boss").
function guildXpToNextLevel(level) {
  return Math.round(500 * Math.pow(level, 1.5));
}

// Gọi mỗi khi 1 thành viên diệt quái/boss. xpAmount nên tỉ lệ với KN nhân vật nhận được
// (map khó hơn / boss -> cộng nhiều hơn cho Bang Hội một cách tự nhiên, không cần bảng riêng).
async function grantGuildXp(char, xpAmount) {
  if (!char?.guildId || !xpAmount || xpAmount <= 0) return null;
  const guild = await Guild.findById(char.guildId);
  if (!guild) return null;

  guild.xp += Math.round(xpAmount);
  const levelsGained = [];
  while (guild.xp >= guildXpToNextLevel(guild.level)) {
    guild.xp -= guildXpToNextLevel(guild.level);
    guild.level += 1;
    guild.maxMembers += 2; // phần thưởng lên cấp: +2 chỗ thành viên mỗi cấp
    levelsGained.push(guild.level);
  }
  await guild.save();

  return {
    guildId: String(guild._id),
    level: guild.level,
    xp: guild.xp,
    xpToNext: guildXpToNextLevel(guild.level),
    maxMembers: guild.maxMembers,
    leveledUp: levelsGained, // mảng rỗng nếu chưa đủ lên cấp, dùng để client show toast
  };
}

module.exports = { guildXpToNextLevel, grantGuildXp };
