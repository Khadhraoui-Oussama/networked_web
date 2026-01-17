const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const following = [...req.user.following, ...req.user.connections, req.user._id];
        const posts = await Post.find({
            author: { $in: following },
            isDeleted: false
        })
        .populate('author', 'firstName lastName photo headline companyName role')
        .populate('comments.user', 'firstName lastName photo')
        .populate('reactions.user', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(20);

        const unreadNotifications = await Notification.countDocuments({
            recipient: req.user._id,
            read: false
        });

        res.render('index', { 
            title: 'Home',
            posts,
            unreadNotifications
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading feed');
        res.redirect('/profile');
    }
});

router.get('/welcome', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('welcome', { title: 'Welcome to NetWorked' });
});

module.exports = router;
