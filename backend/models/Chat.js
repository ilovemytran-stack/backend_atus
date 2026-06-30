const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'image', 'emoji', 'video'], default: 'text' },
  content: String,
  media: { url: String, publicId: String },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastMessageText: String,
  lastMessageAt: Date,
  unreadCount: { type: Map, of: Number, default: {} },
}, { timestamps: true });

conversationSchema.index({ participants: 1 });

module.exports = {
  Message: mongoose.model('Message', messageSchema),
  Conversation: mongoose.model('Conversation', conversationSchema),
};
