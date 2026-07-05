const Character = require('../models/Character');
const GD = require('../data/gameData');

// Phiên giao dịch lưu tạm trong bộ nhớ (không cần bền vững qua restart server)
// session: { id, userA, userB, offers: {userId:{gold,gem,items:[{itemId,kind,qty}]}}, confirmed:{userId:bool} }
module.exports = (io) => {
  const sessions = new Map();       // tradeId -> session
  const userActiveTrade = new Map(); // userId -> tradeId (mỗi người chỉ 1 giao dịch cùng lúc)
  const pendingRequests = new Map(); // targetUserId -> { fromUserId, fromName }

  function newTradeId() { return 'trade_' + Date.now() + '_' + Math.floor(Math.random() * 1e6); }

  function cleanup(tradeId) {
    const s = sessions.get(tradeId);
    if (!s) return;
    userActiveTrade.delete(s.userA);
    userActiveTrade.delete(s.userB);
    sessions.delete(tradeId);
  }

  async function ownsOffer(userId, offer) {
    const char = await Character.findOne({ user: userId });
    if (!char) return { ok: false, char: null };
    if ((char.gold || 0) < (offer.gold || 0)) return { ok: false, char };
    if ((char.gem || 0) < (offer.gem || 0)) return { ok: false, char };
    for (const it of offer.items || []) {
      const equippedIds = Object.values(char.equipment || {}).filter(Boolean);
      if (equippedIds.includes(it.itemId)) return { ok: false, char }; // không giao dịch đồ đang mặc
      const inv = char.inventory.find((i) => i.itemId === it.itemId && i.kind === it.kind);
      if (!inv || inv.qty < it.qty) return { ok: false, char };
    }
    return { ok: true, char };
  }

  function applyOfferOut(char, offer) {
    char.gold -= offer.gold || 0;
    char.gem -= offer.gem || 0;
    (offer.items || []).forEach((it) => {
      const inv = char.inventory.find((i) => i.itemId === it.itemId && i.kind === it.kind);
      if (inv) { inv.qty -= it.qty; if (inv.qty <= 0) char.inventory = char.inventory.filter((i) => i !== inv); }
    });
  }

  function applyOfferIn(char, offer) {
    char.gold += offer.gold || 0;
    char.gem += offer.gem || 0;
    (offer.items || []).forEach((it) => {
      const existing = char.inventory.find((i) => i.itemId === it.itemId && i.kind === it.kind);
      if (existing && it.kind === 'consumable') existing.qty += it.qty;
      else char.inventory.push({ itemId: it.itemId, kind: it.kind, qty: it.qty });
    });
  }

  return (socket) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) return;

    socket.on('trade_request', async ({ toUserId, fromName }) => {
      if (!toUserId || toUserId === userId) return;
      if (userActiveTrade.has(userId)) { socket.emit('trade_error', { message: 'Bạn đang trong 1 giao dịch khác' }); return; }
      const me = await Character.findOne({ user: userId }).populate('friends.character', 'user');
      const isFriend = me?.friends.some((f) => String(f.character?.user) === String(toUserId));
      if (!isFriend) { socket.emit('trade_error', { message: 'Chỉ có thể giao dịch với bạn bè' }); return; }
      pendingRequests.set(toUserId, { fromUserId: userId, fromName: fromName || 'Người chơi' });
      io.to(`user_${toUserId}`).emit('trade_request_received', { fromUserId: userId, fromName: fromName || 'Người chơi' });
    });

    socket.on('trade_decline', ({ toUserId }) => {
      pendingRequests.delete(userId);
      io.to(`user_${toUserId}`).emit('trade_declined', { byUserId: userId });
    });

    socket.on('trade_accept', ({ fromUserId }) => {
      const pending = pendingRequests.get(userId);
      if (!pending || pending.fromUserId !== fromUserId) { socket.emit('trade_error', { message: 'Lời mời đã hết hạn' }); return; }
      pendingRequests.delete(userId);
      if (userActiveTrade.has(userId) || userActiveTrade.has(fromUserId)) { socket.emit('trade_error', { message: 'Một trong hai đang giao dịch dở' }); return; }
      const tradeId = newTradeId();
      const session = { id: tradeId, userA: fromUserId, userB: userId, offers: { [fromUserId]: { gold: 0, gem: 0, items: [] }, [userId]: { gold: 0, gem: 0, items: [] } }, confirmed: { [fromUserId]: false, [userId]: false } };
      sessions.set(tradeId, session);
      userActiveTrade.set(fromUserId, tradeId);
      userActiveTrade.set(userId, tradeId);
      io.to(`user_${fromUserId}`).to(`user_${userId}`).emit('trade_started', { tradeId, userA: fromUserId, userB: userId });
    });

    socket.on('trade_update_offer', ({ tradeId, gold, gem, items }) => {
      const s = sessions.get(tradeId);
      if (!s || (s.userA !== userId && s.userB !== userId)) return;
      s.offers[userId] = { gold: Math.max(0, Number(gold) || 0), gem: Math.max(0, Number(gem) || 0), items: Array.isArray(items) ? items.slice(0, 20) : [] };
      s.confirmed[s.userA] = false; s.confirmed[s.userB] = false; // đổi đồ -> reset xác nhận cả 2 bên (chống lừa đảo)
      const other = s.userA === userId ? s.userB : s.userA;
      io.to(`user_${other}`).to(`user_${userId}`).emit('trade_offer_updated', { tradeId, userId, offer: s.offers[userId], confirmed: s.confirmed });
    });

    socket.on('trade_confirm', async ({ tradeId }) => {
      const s = sessions.get(tradeId);
      if (!s || (s.userA !== userId && s.userB !== userId)) return;
      s.confirmed[userId] = true;
      const other = s.userA === userId ? s.userB : s.userA;
      io.to(`user_${other}`).to(`user_${userId}`).emit('trade_confirmed', { tradeId, userId });

      if (s.confirmed[s.userA] && s.confirmed[s.userB]) {
        // cả 2 đã xác nhận -> kiểm tra thật ở DB rồi mới chốt
        const checkA = await ownsOffer(s.userA, s.offers[s.userA]);
        const checkB = await ownsOffer(s.userB, s.offers[s.userB]);
        if (!checkA.ok || !checkB.ok) {
          s.confirmed[s.userA] = false; s.confirmed[s.userB] = false;
          io.to(`user_${s.userA}`).to(`user_${s.userB}`).emit('trade_failed', { tradeId, message: 'Một bên không còn đủ vật phẩm/tiền tệ đã đề nghị. Giao dịch bị hủy xác nhận.' });
          return;
        }
        applyOfferOut(checkA.char, s.offers[s.userA]);
        applyOfferOut(checkB.char, s.offers[s.userB]);
        applyOfferIn(checkA.char, s.offers[s.userB]);
        applyOfferIn(checkB.char, s.offers[s.userA]);
        await checkA.char.save();
        await checkB.char.save();
        io.to(`user_${s.userA}`).to(`user_${s.userB}`).emit('trade_completed', { tradeId });
        cleanup(tradeId);
      }
    });

    socket.on('trade_cancel', ({ tradeId }) => {
      const s = sessions.get(tradeId);
      if (!s || (s.userA !== userId && s.userB !== userId)) return;
      const other = s.userA === userId ? s.userB : s.userA;
      io.to(`user_${other}`).to(`user_${userId}`).emit('trade_cancelled', { tradeId, byUserId: userId });
      cleanup(tradeId);
    });

    socket.on('disconnect', () => {
      pendingRequests.delete(userId);
      const tradeId = userActiveTrade.get(userId);
      if (tradeId) {
        const s = sessions.get(tradeId);
        if (s) {
          const other = s.userA === userId ? s.userB : s.userA;
          io.to(`user_${other}`).emit('trade_cancelled', { tradeId, byUserId: userId });
        }
        cleanup(tradeId);
      }
    });
  };
};
