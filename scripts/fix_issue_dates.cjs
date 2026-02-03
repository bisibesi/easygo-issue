const db = require('../server/db');

const now = new Date().toISOString();

db.serialize(() => {
    const sql = `UPDATE issues SET created_at = ? WHERE id IN (60, 61)`;
    db.run(sql, [now], function (err) {
        if (err) console.error(err);
        else console.log(`Updated ${this.changes} rows with created_at = ${now}`);
    });
});
