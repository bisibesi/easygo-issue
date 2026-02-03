const vcsService = require('../server/services/vcsService');

async function verify() {
    console.log('--- Checking Issue #60 ---');
    const commits60 = await vcsService.getCommits(60);
    console.log(JSON.stringify(commits60, null, 2));

    console.log('--- Checking Issue #61 ---');
    const commits61 = await vcsService.getCommits(61);
    console.log(JSON.stringify(commits61, null, 2));
}

verify().catch(console.error);
