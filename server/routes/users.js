const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Get All Users (Protected, mostly for Admin but Assignee list might need it)
// Let's allow authenticated users to see the list of names for assignment?
// Or restrict? The user asked for "Admin only" features but IssueForm needs assignees.
// Let's allow all authenticated users to LIST users (for dropdowns), but only Admin to ADD/DELETE.
router.get('/', verifyToken, (req, res) => {
    db.all('SELECT id, email, name, role FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create User (Admin Only)
router.post('/', [verifyToken, isAdmin], (req, res) => {
    const { email, password, name, role } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    const userRole = role || 'USER';

    db.run("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
        [email, hash, name, userRole],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, email, name, role: userRole });
        });
});

// Delete User (Admin Only)
router.delete('/:id', [verifyToken, isAdmin], (req, res) => {
    // Prevent deleting self? Frontend handles logout, but server should probably allow.
    // Prevent deleting the main admin 'admin' is wise but not strictly required by prompt.
    db.run('DELETE FROM users WHERE id = ?', req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Update User
router.put('/:id', verifyToken, isAdmin, (req, res) => {
    const userId = req.params.id;
    const { name, role } = req.body;

    db.run('UPDATE users SET name = ?, role = ? WHERE id = ?', [name, role, userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;
