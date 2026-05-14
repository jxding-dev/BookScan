# BookScan

BookScan은 책의 페이지 내용을 직접 저장하고, 검색과 하이라이트로 다시 찾아볼 수 있는 정적 웹 앱입니다.

## 주요 기능

- 책 목록 관리
- 페이지 텍스트 저장
- 페이지 이미지 첨부 및 다시 보기
- 전체 검색 및 책 내부 검색
- 최근 검색어 저장/삭제
- 하이라이트 색상 표시와 메모
- 모바일 중심 반응형 UI

## 폴더 구조

```text
BookScan/
  BookScan/
    book.html
    style.css
    app.js
    server.js
    data.js
    db.js
    engine.js
  package.json
  render.yaml
```

앱 실제 파일은 루트의 `BookScan/` 하위 폴더에 있습니다.

## 실행 방법

Node.js 18 이상이 필요합니다.

```bash
node BookScan/server.js
```

브라우저에서 아래 주소로 확인합니다.

```text
http://localhost:3000
```

## 개발 메모

- HTML: `BookScan/book.html`
- CSS: `BookScan/style.css`
- JavaScript: `BookScan/app.js`
- 기본 서버: `BookScan/server.js`
- 기본 데이터: `BookScan/data.js`
- 로컬 저장소 처리: `BookScan/db.js`
- 검색 처리: `BookScan/engine.js`

## 배포

Render 같은 Node 실행 환경에서는 `BookScan/server.js`를 실행 엔트리로 사용합니다.

```bash
node BookScan/server.js
```
