const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('profile/view', { title: 'My Profile', profileUser: user, isOwner: true });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading profile');
        res.redirect('/');
    }
});

router.get('/edit', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('profile/edit', { title: 'Edit Profile', profileUser: user });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading profile');
        res.redirect('/profile');
    }
});

router.post('/edit', ensureAuthenticated, upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'cvVideo', maxCount: 1 }
]), async (req, res) => {
    try {
        const updateData = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            headline: req.body.headline,
            bio: req.body.bio,
            phone: req.body.phone,
            address: req.body.address,
            city: req.body.city,
            country: req.body.country,
            website: req.body.website,
            linkedin: req.body.linkedin,
            github: req.body.github
        };

        if (req.user.role === 'company') {
            updateData.companyName = req.body.companyName;
            updateData.companyDescription = req.body.companyDescription;
            updateData.companySize = req.body.companySize;
            updateData.industry = req.body.industry;
        }

        if (req.files.profilePhoto) {
            updateData.photo = '/' + req.files.profilePhoto[0].path.replace(/\\/g, '/');
        }
        if (req.files.cvVideo) {
            updateData.cvVideo = '/' + req.files.cvVideo[0].path.replace(/\\/g, '/');
        }

        await User.findByIdAndUpdate(req.user._id, updateData);
        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating profile');
        res.redirect('/profile/edit');
    }
});

router.get('/skills', ensureAuthenticated, (req, res) => {
    res.render('profile/skills', { title: 'Manage Skills' });
});

router.post('/skills', ensureAuthenticated, async (req, res) => {
    try {
        const { title, technology, description, level } = req.body;
        await User.findByIdAndUpdate(req.user._id, {
            $push: { skills: { title, technology, description, level } }
        });
        req.flash('success_msg', 'Skill added successfully');
        res.redirect('/profile/skills');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding skill');
        res.redirect('/profile/skills');
    }
});

router.delete('/skills/:skillId', ensureAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { skills: { _id: req.params.skillId } }
        });
        req.flash('success_msg', 'Skill removed');
        res.redirect('/profile/skills');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error removing skill');
        res.redirect('/profile/skills');
    }
});

router.get('/experience', ensureAuthenticated, (req, res) => {
    res.render('profile/experience', { title: 'Manage Experience' });
});

router.post('/experience', ensureAuthenticated, async (req, res) => {
    try {
        const { company, position, startDate, endDate, current, description, type, technologies } = req.body;
        const techArray = technologies ? technologies.split(',').map(t => t.trim()) : [];
        
        await User.findByIdAndUpdate(req.user._id, {
            $push: {
                experiences: {
                    company,
                    position,
                    startDate,
                    endDate: current ? null : endDate,
                    current: current === 'on',
                    description,
                    type,
                    technologies: techArray
                }
            }
        });
        req.flash('success_msg', 'Experience added successfully');
        res.redirect('/profile/experience');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding experience');
        res.redirect('/profile/experience');
    }
});

router.delete('/experience/:expId', ensureAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { experiences: { _id: req.params.expId } }
        });
        req.flash('success_msg', 'Experience removed');
        res.redirect('/profile/experience');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error removing experience');
        res.redirect('/profile/experience');
    }
});

router.get('/education', ensureAuthenticated, (req, res) => {
    res.render('profile/education', { title: 'Manage Education' });
});

router.post('/education', ensureAuthenticated, async (req, res) => {
    try {
        const { institution, degree, field, startDate, endDate, description } = req.body;
        await User.findByIdAndUpdate(req.user._id, {
            $push: { education: { institution, degree, field, startDate, endDate, description } }
        });
        req.flash('success_msg', 'Education added successfully');
        res.redirect('/profile/education');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding education');
        res.redirect('/profile/education');
    }
});

router.delete('/education/:eduId', ensureAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { education: { _id: req.params.eduId } }
        });
        req.flash('success_msg', 'Education removed');
        res.redirect('/profile/education');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error removing education');
        res.redirect('/profile/education');
    }
});

router.get('/projects', ensureAuthenticated, (req, res) => {
    res.render('profile/projects', { title: 'Manage Projects' });
});

router.post('/projects', ensureAuthenticated, async (req, res) => {
    try {
        const { title, description, technologies, link, startDate, endDate } = req.body;
        const techArray = technologies ? technologies.split(',').map(t => t.trim()) : [];
        
        await User.findByIdAndUpdate(req.user._id, {
            $push: { projects: { title, description, technologies: techArray, link, startDate, endDate } }
        });
        req.flash('success_msg', 'Project added successfully');
        res.redirect('/profile/projects');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding project');
        res.redirect('/profile/projects');
    }
});

