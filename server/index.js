const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the frontend build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wiki', require('./routes/wiki'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/milestones', require('./routes/milestones'));
app.use('/api/relations', require('./routes/relations'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/integrations', require('./routes/integrations'));

// Catch-all handler for SPA (Vue Router)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
        console.log(`(Login with: admin / admin123)`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 100}...`);
            startServer(port + 100);
        } else {
            console.error(err);
        }
    });
};

// Initialize VCS Service (Auto-Sync if enabled)
const vcsService = require('./services/vcsService');
vcsService.startSync();

startServer(PORT);
