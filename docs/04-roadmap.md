# 로드맵

이 문서는 WorkDeck의 개발 단계를 정의하고, 모든 기능을 MVP(1차)와 2차 이후 중 정확히 한 단계에 배치한다. 각 기능의 동작 명세는 이 문서가 아니라 링크된 기능 문서가 기준이며, 이 문서는 "무엇을 언제"만 답한다. MVP 완료 여부의 판단 기준은 4장에 정의한다.

## 1. 단계 정의

로드맵은 두 단계로 나눈다.

- **MVP (1차)** — WorkDeck의 핵심 가치인 "사이드바에서 고르고 워크스페이스의 콘텐츠 탭에서 작업한다"를 완결하는 최소 집합. 파일 목록과 분할 기반 듀얼 파일 작업, SSH/SFTP/FTP 통합 연결, 로컬/SSH 터미널, 미리보기 3타입(텍스트/코드·마크다운·이미지), 북마크가 여기에 속한다. MVP의 각 기능은 해당 기능 문서의 명세 전체를 범위로 하며, 기능 문서 안에서 "MVP에서 제공하지 않는다"고 명시한 항목만 제외된다.
- **2차 이후** — MVP 완료 판단 기준(4장)을 통과한 뒤에 착수하는 것들. 플러그인 시스템([05-plugin-system.md](05-plugin-system.md)), 계획에서 명세화하지 않기로 확정한 향후 과제(웹 브라우저 탭, PDF/영상/오디오/압축파일 미리보기), 기능 문서가 MVP 범위 밖으로 명시한 개선 후보(3장)가 여기에 속한다. 2차 이후 항목은 착수 시점에 명세를 새로 작성하거나 기존 기능 문서를 확장한다 — 플러그인 시스템은 예외로, 설계 명세가 이미 05-plugin-system.md에 있다.

단계 진행은 선형이다.

```
MVP 개발 → MVP 완료 판단 기준 검증(4장) → 1차 출시 (macOS 우선, ADR-0001) → 2차 이후 착수
```

## 2. 로드맵 표

모든 기능은 아래 표에서 MVP 또는 2차 이후 중 정확히 한 곳에 배치된다. 표에 없는 동작은 로드맵에 존재하지 않는 것이며, 추가하려면 이 표를 먼저 고친다.

| 기능 | 단계 | 명세 문서 |
|------|------|-----------|
| 파일 목록 — 로컬·원격 파일 목록 탭 (탐색·정렬·다중 선택·숨김 파일 토글·기본 조작) | **MVP** | [features/file-manager.md](features/file-manager.md) 1장 |
| 듀얼 파일 작업 — 분할 위 F5 복사 / F6 이동 / 드래그앤드롭, 로컬↔원격 전 조합 | **MVP** | [features/file-manager.md](features/file-manager.md) 2·3장 |
| 연결 — SSH/SFTP/FTP 통합 프로필, "터미널로 열기" / "파일로 열기" 두 액션, 프로필 CRUD, 시크릿 보관 | **MVP** | [features/connections.md](features/connections.md) |
| 로컬 터미널 — 로컬 터미널 탭, 시작 작업 디렉터리 규칙 | **MVP** | [features/terminal.md](features/terminal.md) 2장 |
| SSH 터미널 — SSH 터미널 탭, 세션 수명·끊김·수동 재연결 | **MVP** | [features/terminal.md](features/terminal.md) 3·5장 |
| 미리보기 — 텍스트/코드 (구문 강조, 인코딩·대용량 처리) | **MVP** | [features/preview.md](features/preview.md) 3.1절 |
| 미리보기 — 마크다운 (렌더 기본 + 원본 토글) | **MVP** | [features/preview.md](features/preview.md) 3.2절 |
| 미리보기 — 이미지 (확대/축소, 창 맞춤, 실제 크기) | **MVP** | [features/preview.md](features/preview.md) 3.3절 |
| 북마크 — 로컬/원격 경로 저장·열기, 추가·삭제·수동 정렬 | **MVP** | [features/bookmarks.md](features/bookmarks.md) |
| 플러그인 시스템 — 확장 호스트·매니페스트 기반, 확장 포인트 4종 공개 (도입 권장 순서: 미리보기 렌더러 → 연결 프로토콜 → 콘텐츠 탭 + 사이드바 뷰 → 명령·컨텍스트 메뉴·테마) | 2차 이후 | [05-plugin-system.md](05-plugin-system.md) |
| 웹 브라우저 탭 | 2차 이후 | 명세 문서 없음 — 착수 시 작성. 확장 포인트 ③(콘텐츠 탭 + 사이드바 뷰) 플러그인으로 구현 가능 ([05-plugin-system.md](05-plugin-system.md) 2장). 스택의 적합성 근거는 [ADR-0001](../.forge/adr/0001-electron-over-tauri.md) |
| PDF 미리보기 | 2차 이후 | [features/preview.md](features/preview.md) 5장 (향후 과제) — 확장 포인트 ①(미리보기 렌더러) 플러그인으로 구현 가능 ([05-plugin-system.md](05-plugin-system.md) 2장) |
| 영상/오디오 미리보기 | 2차 이후 | [features/preview.md](features/preview.md) 5장 (향후 과제) — 확장 포인트 ①(미리보기 렌더러) 플러그인으로 구현 가능 ([05-plugin-system.md](05-plugin-system.md) 2장) |
| 압축파일 내용 목록 미리보기 (ZIP 등) | 2차 이후 | [features/preview.md](features/preview.md) 5장 (향후 과제) — 확장 포인트 ①(미리보기 렌더러) 플러그인으로 구현 가능 ([05-plugin-system.md](05-plugin-system.md) 2장) |
| 마켓플레이스 — 플러그인 원격 배포·검색·업데이트 | 2차 이후 | 명세 문서 없음 — 착수 시 작성 ([05-plugin-system.md](05-plugin-system.md) 6장의 향후 과제) |

