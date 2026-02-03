const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');
const notificationService = require('../services/notificationService');

// GET comments for an issue
router.get('/:issueId', verifyToken, (req, res) => {
    const issueId = req.params.issueId;

    const query = `
        SELECT comments.*, users.name as user_name 
        FROM comments 
        LEFT JOIN users ON comments.user_id = users.id 
        WHERE issue_id = ? 
        ORDER BY created_at ASC
    `;

    db.all(query, [issueId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST comment
router.post('/', verifyToken, (req, res) => {
    const { issueId, content } = req.body;
    const userId = req.userId;
    const now = new Date().toISOString();

    db.run('INSERT INTO comments (issue_id, user_id, content, created_at) VALUES (?, ?, ?, ?)',
        [issueId, userId, content, now],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Return created comment with user info
            // Fetch name for response
            db.get('SELECT name FROM users WHERE id = ?', [userId], async (err, row) => {
                const commenterName = row ? row.name : 'Unknown';

                // Notify Creator and Assignee
                db.get("SELECT creator_id, assignee FROM issues WHERE id = ?", [issueId], async (err, issue) => {
                    if (issue) {
                        // Notify Creator
                        if (issue.creator_id !== userId) {
                            await notificationService.createNotification(
                                issue.creator_id,
                                'NEW_COMMENT',
                                `${commenterName}님이 이슈 #${issueId.slice(0, 8)}에 댓글을 남겼습니다.`,
                                issueId
                            );
                        }
                        // Notify Assignee
                        if (issue.assignee && issue.assignee !== commenterName) {
                            db.get("SELECT id FROM users WHERE name = ?", [issue.assignee], async (err, user) => {
                                if (user && user.id !== userId && user.id !== issue.creator_id) {
                                    await notificationService.createNotification(
                                        user.id,
                                        'NEW_COMMENT',
                                        `${commenterName}님이 당신의 업무에 댓글을 남겼습니다.`,
                                        issueId
                                    );
                                }
                            });
                        }
                    }
                });

                res.json({
                    id: this.lastID,
                    issue_id: issueId,
                    user_id: userId,
                    user_name: commenterName,
                    content,
                    created_at: now
                });
            });
        });
});

// DELETE comment
router.delete('/:id', verifyToken, (req, res) => {
    const commentId = req.params.id;

    db.get('SELECT * FROM comments WHERE id = ?', [commentId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Comment not found' });

        if (row.user_id !== req.userId && req.userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        db.run('DELETE FROM comments WHERE id = ?', [commentId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

module.exports = router;
