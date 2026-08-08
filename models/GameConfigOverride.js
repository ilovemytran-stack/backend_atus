const mongoose = require('mongoose');

// Toàn bộ item/quái/boss/pet... trong game vốn là dữ liệu TĨNH nằm trong file
// backend/data/gameData.js (không phải document MongoDB) — để admin sửa được
// giá/máu/giáp... mà KHÔNG phải viết lại toàn bộ kiến trúc dữ liệu game,
// dùng 1 "lớp override" lưu trong MongoDB: mỗi bản ghi = 1 patch (object con)
// đè lên ĐÚNG 1 entity trong gameData.js theo category+itemId. Xem
// backend/utils/gameOverrides.js — nơi áp patch này vào object gameData
// đang chạy trong bộ nhớ (mutate trực tiếp) MỖI KHI server khởi động và MỖI
// LẦN admin lưu 1 thay đổi, nên không cần restart server để thấy hiệu lực.
const gameConfigOverrideSchema = new mongoose.Schema({
  category: { type: String, required: true, index: true }, // 'weapons' | 'armor' | 'consumables' | 'monsters' | 'bosses' | 'minions' | 'specialItems' | 'superItems' | 'pets' | ...
  itemId: { type: String, required: true },
  patch: { type: mongoose.Schema.Types.Mixed, default: {} }, // { price: 500, atk: 20, ... } — chỉ các field muốn đè
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

gameConfigOverrideSchema.index({ category: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('GameConfigOverride', gameConfigOverrideSchema);
