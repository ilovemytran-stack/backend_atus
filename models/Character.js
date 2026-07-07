const mongoose = require('mongoose');

const itemInstanceSchema = new mongoose.Schema({
  itemId: { type: String, required: true },     // key trong WEAPONS / ARMOR / CONSUMABLES
  kind: { type: String, enum: ['weapon', 'armor', 'consumable'], required: true },
  qty: { type: Number, default: 1 },             // dùng cho consumable
  isSpecialSet: { type: Boolean, default: false },
}, { _id: true });

const characterSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 20 },
  classId: { type: String, required: true, enum: ['kai', 'ryu', 'kenji', 'may', 'yuki', 'lina', 'malakai'] },

  level: { type: Number, default: 1, min: 1, max: 60 },
  xp: { type: Number, default: 0 },

  gold: { type: Number, default: 100 },
  gem: { type: Number, default: 20 },

  // điểm chưa tiêu (point 6: mỗi 5 cấp -> 10 điểm thuộc tính, 2 điểm chiêu)
  unspentStatPoints: { type: Number, default: 0 },
  unspentSkillPoints: { type: Number, default: 0 },
  attributes: {
    str: { type: Number, default: 0 },
    vit: { type: Number, default: 0 },
    agi: { type: Number, default: 0 },
    int: { type: Number, default: 0 },
  },
  skillLevels: { type: Map, of: Number, default: {} }, // skillId -> level (0-10)
  knownSkills: { type: [String], default: [] },   // các chiêu học thêm được (vd từ phước lành thần linh)
  equippedSkills: { type: [String], default: [] }, // đúng 2 skillId đang hiện ra nút bấm ngoài màn hình (rỗng = mặc định 2 chiêu gốc)

  // Vị trí hiện tại (point 5)
  position: {
    continentId: { type: String, default: 'aurelion' },
    mapId: { type: String, default: 'aurelion_1' },
    x: { type: Number, default: 400 },
    y: { type: Number, default: 300 },
  },

  // Túi đồ + trang bị đang mặc (point 8)
  inventory: [itemInstanceSchema],
  equipment: {
    weapon: { type: String, default: null },
    body: { type: String, default: null },
    legs: { type: String, default: null },
    boots: { type: String, default: null },
    gloves: { type: String, default: null },
    helmet: { type: String, default: null },
  },

  godBlessings: [{ god: String, skillName: String, grantedAtLevel: Number }], // point 10/11
  guildId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guild', default: null }, // sẵn cho phase sau (point 4)
  pvpWins: { type: Number, default: 0 },
  pvpLosses: { type: Number, default: 0 },
  bossKills: { type: Number, default: 0 },
  gmDamageMultiplier: { type: Number, default: 1 }, // công cụ GM: buff sát thương để test (admin/điều hành)

  mailbox: [{
    kind: { type: String, enum: ['topup', 'system', 'quest', 'gm'], default: 'topup' },
    title: { type: String, default: 'Thư từ hệ thống' },
    message: { type: String, default: '' },
    gold: { type: Number, default: 0 },
    gem: { type: Number, default: 0 },
    claimed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }],

  friends: [{ character: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' }, since: { type: Date, default: Date.now } }],
  friendRequests: [{ from: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' }, sentAt: { type: Date, default: Date.now } }],
  lastSeenAt: { type: Date, default: Date.now },

  godDuels: [{
    tier: Number,               // level/10 (1,2,3,4,5,6)
    continentId: String,
    godName: String,
    status: { type: String, enum: ['pending', 'won'], default: 'pending' },
  }],

  questProgress: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Character', characterSchema);
