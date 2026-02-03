const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

// GET all milestones
router.get('/', verifyToken, (req, res) => {
    db.all("SELECT * FROM milestones ORDER BY due_date ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// CREATE milestone (Admin only)
router.post('/', verifyToken, (req, res) => {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    const { title, description, due_date } = req.body;
    const now = new Date().toISOString();

    db.run("INSERT INTO milestones (title, description, due_date, created_at) VALUES (?, ?, ?, ?)",
        [title, description, due_date, now],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, title, description, due_date, created_at: now });
        });
});

// UPDATE milestone (Admin only)
router.patch('/:id', verifyToken, (req, res) => {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    const { title, description, due_date } = req.body;

    db.run(
        "UPDATE milestones SET title = COALESCE(?, title), description = COALESCE(?, description), due_date = COALESCE(?, due_date) WHERE id = ?",
        [title, description, due_date, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// DELETE milestone (Admin only)
router.delete('/:id', verifyToken, (req, res) => {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
    db.run("DELETE FROM milestones WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;
