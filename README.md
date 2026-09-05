# 개발 리서치 노트

현업 데이터 엔지니어가 **개발 전반의 지식을 한곳에 정리**하는 개인 학습 아카이브입니다. [Docusaurus](https://docusaurus.io/)로 빌드해 GitHub Pages로 배포합니다.

**🔗 사이트: https://parkgyeongtae.github.io/dev-research/**

## 구성

문서는 **일곱 개의 대분류** 아래에 기술별로 쌓입니다. 기술 하나가 폴더 하나이고, 경로는 `docs/<대분류>/<기술>/`입니다.

- `docs/backend/` — 백엔드: 애플리케이션 서버·API·런타임
- `docs/frontend/` — 프론트엔드: 브라우저에서 도는 것
- `docs/data-engineering/` — 데이터 엔지니어링: 스트리밍·배치·오케스트레이션·저장 포맷
- `docs/data-analytics/` — 데이터 분석: 분석용 변환·라이브러리·지표
- `docs/infrastructure/` — 인프라: 컨테이너·클라우드·IaC·관측성
- `docs/database/` — 데이터베이스: 저장 엔진의 내부 동작과 튜닝
- `docs/llm/` — LLM: LLM API를 부르고 다루는 법 (프롬프트 설계, 툴 사용, 평가, RAG)

각 대분류의 `index.md`에 **다루는 것**과 **경계**(어느 대분류에 넣을지 헷갈릴 때의 기준), 그리고 문서 목록이 있습니다.
기술 폴더 안에는 **답이 나온 문서만** 둡니다. 정해진 파일 세트는 없고, 파일명이 그 문서가 답하는 질문을 드러냅니다 — 공식 문서 한 페이지를 정리한 것이면 원문 slug를 그대로 씁니다(`llm/claude-code/best-practices.md`).

- `docusaurus.config.ts` · `sidebars.ts` — 사이트 설정과 사이드바(폴더 구조에서 자동 생성). 카테고리 이름·순서는 각 폴더의 `_category_.json`
- `.github/workflows/deploy.yml` — `main`에 푸시하면 빌드 결과를 GitHub Pages로 자동 배포

문서 구조·명명 규칙·작성 규칙의 **마스터는 저장소 루트의 [`AGENTS.md`](./AGENTS.md)** 하나입니다 (`CLAUDE.md`는 이 파일의 심볼릭 링크). AI 에이전트 지침과 작성 규칙을 한 파일에 두어, 규칙이 두 곳으로 갈라지지 않게 했습니다.

## 로컬에서 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
npm start         # http://localhost:3000/dev-research/ 에서 미리보기 (핫 리로드)
npm run build     # 배포와 동일하게 정적 사이트 빌드 (build/)
npm run serve     # 빌드 결과를 그대로 띄워 확인
```

깨진 링크는 경고가 아니라 **빌드 실패**로 잡힙니다(`onBrokenLinks: 'throw'`).
