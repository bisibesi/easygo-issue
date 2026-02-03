// Update Wiki home page with English content via API
const englishContent = `# Markdown Writing Guide

Welcome to the Wiki! The left shows the rendered result, the right shows the code examples.

## 1. Text Styles
- **Bold** : \`**Bold**\`
- *Italic* : \`*Italic*\`
- ~~Strikethrough~~ : \`~~Strikethrough~~\`
- \`Code\` : \`\`Code\`\`

## 2. Lists
- Unordered list : \`- Unordered list\`
- 1. Ordered list : \`1. Ordered list\`
- [ ] Checkbox : \`- [ ] Checkbox\`

## 3. Other Elements
- [Link](http://localhost:3000) : \`[Link](URL)\`
- > Blockquote : \`> Blockquote\`
- Horizontal rule : \`---\`

## 4. Code Block
\`\`\`javascript
console.log('Code Block');
\`\`\`
Syntax:
\`\`\`
\`\`\`javascript
console.log('Code Block');
\`\`\`
\`\`\`
`;

const koreanContent = `# 마크다운 작성 가이드

위키에 오신 것을 환영합니다! 왼쪽은 적용 결과, 오른쪽은 작성 코드 예시입니다.

## 1. 텍스트 스타일
- **굵게** : \`**굵게**\`
- *기울임* : \`*기울임*\`
- ~~취소선~~ : \`~~취소선~~\`
- \`강조(Code)\` : \`\`강조(Code)\`\`

## 2. 목록
- 순서 없는 목록 : \`- 순서 없는 목록\`
- 1. 순서 있는 목록 : \`1. 순서 있는 목록\`
- [ ] 체크박스 : \`- [ ] 체크박스\`

## 3. 기타 요소
- [링크](http://localhost:3000) : \`[링크](URL)\`
- > 인용문 : \`> 인용문\`
- 구분선 : \`---\`

## 4. 코드 블록
\`\`\`javascript
console.log('Code Block');
\`\`\`
작성법:
\`\`\`
\`\`\`javascript
console.log('Code Block');
\`\`\`
\`\`\`
`;

async function updateWikiContent() {
    try {
        const response = await fetch('http://localhost:3000/api/wiki/home', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer admin-token' // You may need to get a real token
            },
            body: JSON.stringify({
                title: '마크다운 작성 가이드',
                content_ko: koreanContent,
                content_en: englishContent
            })
        });

        if (response.ok) {
            console.log('✓ Successfully updated Wiki home page with English content');
        } else {
            console.error('Failed to update:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

updateWikiContent();
