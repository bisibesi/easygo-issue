const db = require('../server/db');

const title = 'GIT/SVN 연동 가이드 (신규)';
const content = `## GIT/SVN 연동 설정 가이드

본 시스템은 GIT 및 SVN과의 연동을 지원합니다. 설정은 프로젝트 루트 디렉토리의 **vcs_config.json** 파일을 통해 관리됩니다.

### 설정 방법

1. 루트 디렉토리의 \`vcs_config.json\` 파일을 엽니다.
2. 아래 형식을 참고하여 저장소 정보를 입력합니다.

\`\`\`json
{
  "repositories": [
    {
      "type": "GIT",
      "name": "프로젝트 명",
      "path": "/path/to/repo",
      "auth": {
          "username": "...",
          "password": "..."
      }
    }
  ]
}
\`\`\`

> **참고**: 로컬 경로(\`/path/to/repo\`)를 사용할 경우 대부분 인증 정보가 필요 없으나, SVN 원격 저장소나 보안된 환경에서는 \`auth\` 정보를 입력하면 해당 자격 증명으로 명령을 실행합니다. Git의 경우 시스템 자격 증명(SSH Key 등)을 주로 사용합니다.

### Webhook 설정

자동 커밋 연동을 위해 각 저장소의 Webhook 설정에 아래 URL을 등록하세요:

- **Payload URL**: \`http://<SERVER_IP>:3000/api/integrations/webhook/vcs\`
- **커밋 메시지 규칙**: \`Fixed #123\`과 같이 이슈 번호를 포함하면 자동으로 이슈가 완료 처리됩니다.`;

const id = 'guide-vcs';

db.serialize(() => {
  // Check if exists first to avoid PK error
  db.get("SELECT id FROM pages WHERE id = ?", [id], (err, row) => {
    if (row) {
      db.run("UPDATE pages SET title = ?, content = ?, updatedAt = datetime('now') WHERE id = ?", [title, content, id], (err) => {
        if (err) return console.error(err.message);
        console.log(`Wiki page '${id}' updated.`);
      });
    } else {
      db.run("INSERT INTO pages (id, title, content, updatedAt) VALUES (?, ?, ?, datetime('now'))", [id, title, content], function (err) {
        if (err) return console.error(err.message);
        console.log(`Wiki page added with ID: ${id}`);
      });
    }
  });
});
