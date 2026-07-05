// Đăng ký người chơi theo map + khu vực (zone), dùng chung giữa gameSocket, worldEvents, và route zone
// Cấu trúc: Map<mapId, Map<zone(1-10), Map<userId, playerData>>>
const ZONE_CAP = 10;
const ZONE_MAX = 10;
const mapZones = new Map();

function getZoneRoom(mapId, zone) {
  if (!mapZones.has(mapId)) mapZones.set(mapId, new Map());
  const zones = mapZones.get(mapId);
  if (!zones.has(zone)) zones.set(zone, new Map());
  return zones.get(zone);
}

// tìm khu vực đầu tiên còn chỗ (1..maxZone), mặc định xét cả 10 khu, có thể giới hạn dải (vd god chỉ khu 1-5)
function pickZone(mapId, { minZone = 1, maxZone = ZONE_MAX } = {}) {
  const zones = mapZones.get(mapId);
  for (let z = minZone; z <= maxZone; z++) {
    const room = zones?.get(z);
    if (!room || room.size < ZONE_CAP) return z;
  }
  return maxZone; // hết chỗ -> vẫn cho vào khu cuối (ưu tiên chơi được hơn là chặn cứng)
}

function zoneCounts(mapId) {
  const zones = mapZones.get(mapId);
  const out = [];
  for (let z = 1; z <= ZONE_MAX; z++) out.push({ zone: z, count: zones?.get(z)?.size || 0, cap: ZONE_CAP });
  return out;
}

function playersInZone(mapId, zone) { return Array.from(getZoneRoom(mapId, zone).values()); }
function userIdsInZone(mapId, zone) { return Array.from(getZoneRoom(mapId, zone).keys()); }

// giữ tương thích ngược cho code cũ gọi playersInMap/userIdsInMap (gộp toàn bộ khu vực của map đó)
function playersInMap(mapId) {
  const zones = mapZones.get(mapId); if (!zones) return [];
  return Array.from(zones.values()).flatMap((room) => Array.from(room.values()));
}
function userIdsInMap(mapId) {
  const zones = mapZones.get(mapId); if (!zones) return [];
  return Array.from(zones.values()).flatMap((room) => Array.from(room.keys()));
}

module.exports = { ZONE_CAP, ZONE_MAX, mapZones, getZoneRoom, pickZone, zoneCounts, playersInZone, userIdsInZone, playersInMap, userIdsInMap };
