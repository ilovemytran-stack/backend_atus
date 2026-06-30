const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  publicId: String,
  thumbnail: String,
  title: { type: String, maxlength: 200 },
  description: { type: String, maxlength: 2000 },
  duration: Number,
  music: { name: String, artist: String, url: String },
  tags: [String],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, maxlength: 500 },
    likesCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
  commentsCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

videoSchema.index({ author: 1, createdAt: -1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ viewsCount: -1 });

module.exports = mongoose.model('Video', videoSchema);
