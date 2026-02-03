const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

// System Reset (Admin only)
router.post('/reset', verifyToken, (req, res) => {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

    console.log('Starting system reset...');

    // Use serialize to ensure sequential execution
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        let hasError = false;
        const errorHandler = (err, context) => {
            if (err && !hasError) {
                hasError = true;
                console.error(`Reset error at ${context}:`, err);
                db.run("ROLLBACK", (rbErr) => {
                    if (rbErr) console.error('Rollback failed:', rbErr);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Reset failed: ' + err.message });
                    }
                });
            }
        };

        // 1. Delete all users except 'admin' and 'user'
        db.run("DELETE FROM users WHERE email NOT IN ('admin', 'user')", (err) => errorHandler(err, 'users-delete'));

        // 2. Delete all dynamic content
        const tables = ['issues', 'milestones', 'audit_logs', 'notifications', 'issue_relations', 'comments'];
        tables.forEach(table => {
            db.run(`DELETE FROM ${table}`, (err) => errorHandler(err, `${table}-delete`));
            db.run(`DELETE FROM sqlite_sequence WHERE name='${table}'`, (err) => errorHandler(err, `${table}-seq`));
        });

        // 3. Selective Wiki preservation
        // Delete all pages except the core guides requested by the user
        const preservedWikiIds = ["'home'", "'guide-requester'", "'guide-assignee'", "'admin-guide'", "'advanced-features-guide'", "'integration-guide'"];
        db.run(`DELETE FROM pages WHERE id NOT IN (${preservedWikiIds.join(',')})`, (err) => errorHandler(err, 'wiki-selective-delete'));

        // 4. Reset users sequence
        db.run("DELETE FROM sqlite_sequence WHERE name='users'", (err) => errorHandler(err, 'users-seq'));

        // 5. Final step: Commit only if no error occurred
        db.run("COMMIT", (err) => {
            if (err) {
                if (!hasError) {
                    console.error('Commit failed:', err);
                    if (!res.headersSent) res.status(500).json({ error: 'Commit failed' });
                }
                return;
            }
            if (!hasError) {
                console.log('System reset successful');
                res.json({ success: true, message: 'System reset successfully (Wiki preserved)' });
            }
        });
    });
});

module.exports = router;
