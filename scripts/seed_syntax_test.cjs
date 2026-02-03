const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const dbPath = path.resolve(__dirname, '../server/database.sqlite');
const repoPath = path.resolve(__dirname, '../server/sample_repo');

// Ensure repo exists
if (!fs.existsSync(repoPath)) {
    console.error('Repo not found at ' + repoPath);
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const execGit = (cmd) => {
    try {
        execSync(cmd, { cwd: repoPath, stdio: 'inherit' });
    } catch (e) {
        console.error(`Git command failed: ${cmd}`, e);
    }
};

(async () => {
    try {
        console.log('Creating Test Issue...');
        const title = 'Syntax Highlighting Verification';
        const description = '<p>This issue is for testing syntax highlighting of various file types in Git Diffs.</p>';

        // 1. Create Issue
        const result = await runQuery(
            `INSERT INTO issues (title, description, status, priority, label, assignee, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [title, description, 'OPEN', 'MEDIUM', 'TASK', 'admin']
        );

        const issueId = result.lastID;
        console.log(`Created Issue #${issueId}`);

        // 2. Generate Commits for each type
        const files = [
            {
                name: 'test_script.js',
                content: `function hello(name) {
    const greeting = "Hello " + name;
    console.log(greeting);
    return {
        timestamp: Date.now(),
        message: greeting
    };
}`,
                msg: `Add JavaScript feature logic #${issueId}`
            },
            {
                name: 'config.json',
                content: `{
    "app": "issue-tracker",
    "version": "1.0.0",
    "features": {
        "darkMode": true,
        "logging": false
    }
}`,
                msg: `Update system configuration JSON #${issueId}`
            },
            {
                name: 'styles.css',
                content: `.container {
    display: flex;
    justify-content: center;
    background-color: #f0f0f0;
}
.text-primary {
    color: #3b82f6;
    font-weight: bold;
}`,
                msg: `Refactor CSS styles #${issueId}`
            },
            {
                name: 'schema.sql',
                content: `CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

SELECT * FROM users WHERE active = 1;`,
                msg: `Update database schema SQL #${issueId}`
            },
            {
                name: 'App.vue',
                content: `<template>
  <div class="app">
    <h1>{{ title }}</h1>
    <button @click="count++">Count: {{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const title = ref('Hello Vue')
const count = ref(0)
</script>`,
                msg: `Add Vue component #${issueId}`
            },
            {
                name: 'deploy.sh',
                content: `#!/bin/bash
echo "Deploying application..."
npm run build
if [ $? -eq 0 ]; then
    echo "Build success!"
    cp -r dist/ /var/www/html/
else
    echo "Build failed!"
    exit 1
fi`,
                msg: `Update deployment script #${issueId}`
            }
        ];

        console.log('Generating Commits...');

        for (const file of files) {
            const filePath = path.join(repoPath, file.name);
            fs.writeFileSync(filePath, file.content);
            execGit(`git add .`);
            execGit(`git commit -m "${file.msg}"`);
            console.log(`Committed ${file.name}`);

            // Wait a bit to ensure timestamp diffs if needed
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log('Done! Check Issue #' + issueId);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        db.close();
    }
})();
