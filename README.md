# NetWorked - Professional Social Network

A LinkedIn-like professional social network built with Node.js, Express, MongoDB, Bootstrap, and EJS.

## Features

### User Management
- User registration (regular users and companies)
- Complete profile with photo, headline, bio
- Skills with technology, description, and proficiency level
- Work experience with period, mission, type, and technologies
- Education history
- Projects portfolio
- CV Video upload
- PDF CV generation

### Posts and Content
- Create posts with text, images, or videos
- Like and react to posts
- Comment on posts with text, images, or videos
- Real-time notifications via Socket.io

### Networking
- Connect with other professionals
- Follow/unfollow users and companies
- Search for users by name, skills, or keywords

### Jobs (Company Accounts)
- Post job/internship listings
- Manage job applications
- Review applicant profiles
- Change application status (pending, reviewed, accepted, rejected)

### Messaging
- Start conversations with connections
- Real-time messaging with Socket.io
- Job application discussions

### Administration
- Admin dashboard with statistics
- User management (ban, unban, delete)
- Post moderation
- Comment moderation

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **View Engine**: EJS
- **CSS Framework**: Bootstrap 5.3
- **Authentication**: Passport.js with Local Strategy
- **Real-time**: Socket.io
- **File Uploads**: Multer
- **PDF Generation**: PDFKit
- **Session Store**: connect-mongo

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/networked
   SESSION_SECRET=your-secret-key
   ```

4. Create required directories:
   ```bash
   mkdir -p public/uploads/photos public/uploads/videos public/uploads/documents
   ```

5. Start MongoDB locally or update MONGODB_URI to point to your MongoDB instance

6. Run the application:
   ```bash
   npm run dev
   ```

7. Visit `http://localhost:3000` in your browser

## Project Structure

```
networked/
├── config/
│   ├── passport.js       # Passport authentication config
│   └── multer.js         # File upload config
├── middleware/
│   └── auth.js           # Authentication middleware
├── models/
│   ├── User.js           # User model with skills, experience, etc.
│   ├── Post.js           # Posts with reactions and comments
│   ├── Job.js            # Job listings with applications
│   ├── Message.js        # Chat messages
│   ├── Conversation.js   # Conversation threads
│   └── Notification.js   # User notifications
├── routes/
│   ├── index.js          # Home routes
│   ├── auth.js           # Authentication routes
│   ├── profile.js        # Profile management
│   ├── posts.js          # Post CRUD
│   ├── jobs.js           # Job listings
│   ├── messages.js       # Messaging
│   ├── network.js        # Connections and following
│   ├── admin.js          # Admin panel
│   └── notifications.js  # Notifications
├── views/
│   ├── layouts/          # Layout templates
│   ├── partials/         # Reusable components
│   ├── auth/             # Login, Register
│   ├── profile/          # Profile views
│   ├── jobs/             # Job views
│   ├── messages/         # Messaging views
│   ├── network/          # Network views
│   ├── admin/            # Admin views
│   └── notifications/    # Notification views
├── public/
│   ├── css/              # Stylesheets
│   ├── js/               # Client-side JavaScript
│   ├── uploads/          # Uploaded files
│   └── images/           # Static images
├── server.js             # Application entry point
├── package.json          # Dependencies
└── .env                  # Environment variables
```

## User Roles

- **user**: Regular professional user
- **company**: Company account that can post jobs
- **admin**: Administrator with full access

## Default Admin

Create an admin user manually in MongoDB or use the application to register then update the role:

```javascript
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

## API Endpoints

### Authentication
- POST /auth/register - Register new user
- POST /auth/login - Login user
- GET /auth/logout - Logout user

### Profile
- GET /profile - View own profile
- GET /profile/:id - View user profile
- PUT /profile - Update profile
- POST /profile/skills - Add skill
- POST /profile/experience - Add experience
- POST /profile/education - Add education
- POST /profile/projects - Add project
- GET /profile/cv/download - Download PDF CV

### Posts
- GET /posts - List posts (feed)
- POST /posts - Create post
- POST /posts/:id/react - React to post
- POST /posts/:id/comments - Add comment
- DELETE /posts/:id - Delete post

### Jobs
- GET /jobs - List job listings
- POST /jobs - Create job (company)
- GET /jobs/:id - View job details
- POST /jobs/:id/apply - Apply for job
- PUT /jobs/:id/applications/:appId - Update application status

### Network
- GET /network - Browse users
- POST /network/connect/:id - Send connection request
- POST /network/accept/:id - Accept connection
- POST /network/follow/:id - Follow user

### Messages
- GET /messages - List conversations
- GET /messages/:id - View conversation
- POST /messages/:id - Send message

## License

ISC
