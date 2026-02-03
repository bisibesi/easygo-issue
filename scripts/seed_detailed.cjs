const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const dbPath = path.resolve(__dirname, '../server/database.sqlite');
const db = new sqlite3.Database(dbPath);

const sampleRepoPath = path.resolve(__dirname, '../server/sample_repo');

// Data Constants
const dummyUsers = [
    { id: 1, name: 'admin' }, // Ensure admin exists
    { id: 2, name: 'dev_kim' },
    { id: 3, name: 'manager_lee' }
];

const issueTemplates = [
    { title: "로그인 시 간헐적 500 에러 발생", label: "BUG", priority: "URGENT" },
    { title: "사용자 대시보드 UI 리뉴얼", label: "FEATURE", priority: "HIGH" },
    { title: "비밀번호 찾기 메일 발송 늦음", label: "ENHANCEMENT", priority: "MEDIUM" },
    { title: "API 문서 최신화 작업", label: "TASK", priority: "LOW" },
    { title: "모바일 결제 모듈 연동", label: "FEATURE", priority: "HIGH" },
    { title: "프로필 이미지 업로드 실패", label: "BUG", priority: "MEDIUM" },
    { title: "검색 쿼리 성능 최적화", label: "ENHANCEMENT", priority: "HIGH" },
    { title: "약관 페이지 띄어쓰기 수정", label: "TASK", priority: "LOW" },
    { title: "관리자 페이지 접근 권한 버그", label: "BUG", priority: "URGENT" },
    { title: "신규 알림 시스템 기획", label: "FEATURE", priority: "MEDIUM" }
];

