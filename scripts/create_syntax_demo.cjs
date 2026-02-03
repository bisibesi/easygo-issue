const db = require('../server/db');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoPath = path.resolve(__dirname, '../server/sample_repo');

// 1. Create Issue
db.serialize(() => {
    const sql = `INSERT INTO issues (title, description, status, priority, label) VALUES (?, ?, 'OPEN', 'MEDIUM', 'FEATURE')`;
    db.run(sql, ['Syntax Highlighting Demo', 'Demonstrating highlighting for various file types: JS, CSS, JSON, SQL, Bash, XML, Vue.'], function (err) {
        if (err) return console.error(err);
        const issueId = this.lastID;
        console.log(`Created Issue #${issueId}`);

        // 2. Create Syntax Files
        const files = {
            'demo.js': `function hello() {\n  console.log("Hello JS");\n  const x = 10;\n}`,
            'demo.css': `body {\n  background: #f0f0f0;\n  color: #333;\n}`,
            'demo.json': `{\n  "key": "value",\n  "count": 100\n}`,
            'demo.sql': `SELECT * FROM users WHERE id = 1;`,
            'demo.sh': `#!/bin/bash\necho "Hello Bash"`,
            'demo.xml': `<root>\n  <item id="1">Value</item>\n</root>`,
            'demo.vue': `<template>\n  <div>Vue Component</div>\n</template>`,
            'demo.txt': `Simple text file.\nThis should utilize the Manual renderer.`
        };

        Object.entries(files).forEach(([name, content]) => {
            fs.writeFileSync(path.join(repoPath, name), content);
        });

        // 3. Commit
        exec(`git add . && git commit -m "feat: Add syntax examples for issue #${issueId}"`, { cwd: repoPath }, (error, stdout, stderr) => {
            if (error) {
                console.error('Git error:', error);
                return;
            }
            console.log('Git Output:', stdout);
        });
    });
});
