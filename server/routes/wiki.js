const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all pages (with content for simplicity, or just titles)
router.get('/', verifyToken, (req, res) => {
    // If not ADMIN, filter out ADMIN pages
    let query = "SELECT * FROM pages ORDER BY updatedAt DESC";
    let params = [];

    if (req.userRole !== 'ADMIN') {
        query = "SELECT * FROM pages WHERE required_role != 'ADMIN' ORDER BY updatedAt DESC";
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// CREATE page
router.post('/', (req, res) => {
    const { title, content, content_ko, content_en } = req.body;
    const id = crypto.randomUUID();
    const updatedAt = new Date().toISOString();

    db.run('INSERT INTO pages (id, title, content, content_ko, content_en, updatedAt, required_role) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, title, content_ko || content || '', content_ko || content || '', content_en || '', updatedAt, 'USER'],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id, title, content: content_ko || content || '', content_ko: content_ko || content || '', content_en: content_en || '', updatedAt });
        });
});

// UPDATE page
router.put('/:id', (req, res) => {
    const { title, content, content_ko, content_en } = req.body;
    const updatedAt = new Date().toISOString();

    db.run('UPDATE pages SET title = ?, content = ?, content_ko = ?, content_en = ?, updatedAt = ? WHERE id = ?',
        [title, content_ko || content || '', content_ko || content || '', content_en || '', updatedAt, req.params.id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, updatedAt });
        });
});

// DELETE page
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM pages WHERE id = ?', req.params.id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

module.exports = router;
