const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

// GET relations for an issue
router.get('/:issueId', verifyToken, (req, res) => {
    const query = `
        SELECT ir.*, i.title, i.status 
        FROM issue_relations ir
        JOIN issues i ON ir.related_issue_id = i.id
        WHERE ir.issue_id = ?
    `;
    db.all(query, [req.params.issueId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ADD relation
router.post('/', verifyToken, (req, res) => {
    const { issue_id, related_issue_id, relation_type } = req.body;
    const creatorId = req.userId;

    db.run("INSERT INTO issue_relations (issue_id, related_issue_id, relation_type, creator_id) VALUES (?, ?, ?, ?)",
        [issue_id, related_issue_id, relation_type, creatorId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, issue_id, related_issue_id, relation_type, creator_id: creatorId });
        });
});

// DELETE relation
router.delete('/:id', verifyToken, (req, res) => {
    const relationId = req.params.id;

    // Check permission: only Creator or Admin
    db.get("SELECT * FROM issue_relations WHERE id = ?", [relationId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Relation not found' });

        if (row.creator_id !== req.userId && req.userRole !== 'ADMIN') {
            return res.status(403).json({ error: '자신이 등록한 연관/차단 이슈만 삭제할 수 있습니다.' });
        }

        db.run("DELETE FROM issue_relations WHERE id = ?", [relationId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

module.exports = router;
