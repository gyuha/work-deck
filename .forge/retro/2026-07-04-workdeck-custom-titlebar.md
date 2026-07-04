# 2026-07-04 — 프레임리스 커스텀 타이틀바 (VSCode 스타일)

## Plan vs actual
- 계획대로 된 것: S1(창 크롬 IPC), S2(렌더러 커스텀 타이틀바), S4(레이아웃 통합)는 계획한 그대로 완료됐다. macOS 네이티브 트래픽라이트, Win/Linux 커스텀 버튼 3개, 포커스/블러 디밍 모두 실제 Electron 하네스로 왕복 확인했다.
- 편차 1 (실행 중): S3(포커스/블러 디밍)을 별도 슬라이스로 만들지 않고 S2에 자연스럽게 합쳐서 구현했다 — 디밍이 타이틀바 컴포넌트 자신의 관심사였기 때문. 완료 기준은 그대로 검증됨.
- 편차 2 (UAT 대기 중 후속 요청): `status: executed` / `verified: pending`으로 대기하던 중, 사용자가 실제 VSCode 스크린샷을 근거로 "타이틀바 중앙이 비어 보인다"며 후속 수정을 요청했다. 이에 따라 중앙의 정적 텍스트 `<span>`("WorkDeck")을 VSCode 스타일 입력창(`<input placeholder="WorkDeck">`, 기능 없음)으로 교체했다. 그 결과 plan.md의 Goal 문구("중앙에 정적 텍스트 'WorkDeck'을 표시")가 더는 사실이 아니게 됐다 — Non-goals 위반은 아니지만(여전히 활성 탭/파일명에 반응하지 않는 고정 placeholder), Goal 서술 자체는 낡았다.

## Learnings
- Do differently next time: `status: executed`로 UAT 대기 중인 태스크의 산출물을 사용자가 후속 요청으로 추가 수정할 때는, 그 자리에서 바로 run.md에 편차를 기록해 두는 편이 낫다 — 이번처럼 나중에(fg-learn 진입 시점에) 한꺼번에 소급 기록하면 plan.md Goal과 실제 상태가 잠시 불일치한 채로 남는다.
- "VSCode처럼 보이게 만들어라" 같은 개방형 목표는 plan.md의 Goal을 지나치게 구체적으로 확정(예: "정적 텍스트")하면 완료 직후 바로 낡을 수 있다. 다음에 비슷한 "레퍼런스 이미지 따라 만들기" 태스크를 잡을 때는 Goal을 "이 스크린샷 요소들을 반영한다" 수준으로 두고, 세부 요소별 확정은 Work slices 쪽에 두는 게 더 안전하다.
- 이번에 추가한 입력창은 시각 요소뿐이고 실제 검색/커맨드 기능은 없다 — 다음 관련 작업(fg-ask)을 시작할 때 이 retro와 run.md의 "남은 공백"을 먼저 참고할 것.

## Doc updates
- CONTEXT.md promotion: none (도메인 용어 아님, UI 크롬)
- ADR added: none (되돌리기 쉬운 점진적 UI 변경이며, 당혹스러운 트레이드오프가 아님 — ADR 승급 기준 3가지 중 어느 것도 충족하지 않음)
