const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const upload = require('../config/multer');
const User = require('../models/User');
const { ensureGuest, ensureAuthenticated } = require('../middleware/auth');

router.get('/login', ensureGuest, (req, res) => {
    res.render('auth/login', { title: 'Login' });
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/auth/login',
        failureFlash: true
    })(req, res, next);
});

router.get('/register', ensureGuest, (req, res) => {
    res.render('auth/register', { title: 'Register' });
});

router.post('/register', upload.single('photo'), async (req, res) => {
    try {
        const { email, password, password2, firstName, lastName, role, companyName } = req.body;
        const errors = [];

        if (!email || !password || !firstName || !lastName) {
            errors.push({ msg: 'Please fill in all required fields' });
        }
        if (password !== password2) {
            errors.push({ msg: 'Passwords do not match' });
        }
        if (password.length < 6) {
            errors.push({ msg: 'Password must be at least 6 characters' });
        }
        if (role === 'company' && !companyName) {
            errors.push({ msg: 'Company name is required for company accounts' });
        }

        if (errors.length > 0) {
            return res.render('auth/register', {
                title: 'Register',
                errors,
                email,
                firstName,
                lastName,
                role,
                companyName
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            errors.push({ msg: 'Email is already registered' });
            return res.render('auth/register', {
                title: 'Register',
                errors,
                firstName,
                lastName,
                role,
                companyName
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            email: email.toLowerCase(),
            password: hashedPassword,
            firstName,
            lastName,
            role: role || 'user',
            companyName: role === 'company' ? companyName : undefined,
            photo: req.file ? '/' + req.file.path.replace(/\\/g, '/') : '/images/default-avatar.png'
        });

        await newUser.save();
        req.flash('success_msg', 'Registration successful. Please log in.');
        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Registration failed. Please try again.');
        res.redirect('/auth/register');
    }
});

router.get('/logout', ensureAuthenticated, (req, res) => {
    req.logout(function(err) {
        if (err) {
            console.error(err);
        }
        req.flash('success_msg', 'You have been logged out');
        res.redirect('/auth/login');
    });
});

module.exports = router;
