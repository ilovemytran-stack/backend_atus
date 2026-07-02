const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'comment', 'follow', 'share', 'mention', 'video_like', 'video_comment'], required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  message: String,
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
