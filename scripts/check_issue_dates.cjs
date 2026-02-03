const db = require('../server/db');

db.serialize(() => {
    db.all("SELECT id, title, created_at FROM issues WHERE id IN (60, 61)", (err, rows) => {
        if (err) console.error(err);
        else console.log(JSON.stringify(rows, null, 2));
    });
});
