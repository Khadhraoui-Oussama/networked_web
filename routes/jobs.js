const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { ensureAuthenticated, ensureCompany } = require('../middleware/auth');

router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const { search, type, remote, location } = req.query;
        let query = { isActive: true };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { skills: { $regex: search, $options: 'i' } }
            ];
        }
        if (type) query.type = type;
        if (remote === 'true') query.remote = true;
        if (location) query.location = { $regex: location, $options: 'i' };

        const jobs = await Job.find(query)
            .populate('company', 'companyName photo industry')
            .sort({ createdAt: -1 });

        res.render('jobs/index', {
            title: 'Job Listings',
            jobs,
            search,
            type,
            remote,
            location
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading jobs');
        res.redirect('/');
    }
});

router.get('/my-jobs', ensureCompany, async (req, res) => {
    try {
        const jobs = await Job.find({ company: req.user._id })
            .populate('applications.applicant', 'firstName lastName photo headline')
            .sort({ createdAt: -1 });

        res.render('jobs/my-jobs', { title: 'My Job Listings', jobs });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading jobs');
        res.redirect('/jobs');
    }
});

router.get('/create', ensureCompany, (req, res) => {
    res.render('jobs/create', { title: 'Post a Job' });
});

router.post('/', ensureCompany, async (req, res) => {
    try {
        const {
            title, description, requirements, responsibilities,
            type, location, remote, salaryMin, salaryMax, currency,
            skills, experience, education, deadline
        } = req.body;

        const job = new Job({
            company: req.user._id,
            title,
            description,
            requirements: requirements ? requirements.split('\n').filter(r => r.trim()) : [],
            responsibilities: responsibilities ? responsibilities.split('\n').filter(r => r.trim()) : [],
            type,
            location,
            remote: remote === 'on',
            salary: {
                min: salaryMin ? parseInt(salaryMin) : undefined,
                max: salaryMax ? parseInt(salaryMax) : undefined,
                currency: currency || 'USD'
            },
            skills: skills ? skills.split(',').map(s => s.trim()) : [],
            experience,
            education,
            deadline: deadline || undefined
        });

        await job.save();
        req.flash('success_msg', 'Job posted successfully');
        res.redirect('/jobs/my-jobs');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error posting job');
        res.redirect('/jobs/create');
    }
});

router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate('company', 'companyName companyDescription photo industry companySize');

        if (!job) {
            req.flash('error_msg', 'Job not found');
            return res.redirect('/jobs');
        }

        const hasApplied = job.applications.some(
            app => app.applicant.toString() === req.user._id.toString()
        );

        res.render('jobs/view', {
            title: job.title,
            job,
            hasApplied,
            isOwner: job.company._id.toString() === req.user._id.toString()
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading job');
        res.redirect('/jobs');
    }
});

router.post('/:id/apply', ensureAuthenticated, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            req.flash('error_msg', 'Job not found');
            return res.redirect('/jobs');
        }

        const hasApplied = job.applications.some(
            app => app.applicant.toString() === req.user._id.toString()
        );

        if (hasApplied) {
            req.flash('error_msg', 'You have already applied to this job');
            return res.redirect(`/jobs/${job._id}`);
        }

        job.applications.push({
            applicant: req.user._id,
            coverLetter: req.body.coverLetter
        });
        await job.save();

        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, job.company] },
            job: job._id
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [req.user._id, job.company],
                job: job._id
            });
            await conversation.save();
        }

        const message = new Message({
            conversation: conversation._id,
            sender: req.user._id,
            content: `Application for: ${job.title}\n\n${req.body.coverLetter || 'No cover letter provided.'}`
        });
        await message.save();

        conversation.lastMessage = message._id;
        await conversation.save();

        const notification = new Notification({
            recipient: job.company,
            sender: req.user._id,
            type: 'job_application',
            reference: job._id,
            referenceModel: 'Job',
            message: `${req.user.firstName} ${req.user.lastName} applied to ${job.title}`
        });
        await notification.save();
        req.io.to(job.company.toString()).emit('notification', notification);

        req.flash('success_msg', 'Application submitted successfully');
        res.redirect(`/messages/${conversation._id}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error submitting application');
        res.redirect('/jobs');
    }
});

router.put('/:id/application/:applicantId', ensureCompany, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job || job.company.toString() !== req.user._id.toString()) {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/jobs/my-jobs');
        }

        const application = job.applications.find(
            app => app.applicant.toString() === req.params.applicantId
        );

        if (application) {
            application.status = req.body.status;
            await job.save();
            req.flash('success_msg', 'Application status updated');
        }

        res.redirect('/jobs/my-jobs');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating application');
        res.redirect('/jobs/my-jobs');
    }
});

router.delete('/:id', ensureCompany, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            req.flash('error_msg', 'Job not found');
            return res.redirect('/jobs/my-jobs');
        }

        if (job.company.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            req.flash('error_msg', 'Not authorized');
            return res.redirect('/jobs/my-jobs');
        }

        job.isActive = false;
        await job.save();

        req.flash('success_msg', 'Job listing closed');
        res.redirect('/jobs/my-jobs');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error closing job');
        res.redirect('/jobs/my-jobs');
    }
});

module.exports = router;
