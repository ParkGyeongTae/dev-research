# 개발 리서치 노트

현업 데이터 엔지니어가 **개발 전반의 지식을 한곳에 정리**하는 개인 학습 아카이브입니다. [Docusaurus](https://docusaurus.io/)로 빌드해 GitHub Pages로 배포합니다.

**🔗 사이트: https://parkgyeongtae.github.io/dev-research/**

## 로컬에서 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
npm start         # http://localhost:3000/dev-research/ 에서 미리보기 (핫 리로드)
npm run build     # 배포와 동일하게 정적 사이트 빌드 (build/)
npm run serve     # 빌드 결과를 그대로 띄워 확인
```

`main`에 푸시하면 `.github/workflows/deploy.yml`이 빌드해 GitHub Pages로 배포합니다.

## 규칙

문서 구조·명명 규칙·작성 규칙과 AI 에이전트 지침은 [`AGENTS.md`](./AGENTS.md)에 있습니다.
