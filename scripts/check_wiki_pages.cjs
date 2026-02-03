const db = require('../server/db');

db.all('SELECT id, title FROM pages', (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Wiki Pages:');
        console.log(JSON.stringify(rows, null, 2));
    }
    process.exit(0);
});
