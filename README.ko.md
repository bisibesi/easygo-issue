# 🚀 EasyGo Issue (이지고 이슈)

> **"초보자를 위한 가장 쉽고 빠른 포터블 이슈 트래커"**

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**EasyGo Issue**는 복잡한 설정 없이 바로 사용할 수 있는 포터블 이슈 관리 시스템입니다. **Vue.js**와 **Node.js**로 제작되었습니다.

## ⚡ 초보자를 위한 빠른 시작 (Portable)

**설치 과정이 필요 없습니다. 가장 추천하는 방법입니다.**

1.  프로젝트 폴더를 다운로드합니다.
2.  **`start_app.bat`** 파일을 더블 클릭합니다.
3.  자동으로 서버가 켜지고 브라우저가 열립니다.

> **참고**: 이 프로그램은 폴더 내 `bin/node.exe` (공식 Node.js 바이너리)를 사용하여 실행되므로 안전합니다.

---

## 👨‍💻 개발자용 설치 (Installation)

코드를 수정하거나 개발에 참여하고 싶다면:

1.  **저장소 복제 (Clone)**:
    ```bash
    git clone https://github.com/bisibesi/easygo-issue.git
    cd easygo-issue
    ```
2.  **의존성 설치**:
    ```bash
    npm install
    ```
3.  **개발 서버 실행**:
    ```bash
    npm run dev
    ```

---

## ✨ 주요 기능

- **완벽한 휴대성**: USB에 넣어 다니며 어디서든 실행 가능합니다.
- **이슈 관리**: 쉽고 직관적인 이슈 생성, 필터링, 검색 기능.
- **스케줄 (Gantt Chart)**: 프로젝트 일정을 한눈에 파악.
- **위키 (Wiki)**: 팀을 위한 문서화 도구 내장.
- **VCS 연동 (Git/SVN)**: `vcs_config.json` 설정으로 소스 코드 변경 사항 확인.

## 🛡️ 보안 공지

### 기본 계정 정보
- **관리자 (Admin)**: `admin` / `admin123`
- **사용자 (User)**: `user` / `user123`

> ⚠️ **매우 중요**: 보안을 위해 **첫 로그인 후 반드시 비밀번호를 변경**해주세요. (관리자 메뉴에서 변경 가능)

## 💾 데이터 관리
모든 데이터는 **`server/database.sqlite`** 파일 하나에 저장됩니다. 백업 시 이 파일만 복사하세요.

---
## 🤝 Acknowledgments

이 프로젝트는 Google DeepMind의 AI 개발 에이전트 **Antigravity(안티그라비티)**와의 협업으로 제작되었습니다.

---
© 2026 EasyGo Issue Team. Licensed under the MIT License.