const actions = [
    { type: 'STATUS_CHANGE', vals: ['OPEN', 'IN_PROGRESS', 'VERIFICATION_NEEDED', 'CLOSED'] },
    { type: 'PRIORITY_CHANGE', vals: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
    { type: 'ASSIGNEE_CHANGE', vals: dummyUsers.map(u => u.name) }
];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function setupSampleRepo() {
    console.log("📂 Setting up sample git repo at:", sampleRepoPath);
    if (fs.existsSync(sampleRepoPath)) {
        fs.rmSync(sampleRepoPath, { recursive: true, force: true });
    }
    fs.mkdirSync(sampleRepoPath);

    // Init Git
    execSync('git init', { cwd: sampleRepoPath });
    execSync('git config user.name "Demo User"', { cwd: sampleRepoPath });
    execSync('git config user.email "demo@example.com"', { cwd: sampleRepoPath });

    // Initial commit
    fs.writeFileSync(path.join(sampleRepoPath, 'README.md'), '# Sample Repo\n');
    execSync('git add .', { cwd: sampleRepoPath });
    execSync('git commit -m "Initial commit"', { cwd: sampleRepoPath });
}

function createCommit(issueId, msg, date) {
    const filename = `file_${Date.now()}.txt`;
    fs.writeFileSync(path.join(sampleRepoPath, filename), `Change for issue #${issueId}`);
    execSync('git add .', { cwd: sampleRepoPath });

    // Use GIT_AUTHOR_DATE and GIT_COMMITTER_DATE to fake history
    const dateStr = date.toISOString();
    const env = { ...process.env, GIT_AUTHOR_DATE: dateStr, GIT_COMMITTER_DATE: dateStr };

    const commitMsg = `${msg} #${issueId}`;
    execSync(`git commit -m "${commitMsg}"`, { cwd: sampleRepoPath, env });
    console.log(`   Git: Created commit for #${issueId} at ${dateStr}`);
}

db.serialize(() => {
    // 1. Setup Users (Ensure at least these exist)
    // We won't delete users to preserve login, but we'll make sure our dummy users are there if needed.
    // Actually, for simplicity, let's just rely on existing users or insert if missing.
    // But to match IDs in audit logs, we should probably fetch existing users.

    db.all("SELECT id, name FROM users", (err, existingUsers) => {
        if (err) { console.error(err); return; }

        let users = existingUsers;
        if (users.length === 0) {
            console.log("⚠️ No users found. Please run the app once to create admin or seed users.");
            users = dummyUsers; // Fallback
        }

        console.log(`👤 Using ${users.length} users for history generation.`);

        // 2. Clear Tables
        const tables = ['issues', 'comments', 'audit_logs', 'issue_relations', 'sqlite_sequence'];
        tables.forEach(t => {
            if (t === 'sqlite_sequence') {
                db.run(`DELETE FROM sqlite_sequence WHERE name IN ('issues', 'comments', 'audit_logs')`);
            } else {
                db.run(`DELETE FROM ${t}`);
            }
        });
        console.log("🧹 Tables cleared.");

        // 3. Setup Git Repo
        try {
            setupSampleRepo();
        } catch (e) {
            console.error("Failed to setup git repo:", e);
        }

        const stmtIssue = db.prepare(`INSERT INTO issues (title, description, priority, label, status, assignee, creator_id, created_at, updated_at, start_date, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const stmtLog = db.prepare(`INSERT INTO audit_logs (issue_id, user_id, action, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
        const stmtComment = db.prepare(`INSERT INTO comments (issue_id, user_id, content, created_at) VALUES (?, ?, ?, ?)`);

        let issueCount = 0;
        const now = new Date();
        const baseDate = new Date();
        baseDate.setMonth(now.getMonth() - 1);

        db.parallelize(() => {
            issueTemplates.forEach((tmpl, index) => {
                const createdAt = getRandomDate(baseDate, new Date(now.getTime() - 86400000 * 5)); // at least 5 days ago
                const creator = getRandomItem(users);
                const assignee = getRandomItem(users).name;
                const status = 'OPEN'; // Start as OPEN

                // Save issue
                stmtIssue.run(
                    tmpl.title,
                    `${tmpl.title}에 대한 상세 설명입니다.\n\n재현 경로:\n1. 로그인\n2. 메뉴 클릭...`,
                    tmpl.priority,
                    tmpl.label,
                    status,
                    assignee,
                    creator.id,
                    createdAt.toISOString(),
                    createdAt.toISOString(),
                    createdAt.toISOString(),
                    new Date(createdAt.getTime() + 86400000 * 10).toISOString() // Due +10 days
                    , function (err) {
                        if (err) { console.error(err); return; }
                        const issueId = this.lastID;
                        issueCount++;
                        console.log(`📝 Created Issue #${issueId}: ${tmpl.title}`);

                        // Generate History (Audit Logs) & Commits
                        let currentDate = new Date(createdAt);

                        // 1. Status Change (Open -> In Progress)
                        if (Math.random() > 0.3) {
                            const nextDate = new Date(currentDate.getTime() + 86400000 * Math.random());
                            stmtLog.run(issueId, creator.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS', nextDate.toISOString());

                            // Add a commit around this time
                            createCommit(issueId, `Start working on ${tmpl.title} feature`, nextDate);

                            // Update Issue Status (Simulated final state)
                            db.run("UPDATE issues SET status = ? WHERE id = ?", ['IN_PROGRESS', issueId]);
                            currentDate = nextDate;
                        }

                        // 2. Random Comment
                        if (Math.random() > 0.5) {
                            const commentDate = new Date(currentDate.getTime() + 3600000); // +1 hour
                            const commenter = getRandomItem(users);
                            stmtComment.run(issueId, commenter.id, "이 부분 확인 부탁드립니다.", commentDate.toISOString());
                        }

                        // 3. Assignee Change
                        if (Math.random() > 0.7) {
                            const nextDate = new Date(currentDate.getTime() + 86400000 * Math.random());
                            const newAssignee = getRandomItem(users);
                            stmtLog.run(issueId, creator.id, 'ASSIGNEE_CHANGE', assignee, newAssignee.name, nextDate.toISOString());
                            db.run("UPDATE issues SET assignee = ? WHERE id = ?", [newAssignee.name, issueId]);
                        }

                        // 4. Close Issue (for some)
                        if (Math.random() > 0.6) {
                            const nextDate = new Date(currentDate.getTime() + 86400000 * Math.random());
                            stmtLog.run(issueId, creator.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'CLOSED', nextDate.toISOString());

                            // Closing commit
                            createCommit(issueId, `Fix completed for`, nextDate);

                            db.run("UPDATE issues SET status = ? WHERE id = ?", ['CLOSED', issueId]);
                        }
                    });
            });
        });

        // Wait for creating to finish (approx) - not robust but ok for seed script
        setTimeout(() => {
            stmtIssue.finalize();
            stmtLog.finalize();
            stmtComment.finalize();
            console.log("✅ Data seeding & Version Control simulation complete.");
            db.close();
        }, 3000);
    });
});
