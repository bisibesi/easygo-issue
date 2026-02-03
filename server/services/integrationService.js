const db = require('../db');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const getSetting = async (key) => {
    return new Promise((resolve) => {
        db.get("SELECT value FROM integrations WHERE key = ?", [key], (err, row) => {
            if (err || !row) resolve(null);
            else resolve(row.value);
        });
    });
};

const integrationService = {
    // 1. Slack Notification
    async sendSlackNotification(message) {
        const webhookUrl = await getSetting('slack_webhook_url');
        if (!webhookUrl) return;

        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: `[이슈 트래커] ${message}` })
            });
        } catch (err) {
            console.error('Slack integration error:', err);
        }
    },

    // 2. Git/SVN Webhook Processing
    async processVCSCommit(commitMessage, author) {
        // Regex to find #1, #12, etc. (Issue IDs)
        const issueMatches = commitMessage.match(/#(\d+)/g);
        if (!issueMatches) return;

        const isClosing = commitMessage.toLowerCase().match(/(fix|close|resolve|complete)/i);
        const statusToSet = isClosing ? 'CLOSED' : 'IN_PROGRESS';

        for (const match of issueMatches) {
            const issueId = match.substring(1);

            // Check if issue exists
            db.get("SELECT id FROM issues WHERE id = ?", [issueId], async (err, row) => {
                if (row) {
                    console.log(`VCS Auto-Update: Setting issue #${issueId} to ${statusToSet}`);

                    // Update Status
                    db.run("UPDATE issues SET status = ?, updated_at = ? WHERE id = ?",
                        [statusToSet, new Date().toISOString(), issueId]);

                    // Record Audit Log (System ID 0 or special tag)
                    db.run(`INSERT INTO audit_logs (issue_id, user_id, action, old_value, new_value, created_at)
                            VALUES (?, ?, ?, ?, ?, ?)`,
                        [issueId, 0, 'VCS_AUTO_UPDATE', 'VCS Commit', `${author}: ${commitMessage}`, new Date().toISOString()]);

                    // Send Notification to Creator
                    db.get("SELECT creator_id, title FROM issues WHERE id = ?", [issueId], (err, issue) => {
                        if (issue) {
                            db.run(`INSERT INTO notifications (user_id, type, message, issue_id, created_at)
                                    VALUES (?, ?, ?, ?, ?)`,
                                [issue.creator_id, 'ISSUE_UPDATE', `VCS 커밋에 의해 이슈 #${issueId}가 ${statusToSet} 상태로 변경되었습니다.`, issueId, new Date().toISOString()]);
                        }
                    });
                }
            });
        }
    },

    // 3. Notion Sync (Placeholder for actual API implementation)
    async syncToNotion(issue) {
        const notionToken = await getSetting('notion_token');
        const notionDbId = await getSetting('notion_database_id');
        if (!notionToken || !notionDbId) return;

        console.log(`Syncing issue #${issue.id} to Notion...`);
        // Actual Notion API call would go here
    }
};

module.exports = integrationService;
