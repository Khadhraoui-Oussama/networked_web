const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'uploads';
const dirs = ['photos', 'videos', 'documents', 'posts'];
dirs.forEach(dir => {
    const fullPath = path.join(uploadDir, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        let folder = 'uploads/documents';
        if (file.fieldname === 'photo' || file.fieldname === 'profilePhoto') {
            folder = 'uploads/photos';
        } else if (file.fieldname === 'video' || file.fieldname === 'cvVideo') {
            folder = 'uploads/videos';
        } else if (file.fieldname === 'postMedia') {
            folder = 'uploads/posts';
        }
        cb(null, folder);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const imageTypes = /jpeg|jpg|png|gif/;
    const videoTypes = /mp4|webm|avi|mov/;
    const docTypes = /pdf|doc|docx/;
    
    const extname = path.extname(file.originalname).toLowerCase().slice(1);
    const mimetype = file.mimetype;

    if (file.fieldname === 'photo' || file.fieldname === 'profilePhoto') {
        if (imageTypes.test(extname) && /image/.test(mimetype)) {
            return cb(null, true);
        }
    } else if (file.fieldname === 'video' || file.fieldname === 'cvVideo') {
        if (videoTypes.test(extname) && /video/.test(mimetype)) {
            return cb(null, true);
        }
    } else if (file.fieldname === 'postMedia') {
        if ((imageTypes.test(extname) && /image/.test(mimetype)) || 
            (videoTypes.test(extname) && /video/.test(mimetype))) {
            return cb(null, true);
        }
    } else {
        if (docTypes.test(extname)) {
            return cb(null, true);
        }
    }
    cb(new Error('Invalid file type'), false);
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: fileFilter
});

module.exports = upload;
