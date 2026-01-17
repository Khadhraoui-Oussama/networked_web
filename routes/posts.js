const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { ensureAuthenticated } = require('../middleware/auth');

router.post('/', ensureAuthenticated, upload.single('postMedia'), async (req, res) => {
    try {
        const { content, visibility } = req.body;
        
        let mediaType = null;
        let mediaPath = null;
        
        if (req.file) {
            mediaPath = '/' + req.file.path.replace(/\\/g, '/');
            if (req.file.mimetype.startsWith('image')) {
                mediaType = 'image';
            } else if (req.file.mimetype.startsWith('video')) {
                mediaType = 'video';
            }
        }

        const post = new Post({
            author: req.user._id,
            content,
            media: mediaPath,
            mediaType,
            visibility: visibility || 'public'
        });

        await post.save();
        req.flash('success_msg', 'Post created successfully');
        res.redirect('/');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error creating post');
        res.redirect('/');
    }
});

router.post('/:id/react', ensureAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('reactions.user', 'firstName lastName photo');
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        const existingReaction = post.reactions.find(
            r => r.user._id.toString() === req.user._id.toString()
        );

        let reacted = false;

        if (existingReaction) {
            if (existingReaction.type === req.body.type) {
                post.reactions.pull(existingReaction._id);
                reacted = false;
            } else {
                existingReaction.type = req.body.type;
                reacted = true;
            }
        } else {
            post.reactions.push({
                user: req.user._id,
                type: req.body.type || 'like'
            });
            reacted = true;

            if (post.author.toString() !== req.user._id.toString()) {
                const notification = new Notification({
                    recipient: post.author,
                    sender: req.user._id,
                    type: 'like',
                    reference: post._id,
                    referenceModel: 'Post',
                    message: `${req.user.firstName} ${req.user.lastName} reacted to your post`
                });
                await notification.save();
                req.io.to(post.author.toString()).emit('notification', notification);
            }
        }

        await post.save();
        
        // Reload to get populated user data
        const updatedPost = await Post.findById(req.params.id).populate('reactions.user', 'firstName lastName photo');
        
        // Get likers info for display
        const likers = updatedPost.reactions.slice(0, 3).map(r => ({
            name: `${r.user.firstName} ${r.user.lastName}`,
            photo: r.user.photo
        }));
        
        res.json({ 
            success: true, 
            reactionCount: updatedPost.reactions.length,
            reacted: reacted,
            likers: likers
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Error processing reaction' });
    }
});

router.post('/:id/comment', ensureAuthenticated, upload.single('postMedia'), async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            req.flash('error_msg', 'Post not found');
            return res.redirect('/');
        }

        let mediaType = null;
        let mediaPath = null;

        if (req.file) {
            mediaPath = '/' + req.file.path.replace(/\\/g, '/');
            if (req.file.mimetype.startsWith('image')) {
                mediaType = 'image';
            } else if (req.file.mimetype.startsWith('video')) {
                mediaType = 'video';
            }
        }

        post.comments.push({
            user: req.user._id,
            content: req.body.content,
            media: mediaPath,
            mediaType
        });

        await post.save();

        if (post.author.toString() !== req.user._id.toString()) {
            const notification = new Notification({
                recipient: post.author,
                sender: req.user._id,
                type: 'comment',
                reference: post._id,
                referenceModel: 'Post',
                message: `${req.user.firstName} ${req.user.lastName} commented on your post`
            });
            await notification.save();
            req.io.to(post.author.toString()).emit('notification', notification);
        }

        req.flash('success_msg', 'Comment added');
        res.redirect('/');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding comment');
        res.redirect('/');
    }
});

router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            req.flash('error_msg', 'Post not found');
            return res.redirect('/');
        }

        if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/');
        }

        post.isDeleted = true;
        await post.save();

        req.flash('success_msg', 'Post deleted');
        res.redirect('/');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting post');
        res.redirect('/');
    }
});

router.delete('/:postId/comment/:commentId', ensureAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            req.flash('error_msg', 'Post not found');
            return res.redirect('/');
        }

        const comment = post.comments.id(req.params.commentId);
        if (!comment) {
            req.flash('error_msg', 'Comment not found');
            return res.redirect('/');
        }

        if (comment.user.toString() !== req.user._id.toString() && 
            post.author.toString() !== req.user._id.toString() && 
            req.user.role !== 'admin') {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/');
        }

        comment.isDeleted = true;
        await post.save();

        req.flash('success_msg', 'Comment deleted');
        res.redirect('/');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting comment');
        res.redirect('/');
    }
});

module.exports = router;
