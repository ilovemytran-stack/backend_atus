const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 24, unique: true },
  tag: { type: String, required: true, trim: true, uppercase: true, maxlength: 4 },
  description: { type: String, trim: true, maxlength: 200, default: '' },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'Character', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Character' }],
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 }, // cộng dồn khi thành viên diệt quái/boss, chưa gắn thưởng cụ thể (mở rộng sau)
  maxMembers: { type: Number, default: 30 },
}, { timestamps: true });

module.exports = mongoose.model('Guild', guildSchema);
