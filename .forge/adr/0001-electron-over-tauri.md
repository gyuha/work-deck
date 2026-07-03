# 데스크톱 스택으로 Electron + TypeScript 채택

WorkDeck은 터미널(PTY)·SSH·SFTP/FTP·파일시스템을 모두 품는 크로스플랫폼 데스크톱 앱(macOS 우선 출시)이다. 완성 속도를 앱 경량함보다 우선하여 Electron + TypeScript를 채택한다. 이 도메인의 검증된 조합(node-pty + xterm.js + ssh2 + basic-ftp)과 통합 레퍼런스(VS Code 터미널, Tabby 등)가 풍부해 막힐 위험이 가장 낮고, 향후 웹 브라우저 탭 부활에도 유리하다. 비용은 배포 용량과 메모리.

## Considered Options

- **Tauri + Rust** — 경량(설치 ~15MB vs ~100MB)·저메모리. 부품 크레이트는 존재하나(portable-pty, russh/russh-sftp, suppaftp) "SSH 터미널 + SFTP + 파일 관리 통합" 급 완성 레퍼런스가 드물고, async Rust 숙련도에 따라 공수가 Electron 대비 1.5~3배로 추정되어 기각.
- **macOS 전용 Swift/SwiftUI** — 최고의 OS 통합이지만 크로스플랫폼을 포기해야 하고 터미널/SSH 스택을 직접 구현할 부분이 많아 기각.
