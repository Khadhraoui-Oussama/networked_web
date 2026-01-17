const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String },
    media: { type: String },
    mediaType: { type: String, enum: ['image', 'video', null] },
    createdAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false }
});

const ReactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'love', 'celebrate', 'support', 'insightful'], default: 'like' },
    createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    media: { type: String },
    mediaType: { type: String, enum: ['image', 'video', null] },
    reactions: [ReactionSchema],
    comments: [CommentSchema],
    visibility: { type: String, enum: ['public', 'connections', 'private'], default: 'public' },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

PostSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Post', PostSchema);
