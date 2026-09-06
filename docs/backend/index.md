---
sidebar_position: 1
---

# 백엔드

**요청을 받아 처리하고 응답하는 쪽**을 다룹니다. 애플리케이션 서버, API, 그 위에서 도는 런타임까지입니다.

## 다루는 것

- 웹 프레임워크와 애플리케이션 서버 — Spring, FastAPI, Node.js 등
- 런타임의 동작 — JVM 메모리·GC, Python GIL, 이벤트 루프
- 프로세스 간 통신 — REST, gRPC, 메시지 기반 연동
- 인증·세션·트랜잭션 경계처럼 서버 코드에서 매번 판단해야 하는 것

## 경계

- **언어 자체**(Java·Python이 무엇이고 어떻게 실행되는가)는 [언어](../languages/index.md)로 갑니다. 여기서는 그 언어의 **런타임을 서버에서 어떻게 굴리는가**(JVM 힙·GC, 이벤트 루프 등)를 다룹니다.
- **데이터를 어디에 어떻게 저장하는가**는 [데이터베이스](../database/index.md)로 갑니다. 여기서는 애플리케이션이 그것을 **어떻게 부르는가**만 다룹니다.
- **어디에 배포되고 어떻게 굴러가는가**는 [인프라](../infrastructure/index.md)로 갑니다.

## 문서 목록

### Node.js — `nodejs/`

- [Node.js란 무엇인가 — 데이터 엔지니어를 위한 실행 모델 정리](./nodejs/what-is-nodejs.md)
- [Node.js 설치 — 어떤 경로로, 어느 버전을](./nodejs/installation.md)
- [nvm — Node 버전을 셸 단위로 갈아끼우기](./nodejs/nvm.md)
- [npm — 무엇을 잠그고, 무엇을 잠그지 않는가](./nodejs/npm.md)
- [pnpm — 무엇을 공유하고, 무엇을 막는가](./nodejs/pnpm.md)
- [Yarn — 같은 이름의 서로 다른 두 도구](./nodejs/yarn.md)
- [데이터 엔지니어는 실무에서 Node.js를 어디서 만나는가](./nodejs/for-data-engineers.md)
- [Node.js와 비슷한 기술 스택은 무엇인가](./nodejs/alternatives.md)

---

*작성일: 2026-09-06*
