const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const dbPath = path.resolve(__dirname, '../server/database.sqlite');
const repoPath = path.resolve(__dirname, '../server/sample_repo');

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
        console.log('Creating Diff Test Issue...');
        const title = 'Diff Visualization Verification';
        const description = '<p>Check the "Development" tab to see syntax highlighting for modified files.</p>';

        // 1. Create Issue #57
        const result = await runQuery(
            `INSERT INTO issues (title, description, status, priority, label, assignee, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [title, description, 'IN_PROGRESS', 'HIGH', 'ENHANCEMENT', 'admin']
        );

        const issueId = result.lastID;
        console.log(`Created Issue #${issueId}`);

        // 2. Modify files
        const modifications = [
            {
                name: 'test_script.js',
                content: `function hello(name) {
    const greeting = "Hello " + name.toUpperCase(); // Changed to upper case
    // console.log(greeting); // Removed log
    return {
        timestamp: Date.now(),
        message: greeting,
        status: 'ok' // Added status field
    };
}`,
                msg: `Update JS logic and return types #${issueId}`
            },
            {
                name: 'config.json',
                content: `{
    "app": "issue-tracker-pro",
    "version": "1.1.0",
    "features": {
        "darkMode": true,
        "logging": true,
        "analytics": {
            "enabled": true
        }
    }
}`,
                msg: `Enable logging and upgrade version #${issueId}`
            },
            {
                name: 'styles.css',
                content: `.container {
    display: grid; /* Changed flex to grid */
    place-items: center;
    background-color: #222; /* Dark theme */
    color: white;
}
.text-primary {
    color: #60a5fa; /* Lighter blue */
    font-weight: 800;
}
.new-class {
    margin: 1rem;
}`,
                msg: `Update CSS for dark mode and grid layout #${issueId}`
            },
            {
                name: 'schema.sql',
                content: `CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE, -- Added email
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME -- Added login tracker
);

SELECT * FROM users WHERE active = 1 AND banned = 0;`,
                msg: `Add email and last_login to User schema #${issueId}`
            },
            {
                name: 'App.vue',
                content: `<template>
  <div class="app dark-mode">
    <h1>{{ title }}</h1>
    <div class="counter">
        <button @click="decrement">-</button>
        <span>{{ count }}</span>
        <button @click="increment">+</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const title = ref('Vue Counter App') // Changed title
const count = ref(10) // Start at 10

const increment = () => count.value++
const decrement = () => count.value--
</script>`,
                msg: `Enhance Vue Counter functionality #${issueId}`
            },
            {
                name: 'deploy.sh',
                content: `#!/bin/bash
echo "Starting deployment..."
npm run test
if [ $? -ne 0 ]; then
    echo "Tests failed! Aborting."
    exit 1
fi

npm run build
if [ $? -eq 0 ]; then
    echo "Build success! Deploying to production..."
    rsync -avz dist/ user@server:/var/www/
else
    echo "Build failed!"
    exit 1
fi`,
                msg: `Add tests and rsync to deploy script #${issueId}`
            }
        ];

        console.log('Generating Modifications...');

        for (const file of modifications) {
            const filePath = path.join(repoPath, file.name);
            fs.writeFileSync(filePath, file.content);
            execGit(`git add .`);
            execGit(`git commit -m "${file.msg}"`);
            console.log(`Committed modification for ${file.name}`);

            // Wait a bit
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log('Done! Check Issue #' + issueId);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        db.close();
    }
})();
