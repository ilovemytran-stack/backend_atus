// Multiplayer thời gian thực cho G.Legendary — có hỗ trợ khu vực (zone) trong mỗi map.
const { getZoneRoom, pickZone, zoneCounts } = require('./onlineRegistry');
const Character = require('../models/Character');

module.exports = (io) => {
  const socketMap = new Map(); // socket.id -> { userId, mapId, zone }
  const roomOf = (mapId, zone) => `game_${mapId}_z${zone}`;

  return (socket) => {
    const userId = socket.handshake.auth.userId;
    socket.join(`user_${userId}`);
    async function syncGuildRoom() {
      try {
        const c = await Character.findOne({ user: userId }).select('guildId');
        Array.from(socket.rooms).forEach((r) => { if (r.startsWith('guild_')) socket.leave(r); });
        if (c?.guildId) socket.join(`guild_${c.guildId}`);
      } catch { /* ignore */ }
    }
    syncGuildRoom();
    // Gọi lại ngay sau khi tạo/tham gia/rời Bang Hội (qua REST) để không cần reload trang mới chat được
    socket.on('game_refresh_guild_room', syncGuildRoom);

    function leaveCurrentZone(sock) {
      const prev = socketMap.get(sock.id);
      if (!prev) return;
      const room = getZoneRoom(prev.mapId, prev.zone);
      room.delete(userId);
      sock.leave(roomOf(prev.mapId, prev.zone));
      sock.to(roomOf(prev.mapId, prev.zone)).emit('game_player_left', { userId });
      socketMap.delete(sock.id);
    }

    function doJoin(mapId, zoneWanted, player, opts = {}) {
      leaveCurrentZone(socket);
      const { minZone = 1, maxZone = 10 } = opts;
      let zone = zoneWanted;
      const wantedRoom = zone ? getZoneRoom(mapId, zone) : null;
      if (!zone || (wantedRoom && wantedRoom.size >= 10)) zone = pickZone(mapId, { minZone, maxZone });

      socket.join(roomOf(mapId, zone));
      const room = getZoneRoom(mapId, zone);
      room.set(userId, { userId, ...player });
      socketMap.set(socket.id, { userId, mapId, zone });

      socket.emit('game_zone_assigned', { mapId, zone });
      socket.emit('game_players_in_map', { players: Array.from(room.values()).filter((p) => p.userId !== userId) });
      socket.to(roomOf(mapId, zone)).emit('game_player_joined', { player: room.get(userId) });
    }

    socket.on('game_join_map', ({ mapId, zone, player, minZone, maxZone }) => {
      if (!userId || !mapId || !player) return;
      doJoin(mapId, zone, player, { minZone, maxZone });
    });

    socket.on('game_change_zone', ({ mapId, zone }) => {
      const cur = socketMap.get(socket.id);
      if (!cur || cur.mapId !== mapId) return;
      const room = getZoneRoom(mapId, cur.zone);
      const player = room.get(userId);
      if (!player) return;
      doJoin(mapId, zone, player);
    });

    socket.on('game_zone_list_request', ({ mapId }) => {
      socket.emit('game_zone_list', { mapId, zones: zoneCounts(mapId) });
    });

    socket.on('game_move', ({ mapId, x, y, dir, moving }) => {
      const cur = socketMap.get(socket.id);
      if (!cur || cur.mapId !== mapId) return;
      const room = getZoneRoom(mapId, cur.zone);
      const p = room.get(userId);
      if (!p) return;
      p.x = x; p.y = y; p.dir = dir; p.moving = moving;
      socket.to(roomOf(mapId, cur.zone)).emit('game_player_moved', { userId, x, y, dir, moving });
    });

    socket.on('game_attack', ({ mapId, targetType, targetId, skillId }) => {
      const cur = socketMap.get(socket.id);
      if (!cur || cur.mapId !== mapId) return;
      socket.to(roomOf(mapId, cur.zone)).emit('game_player_attacked', { userId, targetType, targetId, skillId });
    });

    socket.on('game_chat', ({ mapId, text }) => {
      const cur = socketMap.get(socket.id);
      if (!cur || cur.mapId !== mapId || !text || !text.trim()) return;
      const room = getZoneRoom(mapId, cur.zone);
      const p = room.get(userId);
      io.to(roomOf(mapId, cur.zone)).emit('game_chat_message', { userId, name: p?.name || '???', text: text.trim().slice(0, 140) });
    });

    // Chat Thế Giới: phát cho TOÀN BỘ người chơi đang online, không giới hạn theo map/khu vực
    socket.on('game_world_chat', ({ text }) => {
      if (!text || !text.trim()) return;
      const cur = socketMap.get(socket.id);
      const p = cur ? getZoneRoom(cur.mapId, cur.zone).get(userId) : null;
      io.emit('game_world_chat_message', { userId, name: p?.name || '???', text: text.trim().slice(0, 140), at: Date.now() });
    });

    // Chat Bang Hội: chỉ phát cho thành viên cùng bang (room 'guild_{id}' đã join sẵn lúc connect)
    socket.on('game_guild_chat', async ({ text }) => {
      if (!text || !text.trim()) return;
      try {
        const char = await Character.findOne({ user: userId }).select('guildId name');
        if (!char?.guildId) return;
        io.to(`guild_${char.guildId}`).emit('game_guild_chat_message', { userId, name: char.name, text: text.trim().slice(0, 140), at: Date.now() });
      } catch { /* ignore */ }
    });

    // Chat Bang Hội: chỉ thành viên cùng Bang Hội (phòng riêng, cập nhật realtime khi vào/rời bang) nhận được
    socket.on('game_guild_chat', ({ text }) => {
      const guildRoom = [...socket.rooms].find((r) => r.startsWith('guild_'));
      if (!text || !text.trim() || !guildRoom) return;
      const cur = socketMap.get(socket.id);
      const p = cur ? getZoneRoom(cur.mapId, cur.zone).get(userId) : null;
      io.to(guildRoom).emit('game_guild_chat_message', { userId, name: p?.name || '???', text: text.trim().slice(0, 140), at: Date.now() });
    });

    socket.on('game_leave_map', () => leaveCurrentZone(socket));
    socket.on('disconnect', () => leaveCurrentZone(socket));
  };
};
