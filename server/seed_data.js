const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const USERNAMES = ['권담당', '김개발', '이디자', '박기획', '최테스', '정매니', '강품질'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const LABELS = ['BUG', 'FEATURE', 'ENHANCEMENT', 'TASK'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'VERIFICATION_NEEDED', 'CLOSED'];

// Random helper
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
};

const TERMS = ['로그인', 'API', 'DB', 'UI', '결제', '배포', '보안', '검색', '필터', '애니메이션', '리팩토링', '테스트', '문서화'];
const ACTIONS = ['수정', '개발', '개선', '버그 픽스', '최적화', '업데이트', '검토', '설계'];

function seed() {
    db.serialize(() => {
        console.log('🌱 Starting Seed Process...');

        // 1. Clear Data
        db.run('DELETE FROM issues');
        db.run('DELETE FROM comments');
        // db.run('DELETE FROM users WHERE role != "ADMIN"'); // Optional: Keep existing admins
        console.log('🧹 Cleared existing issues and comments.');

        // 2. Create Dummy Users
        let userIds = [];
        // Available users including generic names and potentially the logged in user (Admin Name is 'Adin User')
        // We will insert these users so they exist for assignment
        // Since we don't know existing IDs easily without query, let's just use names for assignment as per current app logic (assignee stores Name)
        // But for creator_id we need ID.
        // Let's create these users if they don't exist and capture their IDs.

        // Actually, to simulate "My Issues", we need to know who "I" am. 
        // The user logs in as 'admin' (User 1 usually). 
        // We will assign a good chunk to 'Admin User'.

        const FULL_USER_LIST = ['Admin User', ...USERNAMES];

        console.log('👥 Ensuring users exist...');
        // We won't implement full user creation logic here strictly to avoid unique constraint mess if run multiple times without deleting users.
        // Instead we'll just assume Admin exists and maybe use placeholder IDs for creators for now, 
        // OR query existing users.

        db.all('SELECT id, name FROM users', (err, rows) => {
            if (err) {
                console.error(err);
                return;
            }

            const existingNames = rows.map(r => r.name);
            const creatorIds = rows.map(r => r.id);

            // Generate 100 Issues
            const stmt = db.prepare(`INSERT INTO issues 
                (title, description, status, priority, label, assignee, creator_id, created_at, updated_at, start_date, due_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            const now = new Date();
            const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const twoMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 2, 1);

            for (let i = 0; i < 100; i++) {
                const title = `[${random(LABELS)}] ${random(TERMS)} ${random(ACTIONS)} #${i + 1}`;
                const description = `자동 생성된 이슈입니다.\n\n주요 내용:\n- ${random(TERMS)} 관련 이슈\n- 상세 분석 필요`;
                const created = randomDate(oneMonthAgo, now);

                // Dates for Schedule
                // Start date: created + random 0-10 days
                // Due date: start + random 1-30 days
                const startDateObj = new Date(new Date(created).getTime() + Math.random() * 86400000 * 10);
                const dueDateObj = new Date(startDateObj.getTime() + Math.random() * 86400000 * 30);

                const startDate = startDateObj.toISOString();
                const dueDate = dueDateObj.toISOString();

                // Weighted Assignee: 30% chance for 'Admin User' (Create a lot for "My Schedule")
                let assignee;
                if (Math.random() < 0.3) {
                    assignee = 'Admin User'; // Assuming this is the main user's name
                } else {
                    assignee = random(USERNAMES);
                }

                // Creator: Random existing ID or 1 (Admin)
                const creatorId = creatorIds.length > 0 ? random(creatorIds) : 1;

                stmt.run(
                    title,
                    description,
                    random(STATUSES),
                    random(PRIORITIES),
                    random(LABELS),
                    assignee,
                    creatorId,
                    created,
                    created,
                    startDate,
                    dueDate
                );
            }
            stmt.finalize();
            console.log('✅ Generated 100 random issues.');
        });
    });
}

seed();
