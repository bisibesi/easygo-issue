const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../server/database.sqlite');
const db = new sqlite3.Database(dbPath);

const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const classes = ['BUG', 'FEATURE', 'ENHANCEMENT', 'TASK'];
const statuses = ['OPEN', 'IN_PROGRESS', 'VERIFICATION_NEEDED', 'CLOSED'];

const titles = [
    "로그인 페이지 디자인 수정", "API 응답 속도 개선", "사용자 프로필 이미지 업로드 오류",
    "다크 모드 지원 추가", "모바일 레이아웃 깨짐 현상", "결제 모듈 연동 테스트",
    "비밀번호 찾기 기능 구현", "메인 대시보드 차트 버그", "알림 설정 페이지 UI 변경",
    "데이터베이스 백업 스크립트 작성", "신규 회원 가입 이메일 발송 실패",
    "검색 기능 필터링 강화", "푸시 알림 서비스 연동", "로그아웃 버튼 위치 변경",
    "약관 동의 팝업 수정", "관리자 페이지 접근 권한 오류", "파일 다운로드 속도 저하",
    "채팅 기능 웹소켓 연결 끊김", "상품 목록 페이징 처리 오류", "주문 내역 엑셀 다운로드 기능"
];

const descriptions = [
    "해당 기능이 정상적으로 동작하지 않습니다. 확인 부탁드립니다.",
    "사용자 경험 향상을 위해 디자인 변경이 필요합니다.",
    "간헐적으로 발생하는 서버 오류를 수정해야 합니다.",
    "기존 로직이 비효율적이어서 리팩토링이 필요합니다.",
    "새로운 요구사항에 맞춰 기능을 업데이트해야 합니다.",
    "보안 취약점이 발견되어 긴급 패치가 필요합니다.",
    "테스트 시나리오에 따라 검증을 진행해주세요."
];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

db.serialize(() => {
    // 1. Fetch Users
    db.all("SELECT id, name FROM users", (err, users) => {
        if (err) {
            console.error("Failed to fetch users:", err);
            return;
        }

        if (users.length === 0) {
            console.log("No users found. Creating a default admin...");
            // Fallback if no users (shouldn't happen usually)
            users.push({ id: 1, name: 'admin' });
        }

        console.log(`Found ${users.length} users. Starting seeding...`);

        // 2. Clear Issues
        db.run("DELETE FROM issues", (err) => {
            if (err) {
                console.error("Failed to clear issues:", err);
                return;
            }
            console.log("🗑️ Cleared existing issues.");

            // 3. Reset ID Sequence
            db.run("DELETE FROM sqlite_sequence WHERE name='issues'", (err) => {
                if (err) console.log("Failed to reset sequence (might not be an error if empty):", err.message);
            });

            // 4. Insert 100 Random Issues
            const stmt = db.prepare(`INSERT INTO issues (
                title, description, priority, label, status, 
                assignee, creator_id, created_at, updated_at, 
                start_date, due_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            const now = new Date();
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(now.getMonth() - 1);
            const oneMonthLater = new Date();
            oneMonthLater.setMonth(now.getMonth() + 1);

            db.parallelize(() => {
                for (let i = 0; i < 100; i++) {
                    const title = getRandomItem(titles) + " " + (i + 1);
                    const description = getRandomItem(descriptions);
                    const priority = getRandomItem(priorities);
                    const label = getRandomItem(classes);
                    const status = getRandomItem(statuses);

                    const creator = getRandomItem(users);
                    const assignee = Math.random() > 0.3 ? getRandomItem(users).name : null; // 70% assigned

                    const createdAt = getRandomDate(oneMonthAgo, now);
                    let startDate = getRandomDate(new Date(createdAt), oneMonthLater);
                    let dueDate = getRandomDate(new Date(startDate), oneMonthLater);

                    let updatedAt = getRandomDate(new Date(createdAt), now);

                    // Bias closed dates to test metrics
                    if (status === 'CLOSED') {
                        const roll = Math.random();
                        const dueTs = new Date(dueDate).getTime();
                        if (roll < 0.3) {
                            // Early: 1-5 days before due
                            const earlyDays = Math.floor(Math.random() * 5) + 1;
                            updatedAt = new Date(dueTs - (earlyDays * 24 * 60 * 60 * 1000)).toISOString();
                        } else if (roll < 0.6) {
                            // Late: 1-5 days after due
                            const lateDays = Math.floor(Math.random() * 5) + 1;
                            updatedAt = new Date(dueTs + (lateDays * 24 * 60 * 60 * 1000)).toISOString();
                        } else {
                            // On Time: Same day as due
                            updatedAt = new Date(dueTs).toISOString();
                        }
                    }

                    stmt.run(
                        title, description, priority, label, status,
                        assignee, creator.id, createdAt, updatedAt,
                        startDate, dueDate
                    );
                }
            });

            stmt.finalize(() => {
                console.log("✅ Successfully seeded 100 random issues.");
                db.close();
            });
        });
    });
});
