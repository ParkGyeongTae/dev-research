# 개발 리서치 노트

현업 데이터 엔지니어가 **개발 전반의 지식을 한곳에 정리**하는 개인 학습 아카이브입니다. [MkDocs Material](https://squidfunk.github.io/mkdocs-material/)로 빌드해 GitHub Pages로 배포합니다.

**🔗 사이트: https://parkgyeongtae.github.io/dev-research/**

## 구성

문서는 성격에 따라 세 곳으로 나뉩니다. 어디에 둘지 판단하는 기준은 [`authoring-guide.md`](./docs/authoring/authoring-guide.md) §1이 마스터입니다.

- `docs/topics/` — 기술 하나를 깊이 판 문서 묶음. 기술 하나가 폴더 하나이고, `00_summary` ~ `07_references`의 정해진 파일 세트를 채웁니다
- `docs/notes/` — 문제 하나를 문서 한 장으로 끝낸 기록. 연도별로 쌓입니다
- `docs/concepts/` — 제품에 종속되지 않는 이론. 두 곳 이상에서 인용될 때만 여기로 올라옵니다
- `docs/glossary.md` — 두 문서 이상이 쓰는 용어의 정의
- `docs/authoring/` — 이 저장소의 문서를 만드는 규칙과 기술 문서 템플릿
- `.claude/skills/` — 기술 문서를 새로 만들거나 다시 만드는 절차를 코드화한 Claude Code 스킬
- `.github/workflows/deploy.yml` — `main`에 푸시하면 빌드 결과를 GitHub Pages로 자동 배포

작성 규칙은 `docs/authoring/`에 두고 사이트와 함께 발행합니다 — 어떤 규칙으로 이 문서들이 만들어졌는지 사이트에서 바로 읽기 위해서입니다.

에이전트 지침만 저장소 루트에 남습니다 — 세션 시작 시 루트에서 읽히는 파일이기 때문입니다.

- [`AGENTS.md`](./AGENTS.md) — AI 에이전트(Claude Code 등) 작업 지침 (`CLAUDE.md`는 이 파일의 심볼릭 링크)

## 로컬에서 실행

의존성 관리에는 [uv](https://docs.astral.sh/uv/)를 씁니다.

```bash
uv sync
uv run mkdocs serve   # http://127.0.0.1:8000 에서 미리보기
uv run mkdocs build   # 배포와 동일하게 정적 사이트 빌드 (site/)
```
