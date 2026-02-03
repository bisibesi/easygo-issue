const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let config = { repositories: [] };
try {
    const configPath = path.join(__dirname, '../../vcs_config.json');
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
} catch (e) {
    console.error('Failed to load VCS config:', e);
}

const execPromise = (cmd, cwd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd }, (error, stdout, stderr) => {
            if (error) {
                // Determine if it's a "no matches found" error (grep failure) vs strict error
                // For git log grep, exit code 1 means no match, which is fine.
                resolve({ stdout: '', stderr });
                return;
            }
            resolve({ stdout, stderr });
        });
    });
};

const vcsService = {
    async getCommits(issueId) {
        const results = [];
        const idPattern = `#${issueId}`;

        for (const repo of config.repositories) {
            try {
                if (repo.type === 'GIT') {
                    // Git Log Format: Hash|Author|Date|Message
                    const cmd = `git log --grep="${idPattern}" --pretty=format:"%h|%an|%ad|%s" --date=iso`;
                    const { stdout } = await execPromise(cmd, repo.path);

                    if (stdout) {
                        const lines = stdout.split('\n').filter(line => line.trim() !== '');
                        lines.forEach(line => {
                            const [hash, author, date, message] = line.split('|');
                            results.push({
                                repo: repo.name,
                                type: 'GIT',
                                revision: hash,
                                author,
                                date,
                                message
                            });
                        });
                    }
                } else if (repo.type === 'SVN') {
                    // SVN logic (Basic implementation using --search if available or xml parsing)
                    let authFlags = '';
                    if (repo.auth && repo.auth.username && repo.auth.password) {
                        authFlags = ` --username "${repo.auth.username}" --password "${repo.auth.password}" --no-auth-cache --non-interactive`;
                    }

                    const svnCmd = config.svnExecutablePath ? `"${config.svnExecutablePath}"` : 'svn';
                    const cmd = `${svnCmd} log --search "${idPattern}" --xml${authFlags}`;
                    const { stdout } = await execPromise(cmd, repo.path);

                    // Simple Regex XML parsing for SVN
                    const entryRegex = /<logentry\s+revision="([^"]+)">[\s\S]*?<author>(.*?)<\/author>[\s\S]*?<date>(.*?)<\/date>[\s\S]*?<msg>([\s\S]*?)<\/msg>[\s\S]*?<\/logentry>/g;
                    let match;
                    while ((match = entryRegex.exec(stdout)) !== null) {
                        results.push({
                            repo: repo.name,
                            type: 'SVN',
                            revision: match[1],
                            author: match[2],
                            date: match[3],
                            message: match[4].trim()
                        });
                    }
                }
            } catch (e) {
                console.error(`Error fetching commits for repo ${repo.name}:`, e);
            }
        }

        // Sort results by date desc
        return results.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    async getDiff(repoName, revision) {
        const repo = config.repositories.find(r => r.name === repoName);
        if (!repo) throw new Error('Repository not found');

        let authFlags = '';
        if (repo.type === 'SVN' && repo.auth && repo.auth.username && repo.auth.password) {
            authFlags = ` --username "${repo.auth.username}" --password "${repo.auth.password}" --no-auth-cache --non-interactive`;
        }

        if (repo.type === 'GIT') {
            // git show revision
            const cmd = `git show --pretty=format:"" ${revision}`;
            const { stdout } = await execPromise(cmd, repo.path);
            return stdout;
        } else if (repo.type === 'SVN') {
            // svn diff -c revision
            const svnCmd = config.svnExecutablePath ? `"${config.svnExecutablePath}"` : 'svn';
            const cmd = `${svnCmd} diff -c ${revision}${authFlags}`;
            const { stdout } = await execPromise(cmd, repo.path);
            return stdout;
        }
        return '';
    },

    async syncRepo(repo) {
        console.log(`[Auto-Sync] Syncing ${repo.name}...`);
        try {
            if (repo.type === 'GIT') {
                await execPromise('git pull', repo.path);
            } else if (repo.type === 'SVN') {
                let authFlags = '';
                if (repo.auth && repo.auth.username && repo.auth.password) {
                    authFlags = ` --username "${repo.auth.username}" --password "${repo.auth.password}" --no-auth-cache --non-interactive`;
                }
                const svnCmd = config.svnExecutablePath ? `"${config.svnExecutablePath}"` : 'svn';
                await execPromise(`${svnCmd} update${authFlags}`, repo.path);
            }
            console.log(`[Auto-Sync] ${repo.name} synced.`);
        } catch (e) {
            console.error(`[Auto-Sync] Failed to sync ${repo.name}:`, e.message);
        }
    },

    startSync() {
        if (!config.autoSync || !config.autoSync.enabled) return;

        console.log(`[Auto-Sync] Enabled. Interval: ${config.autoSync.intervalSeconds}s`);

        // Initial sync
        config.repositories.forEach(repo => this.syncRepo(repo));

        // Schedule sync
        setInterval(() => {
            config.repositories.forEach(repo => this.syncRepo(repo));
        }, config.autoSync.intervalSeconds * 1000);
    }
};

module.exports = vcsService;
