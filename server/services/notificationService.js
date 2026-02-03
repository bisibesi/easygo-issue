const db = require('../db');

const createNotification = (userId, type, message, issueId) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO notifications (user_id, type, message, issue_id, created_at)
            VALUES (?, ?, ?, ?, ?)
        `;
        const createdAt = new Date().toISOString();
        db.run(query, [userId, type, message, issueId, createdAt], function (err) {
            if (err) {
                console.error('Failed to create notification:', err);
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
};

const getNotificationsForUser = (userId) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const markAsRead = (id) => {
    return new Promise((resolve, reject) => {
        db.run("UPDATE notifications SET is_read = 1 WHERE id = ?", [id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const deleteNotification = (id) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM notifications WHERE id = ?", [id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const clearAllNotifications = (userId) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM notifications WHERE user_id = ?", [userId], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

module.exports = {
    createNotification,
    getNotificationsForUser,
    markAsRead,
    deleteNotification,
    clearAllNotifications
};
