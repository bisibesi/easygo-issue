const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const auditLogService = require('../services/auditLogService');

// GET logs for an issue
router.get('/:issueId', verifyToken, async (req, res) => {
    try {
        const logs = await auditLogService.getLogsByIssue(req.params.issueId);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
