const vcsService = require('../server/services/vcsService');

console.log('--- Monitoring Auto-Sync (10 seconds) ---');

// Mock console.log to show timestamps
const originalLog = console.log;
console.log = (...args) => {
    originalLog(`[${new Date().toISOString().split('T')[1].split('.')[0]}]`, ...args);
};

// Start the sync service
vcsService.startSync();

// Keep alive for 10 seconds then exit
setTimeout(() => {
    console.log('--- Monitoring Finished ---');
    process.exit(0);
}, 10000);
