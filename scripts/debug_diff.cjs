const vcsService = require('../server/services/vcsService');

async function debug() {
    // Commit 702eaae is from Issue #60 (Git)
    const revision = '702eaae';
    const repoName = 'Sample Project Repo';

    console.log(`Fetching diff for ${repoName} : ${revision}`);
    const diffText = await vcsService.getDiff(repoName, revision);

    console.log('--- Raw Diff Start ---');
    console.log(diffText);
    console.log('--- Raw Diff End ---');

    console.log('\n--- Regex Test ---');
    // Regex from IssueDetail.vue
    const match = diffText.match(/diff --git a\/.*? b\/(.*?)(\n|$)/)
        || diffText.match(/\+\+\+ (?:b\/)?(.*?)(\n|$)/)
        || diffText.match(/Index: (.*?)(\n|$)/);

    if (match) {
        console.log('MATCH FOUND!');
        console.log('Filename:', match[1].trim());
        const filename = match[1].trim();
        const ext = filename.split('.').pop().toLowerCase();
        console.log('Extension:', ext);
    } else {
        console.log('NO MATCH FOUND');
    }
}

debug().catch(console.error);