router.delete('/projects/:projId', ensureAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { projects: { _id: req.params.projId } }
        });
        req.flash('success_msg', 'Project removed');
        res.redirect('/profile/projects');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error removing project');
        res.redirect('/profile/projects');
    }
});

router.get('/cv/download', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${user.firstName}_${user.lastName}_CV.pdf`);
        doc.pipe(res);

        doc.fontSize(24).font('Helvetica-Bold').text(`${user.firstName} ${user.lastName}`, { align: 'center' });
        if (user.headline) {
            doc.fontSize(14).font('Helvetica').text(user.headline, { align: 'center' });
        }
        doc.moveDown();

        doc.fontSize(10).font('Helvetica');
        const contactInfo = [];
        if (user.email) contactInfo.push(user.email);
        if (user.phone) contactInfo.push(user.phone);
        if (user.city && user.country) contactInfo.push(`${user.city}, ${user.country}`);
        doc.text(contactInfo.join(' | '), { align: 'center' });
        
        if (user.linkedin || user.github || user.website) {
            doc.moveDown(0.5);
            const links = [];
            if (user.linkedin) links.push(`LinkedIn: ${user.linkedin}`);
            if (user.github) links.push(`GitHub: ${user.github}`);
            if (user.website) links.push(`Website: ${user.website}`);
            doc.text(links.join(' | '), { align: 'center' });
        }
        doc.moveDown();

        if (user.bio) {
            doc.fontSize(14).font('Helvetica-Bold').text('Summary');
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').text(user.bio);
            doc.moveDown();
        }

        if (user.experiences && user.experiences.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('Experience');
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);

            user.experiences.forEach(exp => {
                doc.fontSize(11).font('Helvetica-Bold').text(exp.position);
                doc.fontSize(10).font('Helvetica').text(`${exp.company} | ${exp.type || ''}`);
                const startDate = new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                const endDate = exp.current ? 'Present' : new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                doc.text(`${startDate} - ${endDate}`);
                if (exp.description) {
                    doc.moveDown(0.3);
                    doc.text(exp.description);
                }
                if (exp.technologies && exp.technologies.length > 0) {
                    doc.text(`Technologies: ${exp.technologies.join(', ')}`);
                }
                doc.moveDown(0.5);
            });
            doc.moveDown();
        }

        if (user.education && user.education.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('Education');
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);

            user.education.forEach(edu => {
                doc.fontSize(11).font('Helvetica-Bold').text(edu.degree);
                doc.fontSize(10).font('Helvetica').text(`${edu.institution}${edu.field ? ' - ' + edu.field : ''}`);
                if (edu.startDate) {
                    const startDate = new Date(edu.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    const endDate = edu.endDate ? new Date(edu.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present';
                    doc.text(`${startDate} - ${endDate}`);
                }
                if (edu.description) {
                    doc.moveDown(0.3);
                    doc.text(edu.description);
                }
                doc.moveDown(0.5);
            });
            doc.moveDown();
        }

        if (user.skills && user.skills.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('Skills');
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);

            user.skills.forEach(skill => {
                doc.fontSize(10).font('Helvetica-Bold').text(`${skill.title} - ${skill.technology}`, { continued: true });
                doc.font('Helvetica').text(` (${skill.level})`);
                if (skill.description) {
                    doc.text(skill.description);
                }
                doc.moveDown(0.3);
            });
            doc.moveDown();
        }

        if (user.projects && user.projects.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('Projects');
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(0.5);

            user.projects.forEach(proj => {
                doc.fontSize(11).font('Helvetica-Bold').text(proj.title);
                if (proj.technologies && proj.technologies.length > 0) {
                    doc.fontSize(10).font('Helvetica').text(`Technologies: ${proj.technologies.join(', ')}`);
                }
                if (proj.description) {
                    doc.text(proj.description);
                }
                if (proj.link) {
                    doc.text(`Link: ${proj.link}`);
                }
                doc.moveDown(0.5);
            });
        }

        doc.end();
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error generating CV');
        res.redirect('/profile');
    }
});

router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const profileUser = await User.findById(req.params.id);
        if (!profileUser) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/');
        }

        const isOwner = req.user._id.toString() === profileUser._id.toString();
        const isConnected = req.user.connections.includes(profileUser._id);
        const isFollowing = req.user.following.includes(profileUser._id);
        const pendingRequest = profileUser.pendingConnections.includes(req.user._id);

        res.render('profile/view', {
            title: `${profileUser.firstName} ${profileUser.lastName}`,
            profileUser,
            isOwner,
            isConnected,
            isFollowing,
            pendingRequest
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading profile');
        res.redirect('/');
    }
});

module.exports = router;
