const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');
const auditLogService = require('../services/auditLogService');
const notificationService = require('../services/notificationService');
const integrationService = require('../services/integrationService');

// GET all issues (Filtered by Role)
router.get('/', verifyToken, (req, res) => {
    let query = `
        SELECT issues.*, users.name as creator, milestones.title as milestone_title
        FROM issues 
        LEFT JOIN users ON issues.creator_id = users.id 
        LEFT JOIN milestones ON issues.milestone_id = milestones.id
        ORDER BY issues.created_at DESC
    `;
    let params = [];

    if (req.userRole !== 'ADMIN') {
        query = `
            SELECT issues.*, users.name as creator, milestones.title as milestone_title
            FROM issues 
            LEFT JOIN users ON issues.creator_id = users.id 
            LEFT JOIN milestones ON issues.milestone_id = milestones.id
            WHERE issues.creator_id = ? 
            OR issues.assignee = ? 
            ORDER BY issues.created_at DESC
        `;
        params = [req.userId, req.userName];
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const issues = rows.map(row => ({
            ...row,
            attachments: row.attachments ? JSON.parse(row.attachments) : []
        }));
        res.json(issues);
    });
});

// CREATE issue
router.post('/', verifyToken, (req, res) => {
    const { title, description, priority, assignee, start_date, due_date, created_at, attachments, milestone_id } = req.body;
    const now = new Date().toISOString();
    const creatorId = req.userId;
    const createdAt = created_at || now;

    const attachmentsJson = attachments ? JSON.stringify(attachments) : '[]';

    db.run(`INSERT INTO issues (title, description, priority, assignee, creator_id, created_at, updated_at, status, start_date, due_date, attachments, milestone_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, priority, assignee, creatorId, createdAt, now, 'OPEN', start_date, due_date, attachmentsJson, milestone_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            integrationService.sendSlackNotification(`🚀 새 이슈 생성됨: ${title} (중요도: ${priority})`);

            res.json({
                id: this.lastID,
                title, description, priority, assignee,
                creator_id: creatorId,
                created_at: createdAt, updated_at: now,
                status: 'OPEN',
                start_date, due_date, milestone_id
            });
        });
});

// UPDATE issue details (Dates, Resolution, etc.)
router.patch('/:id', verifyToken, (req, res) => {
    const { title, description, priority, assignee, start_date, due_date, created_at, resolution, milestone_id, attachments } = req.body;
    const issueId = req.params.id;

    db.get('SELECT * FROM issues WHERE id = ?', [issueId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Issue not found' });

        if (row.creator_id !== req.userId && req.userRole !== 'ADMIN' && row.assignee !== req.userName) {
            return res.status(403).json({ error: 'Not authorized to update issue details' });
        }

        const newTitle = title || row.title;
        const newDesc = description || row.description;
        const newPriority = priority || row.priority;
        const newAssignee = assignee !== undefined ? assignee : row.assignee;
        const newStartDate = start_date !== undefined ? start_date : row.start_date;
        const newDueDate = due_date !== undefined ? due_date : row.due_date;
        const newCreatedAt = created_at || row.created_at;
        const newResolution = resolution !== undefined ? resolution : row.resolution;
        const newAttachments = attachments !== undefined ? JSON.stringify(attachments) : row.attachments;
        const newMilestoneId = milestone_id !== undefined ? milestone_id : row.milestone_id;
        const now = new Date().toISOString();

        db.run(`UPDATE issues SET title = ?, description = ?, priority = ?, assignee = ?, start_date = ?, due_date = ?, created_at = ?, resolution = ?, attachments = ?, updated_at = ?, milestone_id = ? WHERE id = ?`,
            [newTitle, newDesc, newPriority, newAssignee, newStartDate, newDueDate, newCreatedAt, newResolution, newAttachments, now, newMilestoneId, issueId],
            async function (err) {
                if (err) return res.status(500).json({ error: err.message });

                const changes = [];
                if (newTitle !== row.title) changes.push(auditLogService.recordLog(issueId, req.userId, 'TITLE_CHANGE', row.title, newTitle));
                if (newPriority !== row.priority) changes.push(auditLogService.recordLog(issueId, req.userId, 'PRIORITY_CHANGE', row.priority, newPriority));
                if (newAssignee !== row.assignee) {
                    changes.push(auditLogService.recordLog(issueId, req.userId, 'ASSIGNEE_CHANGE', row.assignee, newAssignee));
                    if (newAssignee) {
                        db.get("SELECT id FROM users WHERE name = ?", [newAssignee], async (err, user) => {
                            if (user && user.id !== req.userId) {
                                await notificationService.createNotification(
                                    user.id,
                                    'ASSIGNMENT',
                                    `당신이 이슈 #${issueId.slice(0, 8)}의 담당자로 지정되었습니다.`,
                                    issueId
                                );
                            }
                        });
                    }
                }
                if (newStartDate !== row.start_date || newDueDate !== row.due_date) {
                    changes.push(auditLogService.recordLog(issueId, req.userId, 'DATE_CHANGE',
                        { start: row.start_date, due: row.due_date },
                        { start: newStartDate, due: newDueDate }
                    ));
                }
                if (newResolution !== row.resolution) changes.push(auditLogService.recordLog(issueId, req.userId, 'RESOLUTION_CHANGE', row.resolution, newResolution));
                if (newMilestoneId !== row.milestone_id) changes.push(auditLogService.recordLog(issueId, req.userId, 'MILESTONE_CHANGE', row.milestone_id, newMilestoneId));

                await Promise.all(changes);

                const statusChange = changes.some(c => c && c.action === 'STATUS_CHANGE');
                if (statusChange) {
                    integrationService.sendSlackNotification(`🔄 이슈 #${issueId} 상태 변경: ${row.status} -> ${newStatus}`);
                }

                res.json({ success: true });
            });
    });
});

