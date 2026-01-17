const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    responsibilities: [{ type: String }],
    type: { type: String, enum: ['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract'], required: true },
    location: { type: String },
    remote: { type: Boolean, default: false },
    salary: {
        min: { type: Number },
        max: { type: Number },
        currency: { type: String, default: 'USD' }
    },
    skills: [{ type: String }],
    experience: { type: String },
    education: { type: String },
    applications: [{
        applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'reviewed', 'accepted', 'rejected'], default: 'pending' },
        appliedAt: { type: Date, default: Date.now },
        coverLetter: { type: String }
    }],
    isActive: { type: Boolean, default: true },
    deadline: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

JobSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Job', JobSchema);
