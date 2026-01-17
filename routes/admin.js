const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const { ensureAdmin } = require('../middleware/auth');

router.get('/', ensureAdmin, async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const postCount = await Post.countDocuments({ isDeleted: false });
        const jobCount = await Job.countDocuments({ isActive: true });
        const bannedCount = await User.countDocuments({ isBanned: true });

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            stats: { userCount, postCount, jobCount, bannedCount }
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading dashboard');
        res.redirect('/');
    }
});

router.get('/users', ensureAdmin, async (req, res) => {
    try {
        const { search, role, status } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) query.role = role;
        if (status === 'banned') query.isBanned = true;
        if (status === 'active') query.isBanned = false;

        const users = await User.find(query)
            .select('firstName lastName email photo role isBanned createdAt companyName')
            .sort({ createdAt: -1 });

        res.render('admin/users', {
            title: 'Manage Users',
            users,
            search,
            role,
            status
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading users');
        res.redirect('/admin');
    }
});

router.post('/users/:id/ban', ensureAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/users');
        }

        if (user.role === 'admin') {
            req.flash('error_msg', 'Cannot ban an admin');
            return res.redirect('/admin/users');
        }

        user.isBanned = true;
        user.banReason = req.body.reason || 'Violation of terms of service';
        await user.save();

        const notification = new Notification({
            recipient: user._id,
            type: 'admin_action',
            message: `Your account has been banned. Reason: ${user.banReason}`
        });
        await notification.save();

        req.flash('success_msg', 'User banned successfully');
        res.redirect('/admin/users');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error banning user');
        res.redirect('/admin/users');
    }
});

router.post('/users/:id/unban', ensureAdmin, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, {
            isBanned: false,
            banReason: null
        });

        req.flash('success_msg', 'User unbanned successfully');
        res.redirect('/admin/users');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error unbanning user');
        res.redirect('/admin/users');
    }
});

router.delete('/users/:id', ensureAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/users');
        }

        if (user.role === 'admin') {
            req.flash('error_msg', 'Cannot delete an admin');
            return res.redirect('/admin/users');
        }

        await User.findByIdAndDelete(req.params.id);
        await Post.deleteMany({ author: req.params.id });
        await Job.deleteMany({ company: req.params.id });

        req.flash('success_msg', 'User deleted successfully');
        res.redirect('/admin/users');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting user');
        res.redirect('/admin/users');
    }
});

router.get('/posts', ensureAdmin, async (req, res) => {
    try {
        const posts = await Post.find({ isDeleted: false })
            .populate('author', 'firstName lastName photo')
            .populate('comments.user', 'firstName lastName photo')
            .populate('reactions.user', 'firstName lastName photo')
            .sort({ createdAt: -1 })
            .limit(100);

        res.render('admin/posts', { title: 'Manage Posts', posts });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading posts');
        res.redirect('/admin');
    }
});

router.delete('/posts/:id', ensureAdmin, async (req, res) => {
    try {
        await Post.findByIdAndUpdate(req.params.id, { isDeleted: true });
        req.flash('success_msg', 'Post deleted successfully');
        res.redirect('/admin/posts');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting post');
        res.redirect('/admin/posts');
    }
});

router.delete('/posts/:postId/comments/:commentId', ensureAdmin, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (post) {
            const comment = post.comments.id(req.params.commentId);
            if (comment) {
                comment.isDeleted = true;
                await post.save();
            }
        }
        req.flash('success_msg', 'Comment deleted successfully');
        res.redirect('/admin/posts');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting comment');
        res.redirect('/admin/posts');
    }
});

module.exports = router;