// UPDATE issue status (with Blocking Logic)
router.patch('/:id/status', verifyToken, (req, res) => {
    const { status } = req.body;
    const issueId = req.params.id;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    db.get('SELECT * FROM issues WHERE id = ?', [issueId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Issue not found' });

        // Authorization (optional: check assignee/admin)

        // BLOCKING LOGIC: If closing, check related issues
        if (status === 'CLOSED') {
            const checkQuery = `
                SELECT i.id, i.status, i.title
                FROM issue_relations ir
                JOIN issues i ON ir.related_issue_id = i.id
                WHERE ir.issue_id = ?
            `;
            db.all(checkQuery, [issueId], (err, relatedIssues) => {
                if (err) return res.status(500).json({ error: err.message });

                const incompleteIssues = relatedIssues.filter(ri => ri.status !== 'CLOSED');
                if (incompleteIssues.length > 0) {
                    const names = incompleteIssues.map(i => `#${i.id}`).join(', ');
                    return res.status(400).json({
                        error: `연관된 이슈가 모두 완료되어야 합니다. (미완료: ${names})`
                    });
                }

                // Proceed to update
                performUpdate();
            });
        } else {
            performUpdate();
        }

        function performUpdate() {
            const now = new Date().toISOString();
            db.run('UPDATE issues SET status = ?, updated_at = ? WHERE id = ?', [status, now, issueId], async function (err) {
                if (err) return res.status(500).json({ error: err.message });

                await auditLogService.recordLog(issueId, req.userId, 'STATUS_CHANGE', row.status, status);

                if (status === 'CLOSED') {
                    integrationService.sendSlackNotification(`✅ 이슈 #${issueId} 완료됨! (${row.title})`);
                } else {
                    integrationService.sendSlackNotification(`🔄 이슈 #${issueId} 상태 변경: ${row.status} -> ${status}`);
                }

                res.json({ success: true, status, updated_at: now });
            });
        }
    });
});

// DELETE issue
router.delete('/:id', verifyToken, (req, res) => {
    const issueId = req.params.id;

    // Check permission first
    db.get('SELECT * FROM issues WHERE id = ?', [issueId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Issue not found' });

        // Authorization Logic
        const isCreator = row.creator_id === req.userId;
        const isAdmin = req.userRole === 'ADMIN';

        // Maybe assignee shouldn't delete? Let's restrict DELETE to Creator or Admin.
        if (!isAdmin && !isCreator) {
            return res.status(403).json({ error: 'Not authorized to delete this issue' });
        }

        db.run('DELETE FROM issues WHERE id = ?', issueId, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// GET commits for an issue
const vcsService = require('../services/vcsService');

router.get('/:id/commits', verifyToken, async (req, res) => {
    try {
        const commits = await vcsService.getCommits(req.params.id);
        res.json(commits);
    } catch (err) {
        console.error('VCS Error:', err);
        res.status(500).json({ error: 'Failed to fetch commits' });
    }
});

router.get('/:id/commits/diff', verifyToken, async (req, res) => {
    try {
        const { repo, revision } = req.query;
        if (!repo || !revision) return res.status(400).json({ error: 'Missing repo or revision' });

        const diff = await vcsService.getDiff(repo, revision);
        res.json({ diff });
    } catch (err) {
        console.error('Diff Error:', err);
        res.status(500).json({ error: 'Failed to fetch diff' });
    }
});

module.exports = router;
