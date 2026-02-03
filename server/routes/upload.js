const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/authMiddleware');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Use original name but prepend timestamp to avoid collisions
        // Internal use -> keep original extension and name mostly
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Upload Endpoint
router.post('/', verifyToken, upload.array('files'), (req, res) => {
    try {
        const files = req.files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            path: `/uploads/${file.filename}`, // URL path
            size: file.size,
            mimetype: file.mimetype
        }));

        res.json(files);
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

module.exports = router;
