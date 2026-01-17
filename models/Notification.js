const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { 
        type: String, 
        enum: ['like', 'comment', 'follow', 'connection_request', 'connection_accepted', 'job_application', 'message', 'admin_action'],
        required: true 
    },
    reference: { type: mongoose.Schema.Types.ObjectId, refPath: 'referenceModel' },
    referenceModel: { type: String, enum: ['Post', 'Job', 'User', 'Message'] },
    message: { type: String },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
