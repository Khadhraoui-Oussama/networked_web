const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const { search } = req.query;
        let query = { _id: { $ne: req.user._id }, isBanned: false };

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { headline: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } },
                { 'skills.title': { $regex: search, $options: 'i' } },
                { 'skills.technology': { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('firstName lastName photo headline companyName role skills')
            .limit(50);

        res.render('network/index', {
            title: 'My Network',
            users,
            search,
            connections: req.user.connections,
            pendingConnections: req.user.pendingConnections,
            following: req.user.following
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading network');
        res.redirect('/');
    }
});

router.get('/connections', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('connections', 'firstName lastName photo headline companyName role')
            .populate('pendingConnections', 'firstName lastName photo headline companyName role');

        res.render('network/connections', {
            title: 'Connections',
            connections: user.connections,
            pendingConnections: user.pendingConnections
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading connections');
        res.redirect('/network');
    }
});

router.post('/connect/:id', ensureAuthenticated, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/network');
        }

        if (targetUser.pendingConnections.includes(req.user._id)) {
            req.flash('error_msg', 'Connection request already sent');
            return res.redirect('/network');
        }

        if (req.user.connections.includes(targetUser._id)) {
            req.flash('error_msg', 'Already connected');
            return res.redirect('/network');
        }

        targetUser.pendingConnections.push(req.user._id);
        await targetUser.save();

        const notification = new Notification({
            recipient: targetUser._id,
            sender: req.user._id,
            type: 'connection_request',
            reference: req.user._id,
            referenceModel: 'User',
            message: `${req.user.firstName} ${req.user.lastName} wants to connect`
        });
        await notification.save();
        req.io.to(targetUser._id.toString()).emit('notification', notification);

        req.flash('success_msg', 'Connection request sent');
        res.redirect('/network');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error sending connection request');
        res.redirect('/network');
    }
});

router.post('/accept/:id', ensureAuthenticated, async (req, res) => {
    try {
        const requester = await User.findById(req.params.id);
        if (!requester) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/network/connections');
        }

        await User.findByIdAndUpdate(req.user._id, {
            $pull: { pendingConnections: requester._id },
            $addToSet: { connections: requester._id }
        });

        await User.findByIdAndUpdate(requester._id, {
            $addToSet: { connections: req.user._id }
        });

        const notification = new Notification({
            recipient: requester._id,
            sender: req.user._id,
            type: 'connection_accepted',
            reference: req.user._id,
            referenceModel: 'User',
            message: `${req.user.firstName} ${req.user.lastName} accepted your connection request`
        });
        await notification.save();
        req.io.to(requester._id.toString()).emit('notification', notification);

        req.flash('success_msg', 'Connection accepted');
        res.redirect('/network/connections');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error accepting connection');
        res.redirect('/network/connections');
    }
});

router.post('/reject/:id', ensureAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { pendingConnections: req.params.id }
        });

        req.flash('success_msg', 'Connection request rejected');
        res.redirect('/network/connections');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error rejecting connection');
        res.redirect('/network/connections');
    }
});

router.post('/disconnect/:id', ensureAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { connections: req.params.id }
        });

        await User.findByIdAndUpdate(req.params.id, {
            $pull: { connections: req.user._id }
        });

        req.flash('success_msg', 'Connection removed');
        res.redirect('/network/connections');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error removing connection');
        res.redirect('/network/connections');
    }
});

router.post('/follow/:id', ensureAuthenticated, async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/network');
        }

        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { following: targetUser._id }
        });

        await User.findByIdAndUpdate(targetUser._id, {
            $addToSet: { followers: req.user._id }
        });

        const notification = new Notification({
            recipient: targetUser._id,
            sender: req.user._id,
            type: 'follow',
            reference: req.user._id,
            referenceModel: 'User',
            message: `${req.user.firstName} ${req.user.lastName} started following you`
        });
        await notification.save();
        req.io.to(targetUser._id.toString()).emit('notification', notification);

        req.flash('success_msg', 'Now following');
        res.redirect('/network');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error following user');
        res.redirect('/network');
    }
});

router.post('/unfollow/:id', ensureAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { following: req.params.id }
        });

        await User.findByIdAndUpdate(req.params.id, {
            $pull: { followers: req.user._id }
        });

        req.flash('success_msg', 'Unfollowed');
        res.redirect('/network');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error unfollowing user');
        res.redirect('/network');
    }
});

module.exports = router;
