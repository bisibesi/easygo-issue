const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const dbPath = path.resolve(__dirname, '../server/database.sqlite');
const db = new sqlite3.Database(dbPath);

const sampleRepoPath = path.resolve(__dirname, '../server/sample_repo');

// Data Constants
const dummyUsers = [
    { id: 1, name: 'admin' },
    { id: 2, name: 'dev_kim' },
    { id: 3, name: 'manager_lee' },
    { id: 4, name: 'design_park' },
    { id: 5, name: 'tester_choi' }
];

const issueTitles = [
    "로그인 시 간헐적 500 에러 발생", "사용자 대시보드 UI 리뉴얼", "비밀번호 찾기 메일 발송 늦음",
    "API 문서 최신화 작업", "모바일 결제 모듈 연동", "프로필 이미지 업로드 실패",
    "검색 쿼리 성능 최적화", "약관 페이지 띄어쓰기 수정", "관리자 페이지 접근 권한 버그",
    "신규 알림 시스템 기획", "메인 배너 이미지 교체", "회원가입 약관 동의 체크박스 오류",
    "로그아웃 버튼 클릭 시 반응 없음", "마이페이지 로딩 속도 개선", "결제 내역 엑셀 다운로드 기능",
    "공지사항 게시판 페이징 처리 오류", "FAQ 데이터 업데이트", "시스템 점검 팝업 노출 설정",
    "다크 모드 지원 추가", "모바일 반응형 레이아웃 깨짐 수정"
];

const labels = ["BUG", "FEATURE", "ENHANCEMENT", "TASK"];
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

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
    const filename = `file_${issueId}_${date.getTime()}.txt`;
    fs.writeFileSync(path.join(sampleRepoPath, filename), `Change for issue #${issueId} - ${msg}`);
    execSync('git add .', { cwd: sampleRepoPath });

    const dateStr = date.toISOString();
    const env = { ...process.env, GIT_AUTHOR_DATE: dateStr, GIT_COMMITTER_DATE: dateStr };

    const commitMsg = `${msg} #${issueId}`;
    try {
        execSync(`git commit -m "${commitMsg}"`, { cwd: sampleRepoPath, env });
        console.log(`   Git: Created commit for #${issueId}`);
    } catch (e) {
        console.error(`   Git Error for #${issueId}:`, e.message);
    }
}

