const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

function initDb() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            name TEXT,
            role TEXT DEFAULT 'USER'
        )`);

        // Migration: Add role column if not exists
        db.all("PRAGMA table_info(users)", (err, columns) => {
            if (!columns.some(col => col.name === 'role')) {
                db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER'");
                console.log('Migrated: Added role column to users');
            }
        });

        // Wiki Pages Table
        db.run(`CREATE TABLE IF NOT EXISTS pages (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT,
            content_ko TEXT,
            content_en TEXT,
            updatedAt TEXT,
            required_role TEXT DEFAULT 'USER'
        )`);

        // Issues Table
        db.run(`CREATE TABLE IF NOT EXISTS issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            description TEXT,
            status TEXT DEFAULT 'OPEN',
            priority TEXT DEFAULT 'Medium',
            label TEXT DEFAULT 'TASK',
            assignee TEXT,
            creator_id INTEGER,
            created_at TEXT,
            updated_at TEXT,
            start_date TEXT,
            due_date TEXT
        )`);

        // Comments Table
        db.run(`CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            issue_id INTEGER,
            user_id INTEGER,
            content TEXT,
            created_at TEXT,
            FOREIGN KEY(issue_id) REFERENCES issues(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Audit Logs Table
        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            issue_id INTEGER,
            user_id INTEGER,
            action TEXT,
            old_value TEXT,
            new_value TEXT,
            created_at TEXT,
            FOREIGN KEY(issue_id) REFERENCES issues(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Notifications Table
        db.run(`CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            type TEXT,
            message TEXT,
            issue_id INTEGER,
            is_read INTEGER DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(issue_id) REFERENCES issues(id)
        )`);

        // Issue Relations Table
        db.run(`CREATE TABLE IF NOT EXISTS issue_relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            issue_id INTEGER,
            related_issue_id INTEGER,
            relation_type TEXT, -- BLOCKS, RELATED, SUBTASK
            FOREIGN KEY(issue_id) REFERENCES issues(id),
            FOREIGN KEY(related_issue_id) REFERENCES issues(id)
        )`);

        // Milestones Table
        db.run(`CREATE TABLE IF NOT EXISTS milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            description TEXT,
            due_date TEXT,
            created_at TEXT
        )`);

        // Migration: Add creator_id column if not exists
        db.all("PRAGMA table_info(issues)", (err, columns) => {
            if (!columns.some(col => col.name === 'creator_id')) {
                db.run("ALTER TABLE issues ADD COLUMN creator_id INTEGER");
                console.log('Migrated: Added creator_id column to issues');
            }
        });

        // Migration: Add start_date and due_date columns if not exists
        db.all("PRAGMA table_info(issues)", (err, columns) => {
            const columnNames = columns.map(c => c.name);
            if (!columnNames.includes('start_date')) {
                db.run("ALTER TABLE issues ADD COLUMN start_date TEXT");
                console.log('Migrated: Added start_date column to issues');
            }
            if (!columnNames.includes('due_date')) {
                db.run("ALTER TABLE issues ADD COLUMN due_date TEXT");
                console.log('Migrated: Added due_date column to issues');
            }
            if (!columnNames.includes('label')) {
                db.run("ALTER TABLE issues ADD COLUMN label TEXT DEFAULT 'TASK'");
                console.log('Migrated: Added label column to issues');
            }
            // Add resolution column migration
            if (!columnNames.includes('resolution')) {
                db.run(`ALTER TABLE issues ADD COLUMN resolution TEXT`, (err) => {
                    if (!err) console.log("Added 'resolution' column to issues table.");
                });
            }
            // Add attachments column (JSON string of file paths)
            if (!columnNames.includes('attachments')) {
                db.run(`ALTER TABLE issues ADD COLUMN attachments TEXT`, (err) => {
                    if (!err) console.log("Added 'attachments' column to issues table.");
                });
            }
            // Add milestone_id column
            if (!columnNames.includes('milestone_id')) {
                db.run(`ALTER TABLE issues ADD COLUMN milestone_id INTEGER`, (err) => {
                    if (!err) console.log("Added 'milestone_id' column to issues table.");
                });
            }
        });

        // Wiki Pages Migration
        db.all("PRAGMA table_info(pages)", (err, rows) => {
            if (err) return;
            const columnNames = rows.map(row => row.name);
            if (!columnNames.includes('required_role')) {
                db.run("ALTER TABLE pages ADD COLUMN required_role TEXT DEFAULT 'USER'");
                console.log('Migrated: Added required_role column to pages');
            }
        });

        // Migration: Add creator_id to issue_relations if not exists
        db.all("PRAGMA table_info(issue_relations)", (err, columns) => {
            if (!columns.some(col => col.name === 'creator_id')) {
                db.run("ALTER TABLE issue_relations ADD COLUMN creator_id INTEGER");
                console.log('Migrated: Added creator_id column to issue_relations');
            }
        });


        // Migration: Add content_ko and content_en columns to pages if not exists
        db.all("PRAGMA table_info(pages)", (err, columns) => {
            if (err) {
                console.error('Error checking pages table:', err);
                return;
            }

            const hasContentKo = columns.some(col => col.name === 'content_ko');
            const hasContentEn = columns.some(col => col.name === 'content_en');
            const hasRequiredRole = columns.some(col => col.name === 'required_role');

            // Add content_ko column and migrate data
            if (!hasContentKo) {
                db.run("ALTER TABLE pages ADD COLUMN content_ko TEXT", (err) => {
                    if (err) {
                        console.error('Error adding content_ko column:', err);
                    } else {
                        console.log('Migrated: Added content_ko column to pages');
                        // Migrate existing content to content_ko
                        db.run("UPDATE pages SET content_ko = content WHERE content_ko IS NULL", (err) => {
                            if (err) {
                                console.error('Error migrating content to content_ko:', err);
                            } else {
                                console.log('Migrated: Copied existing content to content_ko');
                            }
                        });
                    }
                });
            }

            // Add content_en column
            if (!hasContentEn) {
                db.run("ALTER TABLE pages ADD COLUMN content_en TEXT DEFAULT ''", (err) => {
                    if (err) {
                        console.error('Error adding content_en column:', err);
                    } else {
                        console.log('Migrated: Added content_en column to pages');
                    }
                });
            }

            // Add required_role column
            if (!hasRequiredRole) {
                db.run("ALTER TABLE pages ADD COLUMN required_role TEXT DEFAULT 'USER'", (err) => {
                    if (err) {
                        console.error('Error adding required_role column:', err);
                    } else {
                        console.log('Migrated: Added required_role column to pages');
                    }
                });
            }
        });

        // Create default admin user if not exists
        db.get("SELECT * FROM users WHERE email = ?", ['admin'], (err, row) => {
            if (!row) {
                const hash = bcrypt.hashSync('admin123', 10);
                // Admin has ROLE = 'ADMIN'
                db.run("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
                    ['admin', hash, 'Admin User', 'ADMIN']);
                console.log('Default admin user created: admin / admin123 (Role: ADMIN)');
            } else {
                // Ensure existing admin has ADMIN role
                if (row.role !== 'ADMIN') {
                    db.run("UPDATE users SET role = 'ADMIN' WHERE email = 'admin'");
                    console.log('Updated admin user role to ADMIN');
                }
            }
        });

        // Create default standard user if not exists
        db.get("SELECT * FROM users WHERE email = ?", ['user'], (err, row) => {
            if (!row) {
                const hash = bcrypt.hashSync('user123', 10);
                // User has ROLE = 'USER'
                db.run("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
                    ['user', hash, 'Standard User', 'USER']);
                console.log('Default standard user created: user / user123 (Role: USER)');
            }
        });

        // Create default Wiki Home if not exists
        const defaultContentKo = `# 마크다운 작성 가이드

위키에 오신 것을 환영합니다! 왼쪽은 적용 결과, 오른쪽은 작성 코드 예시입니다.

## 1. 텍스트 스타일
- **굵게** : \`**굵게**\`
- *기울임* : \`*기울임*\`
- ~~취소선~~ : \`~~취소선~~\`
- \`강조(Code)\` : \`\`강조(Code)\`\`

## 2. 목록
- 순서 없는 목록 : \`- 순서 없는 목록\`
- 1. 순서 있는 목록 : \`1. 순서 있는 목록\`
- [ ] 체크박스 : \`- [ ] 체크박스\`

## 3. 기타 요소
- [링크](http://localhost:3000) : \`[링크](URL)\`
- > 인용문 : \`> 인용문\`
- 구분선 : \`---\`

## 4. 코드 블록
\`\`\`javascript
console.log('Code Block');
\`\`\`
작성법:
\`\`\`
\`\`\`javascript
console.log('Code Block');
\`\`\`
\`\`\`
`;

        const defaultContentEn = `# Markdown Writing Guide

Welcome to the Wiki! The left shows the rendered result, the right shows the code examples.

## 1. Text Styles
- **Bold** : \`**Bold**\`
- *Italic* : \`*Italic*\`
- ~~Strikethrough~~ : \`~~Strikethrough~~\`
- \`Code\` : \`\`Code\`\`

## 2. Lists
- Unordered list : \`- Unordered list\`
- 1. Ordered list : \`1. Ordered list\`
- [ ] Checkbox : \`- [ ] Checkbox\`

## 3. Other Elements
- [Link](http://localhost:3000) : \`[Link](URL)\`
- > Blockquote : \`> Blockquote\`
- Horizontal rule : \`---\`

## 4. Code Block
\`\`\`javascript
console.log('Code Block');
\`\`\`
Syntax:
\`\`\`
\`\`\`javascript
console.log('Code Block');
\`\`\`
\`\`\`
`;

        db.run("INSERT OR IGNORE INTO pages (id, title, content, content_ko, content_en, updatedAt, required_role) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ['home', '마크다운 작성 가이드', defaultContentKo, defaultContentKo, defaultContentEn, new Date().toISOString(), 'USER'],
            function (err) {
                if (this.changes > 0) {
                    console.log('Default Wiki Home created with multilingual content');
                }
            });
    });
}

initDb();

// Integrations (Slack, Notion, Git settings)
db.run(`CREATE TABLE IF NOT EXISTS integrations (
    key TEXT PRIMARY KEY,
    value TEXT
)`);

module.exports = db;
