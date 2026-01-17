const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate('sender', 'firstName lastName photo')
            .sort({ createdAt: -1 })
            .limit(50);

        res.render('notifications/index', {
            title: 'Notifications',
            notifications
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading notifications');
        res.redirect('/');
    }
});

router.post('/mark-read', ensureAuthenticated, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { read: true }
        );

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        res.redirect('/notifications');
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error marking notifications as read' });
    }
});

router.post('/:id/read', ensureAuthenticated, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true });
        }
        res.redirect('/notifications');
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error marking notification as read' });
    }
});

router.get('/count', ensureAuthenticated, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user._id,
            read: false
        });
        res.json({ count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error getting notification count' });
    }
});

module.exports = router;
