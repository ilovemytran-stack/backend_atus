const mongoose = require('mongoose');

// Lưu snapshot TOÀN BỘ document Character trước khi lệnh "rs" (reset) của admin xoá sạch tiến trình —
// cho phép "re1" khôi phục lại đúng như trước khi reset. Giữ tối đa N bản gần nhất/nhân vật (LIFO),
// re1 luôn phục hồi bản MỚI NHẤT rồi xoá nó khỏi hàng đợi (khôi phục xong thì hết, không lặp lại được
// bản đó lần 2 — muốn lùi tiếp thì phải có 1 lượt "rs" mới trước đó).
const characterBackupSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true }, // toàn bộ character.toObject() tại thời điểm backup
  reason: { type: String, default: 'rs' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin nào bấm reset
}, { timestamps: true });

characterBackupSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CharacterBackup', characterBackupSchema);
