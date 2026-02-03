const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');
const integrationService = require('../services/integrationService');

// 1. Get Integration Settings (Admin Only)
router.get('/settings', verifyToken, (req, res) => {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

    db.all("SELECT * FROM integrations", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

// 2. Save Integration Settings (Admin Only)
router.post('/settings', verifyToken, (req, res) => {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

    const settings = req.body; // { slack_webhook_url: '...', notion_token: '...' }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        Object.keys(settings).forEach(key => {
            db.run("INSERT OR REPLACE INTO integrations (key, value) VALUES (?, ?)", [key, settings[key]]);
        });
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// 3. Receive Git/SVN Webhooks (Generic endpoint)
router.post('/webhook/vcs', async (req, res) => {
    const { message, author } = req.body;

    if (!message) return res.status(400).json({ error: 'No message provided' });

    console.log(`Received VCS Webhook: ${message} by ${author}`);
    await integrationService.processVCSCommit(message, author || 'System');

    res.json({ success: true, message: 'Processed' });
});

module.exports = router;
