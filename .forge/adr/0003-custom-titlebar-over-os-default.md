# 프레임리스 커스텀 타이틀바로 전환 (VSCode 스타일)

`workdeck-vscode-ui`(task 10)에서는 "프레임리스 커스텀 타이틀바는 만들지 않는다 — OS 기본 타이틀바를 그대로 쓴다"를 Non-goal로 명시했다. 이 결정을 뒤집는다: WorkDeck의 핵심 사용자(터미널 작업자·개발자)에게 몸에 밴 VSCode 관습과 시각적으로 완전히 일관되게 만들기 위해, OS 기본 타이틀바 대신 프레임리스 커스텀 타이틀바를 채택한다. macOS는 `titleBarStyle: 'hiddenInset'`으로 네이티브 트래픽라이트를 유지하고, Windows/Linux는 `frame: false` + `@vscode/codicons`의 `chrome-minimize`/`chrome-maximize`/`chrome-restore`/`chrome-close` 아이콘으로 창 컨트롤을 직접 그린다. 비용은 플랫폼별로 다른 구현(Windows/Linux는 창 컨트롤 버튼과 최대화 상태 동기화를 직접 처리해야 함)과, OS가 타이틀바에 대해 제공하던 접근성·업데이트를 더 이상 무상으로 받지 못한다는 점이다.

## Considered Options

- **OS 기본 타이틀바 유지** (기존 결정) — 구현이 가장 단순하고 플랫폼 차이를 신경 쓸 필요가 없지만, VSCode와 시각적으로 이질적인 네이티브 타이틀 표시줄이 그대로 남아 이번 요청의 목표(VSCode와 동일한 외형)를 충족하지 못해 기각.
- **macOS만 커스텀, Windows/Linux는 기존 유지** — 구현량이 더 적지만 크로스플랫폼 시각 일관성을 포기해야 해서 기각.
