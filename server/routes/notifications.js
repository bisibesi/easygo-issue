const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const notificationService = require('../services/notificationService');

// GET user notifications
router.get('/', verifyToken, async (req, res) => {
    try {
        const notifications = await notificationService.getNotificationsForUser(req.userId);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// MARK notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {
    try {
        await notificationService.markAsRead(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE all notifications for the user (Literal route first)
router.delete('/', verifyToken, async (req, res) => {
    try {
        await notificationService.clearAllNotifications(req.userId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE single notification
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await notificationService.deleteNotification(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
