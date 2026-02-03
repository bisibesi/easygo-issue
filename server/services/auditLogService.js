const db = require('../db');

const recordLog = (issueId, userId, action, oldValue, newValue) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO audit_logs (issue_id, user_id, action, old_value, new_value, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const createdAt = new Date().toISOString();
        db.run(query, [issueId, userId, action, JSON.stringify(oldValue), JSON.stringify(newValue), createdAt], function (err) {
            if (err) {
                console.error('Failed to record audit log:', err);
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
};

const getLogsByIssue = (issueId) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT a.*, u.name as user_name FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE a.issue_id = ? ORDER BY a.created_at DESC",
            [issueId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
    });
};

module.exports = {
    recordLog,
    getLogsByIssue
};