db.serialize(() => {
    // 1. Setup Users
    db.all("SELECT id, name FROM users", (err, existingUsers) => {
        if (err) { console.error(err); return; }

        let users = existingUsers;
        if (users.length === 0) {
            users = dummyUsers; // Fallback
        }
        console.log(`👤 Using ${users.length} users.`);

        // 2. Clear Tables
        const tables = ['issues', 'comments', 'audit_logs', 'issue_relations', 'milestones', 'sqlite_sequence'];
        tables.forEach(t => {
            if (t === 'sqlite_sequence') {
                db.run(`DELETE FROM sqlite_sequence WHERE name IN ('issues', 'comments', 'audit_logs', 'milestones')`);
            } else {
                db.run(`DELETE FROM ${t}`);
            }
        });
        console.log("🧹 Tables cleared.");

        // 3. Setup Milestones
        const milestones = [
            { title: "v1.0 런칭", desc: "첫 번째 정식 릴리즈" },
            { title: "v1.1 안정화", desc: "버그 수정 및 성능 개선" },
            { title: "v2.0 대규모 개편", desc: "UI/UX 전면 리뉴얼" }
        ];

        const milestoneIds = [];
        const stmtMilestone = db.prepare("INSERT INTO milestones (title, description, due_date, created_at) VALUES (?, ?, ?, ?)");
        milestones.forEach((m, idx) => {
            const dueDate = getRandomDate(new Date(), new Date(Date.now() + 86400000 * 30));
            stmtMilestone.run(m.title, m.desc, dueDate.toISOString(), new Date().toISOString(), function (err) {
                if (!err) milestoneIds.push(this.lastID);
            });
        });
        stmtMilestone.finalize();
        console.log("🚩 Milestones created.");

        // 4. Setup Git
        setupSampleRepo();

        const stmtIssue = db.prepare(`INSERT INTO issues (title, description, priority, label, status, assignee, creator_id, created_at, updated_at, start_date, due_date, milestone_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const stmtLog = db.prepare(`INSERT INTO audit_logs (issue_id, user_id, action, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
        const stmtComment = db.prepare(`INSERT INTO comments (issue_id, user_id, content, created_at) VALUES (?, ?, ?, ?)`);
        const stmtRelation = db.prepare(`INSERT INTO issue_relations (issue_id, related_issue_id, relation_type, creator_id) VALUES (?, ?, ?, ?)`);

        let issueCount = 0;
        const now = new Date();
        const baseDate = new Date();
        baseDate.setMonth(now.getMonth() - 2); // Last 2 months

        db.parallelize(() => {
            const TARGET_COUNT = 50;
            const createdIssueIds = [];

            for (let i = 0; i < TARGET_COUNT; i++) {
                const title = getRandomItem(issueTitles) + ` (${i + 1})`;
                const label = getRandomItem(labels);
                const priority = getRandomItem(priorities);
                const creator = getRandomItem(users);
                const assigneeUser = getRandomItem(users);

                const createdAt = getRandomDate(baseDate, new Date(now.getTime() - 86400000));
                const milestoneId = Math.random() > 0.3 ? getRandomItem(milestoneIds) : null;

                // Use a default status first, then simulate transition
                let status = 'OPEN';

                stmtIssue.run(
                    title,
                    `자동 생성된 이슈 #${i + 1}입니다.\n\n상세 내용:\n- 항목 A\n- 항목 B`,
                    priority,
                    label,
                    status,
                    assigneeUser.name,
                    creator.id,
                    createdAt.toISOString(),
                    createdAt.toISOString(),
                    createdAt.toISOString(),
                    new Date(createdAt.getTime() + 86400000 * 14).toISOString(),
                    milestoneId,
                    function (err) {
                        if (err) { console.error(err); return; }
                        const issueId = this.lastID;
                        createdIssueIds.push(issueId);
                        issueCount++;

                        if (issueCount % 10 === 0) console.log(`... Generated ${issueCount} issues`);

                        // Initial Commit
                        if (Math.random() > 0.5) {
                            createCommit(issueId, `Initial work for ${title}`, createdAt);
                        }

                        // Simulate Lifecycle
                        let currentDate = new Date(createdAt);

                        // Comments
                        const commentCount = Math.floor(Math.random() * 4); // 0~3 comments
                        for (let c = 0; c < commentCount; c++) {
                            currentDate = new Date(currentDate.getTime() + 3600000 * (c + 1));
                            stmtComment.run(issueId, getRandomItem(users).id, `랜덤 코멘트 ${c + 1}입니다. 확인 부탁드립니다.`, currentDate.toISOString());
                        }

                        // Status Transitions
                        if (Math.random() > 0.2) {
                            // Move to IN_PROGRESS
                            stmtLog.run(issueId, creator.id, 'STATUS_CHANGE', 'OPEN', 'IN_PROGRESS', currentDate.toISOString());
                            status = 'IN_PROGRESS';
                            createCommit(issueId, `Progress update for ${title}`, currentDate);

                            if (Math.random() > 0.4) {
                                // Close it
                                const closeDate = new Date(currentDate.getTime() + 86400000);
                                stmtLog.run(issueId, creator.id, 'STATUS_CHANGE', 'IN_PROGRESS', 'CLOSED', closeDate.toISOString());
                                status = 'CLOSED';
                                createCommit(issueId, `Fixed ${title}`, closeDate);
                            }
                        }

                        // Final Status Update
                        db.run("UPDATE issues SET status = ? WHERE id = ?", [status, issueId]);
                    }
                );
            }

            // Relations (After issues are created)
            // Since parallelize doesn't guarantee execution order of callbacks, use a timeout for relation generation
            setTimeout(() => {
                console.log("🔗 Generating Relations...");
                const relationTypes = ['BLOCKS', 'RELATED', 'SUBTASK'];

                // Randomly link issues
                for (let i = 0; i < 20; i++) {
                    const sourceId = getRandomItem(createdIssueIds);
                    const targetId = getRandomItem(createdIssueIds);

                    if (sourceId !== targetId) {
                        const type = getRandomItem(relationTypes);
                        const creator = getRandomItem(users);
                        stmtRelation.run(sourceId, targetId, type, creator.id);
                    }
                }

                stmtIssue.finalize();
                stmtLog.finalize();
                stmtComment.finalize();
                stmtRelation.finalize();

                console.log("✅ Data generation complete!");
                db.close();
            }, 5000); // 5 sec delay to ensure all issues inserted
        });
    });
});
