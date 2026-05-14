# UI 규칙

랜딩페이지 화면을 유지하면서 스타일을 정리할 때 참고하는 보조 문서입니다.
전체 작업 기준은 `AGENTS.md`를 따릅니다.

필요할 때만 이 문서를 확인합니다. 토큰 절약을 위해 작업과 관련 없는 섹션은 읽지 않습니다.

## 레이아웃

- 섹션은 hero, about, feature, process, review, faq, contact, footer처럼 목적별로 나눕니다.
- 최대 너비와 중앙 정렬은 공통 `.inner` 또는 `.container` 기준으로 통일합니다.
- 레이아웃은 flex/grid를 우선 사용합니다.
- position: absolute와 z-index는 필요한 경우에만 최소로 사용합니다.

## 네이밍

- 클래스명은 kebab-case를 사용합니다.
- `box1`, `text2`, `item3`처럼 의미 없는 이름은 사용하지 않습니다.
- 좋은 예: `section-title`, `feature-card`, `contact-form`, `primary-button`

## CSS

- 색상, 폰트, 여백, radius, shadow는 CSS 변수로 관리합니다.
- 버튼, 카드, 섹션 제목, 그리드처럼 반복되는 스타일은 공통 클래스로 묶습니다.
- transition은 hover/focus 등 필요한 상호작용에만 가볍게 사용합니다.
- 이미지 비율은 `max-width`, `height: auto`, `object-fit`으로 보호합니다.

## 타이포그래피

텍스트 스타일은 아래 계층을 기준으로 통일합니다.

| 역할 | 사용 위치 | 크기/굵기/행간 | 정렬 기준 |
| --- | --- | --- | --- |
| Header / Brand | 로고, 최상단 브랜드명 | 32px / Bold / 140% | middle |
| Title / Section | 섹션 제목 | 24px / SemiBold / 140% | top |
| Content / MenuName | 메뉴명, 주요 콘텐츠명 | 20px / SemiBold / 140% | middle |
| Content / Price | 가격, 강조 숫자 | 18px / Bold / 140% | middle |
| Total / Price | 총액, 최종 가격 | 28px / Bold / 140% | middle |
| Body / Description | 본문 설명 | 16px / Regular / 150% | top |
| Caption / SubInfo | 보조 정보, 안내 문구 | 14px / Regular / 150% | top |

- 큰 제목은 140% 행간을 기준으로 간결하게 유지합니다.
- 본문과 캡션은 읽기 편하게 150% 행간을 사용합니다.
- 가격, 총액, CTA처럼 즉시 인지해야 하는 텍스트는 Bold를 사용합니다.
- 모바일에서는 같은 계층을 유지하되, 화면이 좁으면 크기를 한 단계 낮춰도 됩니다.

## 액션 레벨

버튼과 주요 액션은 중요도에 따라 아래 기준을 사용합니다.

| 레벨 | 용도 | 권장 크기 | 예시 |
| --- | --- | --- | --- |
| Level 1 / Primary Action | 결제, 다음, 구매, 제출 | 44~48px 이상 | 핵심 CTA |
| Level 2 / Navigation / Tab | 헤더 카테고리, 탭 메뉴 | 32~40px | 화면 이동, 콘텐츠 전환 |
| Level 3 / Sub UI | 필터, 토글, 펼치기, 태그 | 28~32px | 보조 기능 |

- 핵심 CTA는 화면에서 가장 먼저 인지되도록 크기와 대비를 충분히 둡니다.
- Navigation과 Tab은 반복 사용을 고려해 높이와 간격을 통일합니다.
- Sub UI는 작게 만들되 터치 영역이 너무 작아지지 않게 합니다.

## 반응형

- PC, tablet, mobile 기준을 모두 확인합니다.
- 모바일에서 가로 스크롤과 텍스트 넘침이 없어야 합니다.
- 버튼과 입력 요소는 터치하기 충분한 크기를 유지합니다.

## UI 상태

- 링크, 버튼, 입력폼에 hover/focus 상태를 둡니다.
- 폼이 있으면 입력값 검증과 에러 메시지 영역을 포함합니다.
- 빈 상태, 로딩 상태, 완료/실패 문구는 짧고 명확하게 작성합니다.
