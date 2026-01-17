const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user._id
        })
        .populate('participants', 'firstName lastName photo companyName role')
        .populate('lastMessage')
        .populate('job', 'title')
        .sort({ updatedAt: -1 });

        res.render('messages/index', {
            title: 'Messages',
            conversations
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading messages');
        res.redirect('/');
    }
});

router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id)
            .populate('participants', 'firstName lastName photo companyName role')
            .populate('job', 'title');

        if (!conversation) {
            req.flash('error_msg', 'Conversation not found');
            return res.redirect('/messages');
        }

        const isParticipant = conversation.participants.some(
            p => p._id.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/messages');
        }

        const messages = await Message.find({ conversation: conversation._id })
            .populate('sender', 'firstName lastName photo')
            .sort({ createdAt: 1 });

        await Message.updateMany(
            { conversation: conversation._id, sender: { $ne: req.user._id }, read: false },
            { read: true }
        );

        const otherParticipant = conversation.participants.find(
            p => p._id.toString() !== req.user._id.toString()
        );

        res.render('messages/conversation', {
            title: `Chat with ${otherParticipant.role === 'company' ? otherParticipant.companyName : otherParticipant.firstName}`,
            conversation,
            messages,
            otherParticipant
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading conversation');
        res.redirect('/messages');
    }
});

router.post('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) {
            req.flash('error_msg', 'Conversation not found');
            return res.redirect('/messages');
        }

        const isParticipant = conversation.participants.some(
            p => p.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/messages');
        }

        const message = new Message({
            conversation: conversation._id,
            sender: req.user._id,
            content: req.body.content
        });
        await message.save();

        conversation.lastMessage = message._id;
        await conversation.save();

        const recipientId = conversation.participants.find(
            p => p.toString() !== req.user._id.toString()
        );

        const notification = new Notification({
            recipient: recipientId,
            sender: req.user._id,
            type: 'message',
            reference: message._id,
            referenceModel: 'Message',
            message: `New message from ${req.user.firstName} ${req.user.lastName}`
        });
        await notification.save();

        req.io.to(recipientId.toString()).emit('newMessage', {
            conversationId: conversation._id,
            message: {
                _id: message._id,
                content: message.content,
                sender: {
                    _id: req.user._id,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName,
                    photo: req.user.photo
                },
                createdAt: message.createdAt
            }
        });

        req.io.to(recipientId.toString()).emit('notification', notification);

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, message });
        }

        res.redirect(`/messages/${conversation._id}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error sending message');
        res.redirect('/messages');
    }
});

router.post('/start/:userId', ensureAuthenticated, async (req, res) => {
    try {
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, req.params.userId] },
            job: null
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [req.user._id, req.params.userId]
            });
            await conversation.save();
        }

        res.redirect(`/messages/${conversation._id}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error starting conversation');
        res.redirect('/');
    }
});

module.exports = router;