배치 원칙:

- MVP 행은 전부 합의된 설계 요약([.forge/plan.md](../.forge/plan.md)의 Source of truth)에서 온 것이다. MVP에 새 기능을 넣는 것은 계획 변경이다.
- 2차 이후 행 중 미리보기 확장 3종은 MVP에서 [features/preview.md](features/preview.md) 4장의 미지원 타입 동작(파일 정보 + 안내 표시)으로 처리된다 — MVP에서 열었을 때 오류가 아니라는 뜻이다.
- 웹 브라우저 탭과 마켓플레이스는 계획의 Non-goals에 따라 명세화하지 않았다. 이 표의 배치는 "언젠가 한다"의 기록일 뿐, 범위·동작에 대한 어떤 확정도 아니다.

## 3. 2차 이후 개선 후보 — 기능 문서에 기록된 MVP 제외 항목

각 기능 문서가 명시적으로 MVP 범위 밖이라고 선을 그은 항목들이다. 2장의 표와 달리 이들은 착수가 확정된 것이 아닌 **후보**이며, 2차 계획 수립 시 우선순위를 다시 정한다.

| 후보 | 출처 |
|------|------|
| 연결당 복수 SSH 터미널 세션 (같은 대상 판정 기준 변경 필요) | [features/terminal.md](features/terminal.md) 3.2절 |
| SSH 터미널 자동 재연결 | [features/terminal.md](features/terminal.md) 5.3절 |
| 로컬 터미널 셸 선택 설정 | [features/terminal.md](features/terminal.md) 2.3절 |
| 미리보기 파일 변경 자동 갱신 | [features/preview.md](features/preview.md) 1.2절 |
| 파일 단위 북마크 (현재는 폴더 경로만) | [features/bookmarks.md](features/bookmarks.md) 1장 |
| 북마크 자동 정렬 (이름순·종류순) | [features/bookmarks.md](features/bookmarks.md) 4.3절 |

## 4. MVP 완료 판단 기준

MVP는 다음을 모두 만족할 때 완료로 판정한다.

1. **명세 일치** — 2장 표의 MVP 행 9개가 각 명세 문서에 정의된 동작·흐름도·표 그대로 동작한다. 기능 문서가 곧 인수 기준이다.
2. **핵심 시나리오 통과** — 사이드바의 파일·연결·북마크 세 뷰 전환, 하나의 연결에서 "터미널로 열기"와 "파일로 열기" 모두 성공, 분할된 두 파일 목록 탭 간 로컬↔원격 F5/F6 작업(진행률·취소·이름 충돌 처리 포함), 미리보기 3타입 표시, 북마크 추가 후 앱 재시작 시 순서 포함 유지 — 가 실제 환경에서 통과한다.
3. **미지원의 안전한 처리** — 2차 이후 항목을 MVP에서 건드렸을 때 깨지지 않는다: PDF 등 미지원 타입 파일은 [features/preview.md](features/preview.md) 4장의 안내 표시로 열린다.
4. **플랫폼** — 위 기준은 macOS에서 판정한다 ([ADR-0001](../.forge/adr/0001-electron-over-tauri.md)의 macOS 우선 출시).

## 5. 관련 문서

- [01-overview.md](01-overview.md) — 제품 비전과 핵심 개념, 문서 세트 목차
- [02-ui-layout.md](02-ui-layout.md) — 사이드바·워크스페이스·콘텐츠 탭·분할의 구조와 규칙
- [03-architecture.md](03-architecture.md) — 프로세스·모듈 구조와 핵심 라이브러리
- [05-plugin-system.md](05-plugin-system.md) — 플러그인 시스템 설계 (확장 포인트·확장 호스트·매니페스트)
- [features/](features/) — 기능별 명세 (file-manager · connections · terminal · preview · bookmarks)
- [ADR-0001](../.forge/adr/0001-electron-over-tauri.md) — Electron + TypeScript 스택 채택 근거
