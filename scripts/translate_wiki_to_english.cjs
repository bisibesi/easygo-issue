const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'database.db');
const db = new sqlite3.Database(dbPath);

const englishContent = `# Markdown Writing Guide

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

db.run(
    "UPDATE pages SET content_en = ? WHERE id = 'home'",
    [englishContent],
    function (err) {
        if (err) {
            console.error('Error updating English content:', err);
        } else {
            console.log('✓ Successfully updated English content for home page');
            console.log(`  Rows affected: ${this.changes}`);
        }
        db.close();
    }
);
