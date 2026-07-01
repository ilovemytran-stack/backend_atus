const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6, select: false },
  displayName: { type: String, trim: true, maxlength: 50 },
  avatar: { type: String, default: '' },
  coverPhoto: { type: String, default: '' },
  bio: { type: String, maxlength: 300 },
  website: String,
  location: String,
  isVerified: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  postsCount: { type: Number, default: 0 },
  videosCount: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  passwordResetToken: String,
  passwordResetExpire: Date,
  refreshToken: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function(entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.toPublic = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.passwordResetToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
