const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
    title: { type: String, required: true },
    technology: { type: String, required: true },
    description: { type: String },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: 'Beginner' }
});

const ExperienceSchema = new mongoose.Schema({
    company: { type: String, required: true },
    position: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String },
    type: { type: String, enum: ['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract'] },
    technologies: [{ type: String }]
});

const EducationSchema = new mongoose.Schema({
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    field: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String }
});

const ProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    technologies: [{ type: String }],
    link: { type: String },
    startDate: { type: Date },
    endDate: { type: Date }
});

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'company', 'admin'], default: 'user' },
    
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    headline: { type: String },
    bio: { type: String },
    photo: { type: String, default: '/images/default-avatar.png' },
    cvVideo: { type: String },
    
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    website: { type: String },
    linkedin: { type: String },
    github: { type: String },
    
    companyName: { type: String },
    companyDescription: { type: String },
    companySize: { type: String },
    industry: { type: String },
    
    skills: [SkillSchema],
    experiences: [ExperienceSchema],
    education: [EducationSchema],
    projects: [ProjectSchema],
    
    connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pendingConnections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
    
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

UserSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);
