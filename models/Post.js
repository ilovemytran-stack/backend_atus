const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 1000 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
  content: { type: String, maxlength: 5000 },
  images: [{ url: String, publicId: String }],
  video: { url: String, publicId: String, thumbnail: String, duration: Number },
  tags: [String],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
  comments: [commentSchema],
  commentsCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ content: 'text' });

module.exports = mongoose.model('Post', postSchema);
