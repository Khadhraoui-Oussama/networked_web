require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

require('./config/passport')(passport);

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:', err));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

const Notification = require('./models/Notification');
const Message = require('./models/Message');
const Job = require('./models/Job');

app.use(async (req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    
    if (req.user) {
        try {
            // Count unread notifications
            const unreadCount = await Notification.countDocuments({ 
                recipient: req.user._id, 
                read: false 
            });
            res.locals.unreadNotifications = unreadCount;
            
            // Count unread messages
            const unreadMessages = await Message.countDocuments({
                sender: { $ne: req.user._id },
                read: false
            }).then(async () => {
                // Get conversations where user is a participant
                const Conversation = require('./models/Conversation');
                const userConversations = await Conversation.find({
                    participants: req.user._id
                }).select('_id');
                const conversationIds = userConversations.map(c => c._id);
                
                return Message.countDocuments({
                    conversation: { $in: conversationIds },
                    sender: { $ne: req.user._id },
                    read: false
                });
            });
            res.locals.unreadMessages = unreadMessages;
            
            // Count pending connection requests
            res.locals.pendingConnections = req.user.pendingConnections ? req.user.pendingConnections.length : 0;
            
            // Count pending job applications (for companies)
            if (req.user.role === 'company') {
                const jobs = await Job.find({ company: req.user._id });
                let pendingApplications = 0;
                jobs.forEach(job => {
                    pendingApplications += job.applications.filter(app => app.status === 'pending').length;
                });
                res.locals.pendingJobApplications = pendingApplications;
            } else {
                res.locals.pendingJobApplications = 0;
            }
        } catch (err) {
            res.locals.unreadNotifications = 0;
            res.locals.unreadMessages = 0;
            res.locals.pendingConnections = 0;
            res.locals.pendingJobApplications = 0;
        }
    } else {
        res.locals.unreadNotifications = 0;
        res.locals.unreadMessages = 0;
        res.locals.pendingConnections = 0;
        res.locals.pendingJobApplications = 0;
    }
    next();
});

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/profile', require('./routes/profile'));
app.use('/posts', require('./routes/posts'));
app.use('/jobs', require('./routes/jobs'));
app.use('/messages', require('./routes/messages'));
app.use('/network', require('./routes/network'));
app.use('/admin', require('./routes/admin'));
app.use('/notifications', require('./routes/notifications'));

io.on('connection', (socket) => {
    socket.on('join', (userId) => {
        socket.join(userId);
    });

    socket.on('sendMessage', (data) => {
        io.to(data.receiverId).emit('newMessage', data);
    });

    socket.on('disconnect', () => {});
});

app.use((req, res) => {
    res.status(404).render('errors/404');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
