# 개발 리서치 노트

현업 데이터 엔지니어가 **개발 전반의 지식을 한곳에 정리**하는 개인 학습 아카이브입니다. [Docusaurus](https://docusaurus.io/)로 빌드해 GitHub Pages로 배포합니다.

**🔗 사이트: https://parkgyeongtae.github.io/dev-research/**

문서는 `docs/<대분류>/<기술>/`에 쌓입니다. 사이드바는 폴더 구조에서 자동 생성되므로, **어떤 문서가 있는지는 사이트에서 보는 것이 정확합니다.**

## 로컬에서 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
npm start         # http://localhost:3000/dev-research/ 에서 미리보기 (핫 리로드)
npm run build     # 배포와 동일하게 정적 사이트 빌드 (build/)
npm run serve     # 빌드 결과를 그대로 띄워 확인
```

깨진 링크는 경고가 아니라 **빌드 실패**로 잡힙니다(`onBrokenLinks: 'throw'`).

`main`에 푸시하면 `.github/workflows/deploy.yml`이 빌드해 GitHub Pages로 배포합니다.

## 규칙은 여기 없습니다

문서 구조·명명 규칙·작성 규칙, 그리고 AI 에이전트 지침의 **마스터는 저장소 루트의 [`AGENTS.md`](./AGENTS.md)** 하나입니다 (`CLAUDE.md`는 이 파일의 심볼릭 링크).

이 README에는 규칙을 옮겨 적지 않습니다. 옮겨 적는 순간 한쪽만 고쳐지면서 갈라지기 때문입니다 — 실제로 그런 적이 있습니다.
