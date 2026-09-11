---
sidebar_position: 1
---

# Docusaurus란 무엇인가

> **원문** — [Introduction | Docusaurus](https://docusaurus.io/docs)
>
> **확인 날짜** — 2026-09-11 (공식 문서 버전 3.10.2)
>
> **검증 상태** — Docusaurus 3.10.2 공식 Introduction·Docs Introduction·Installation·Markdown Features·Static site generation 원문을 읽었고, 이 저장소의 설정과 `npm run build`를 직접 확인했습니다.

## 한 문장으로 말하면

> Docusaurus is a static-site generator.
>
> **번역** — Docusaurus는 정적 사이트 생성기입니다.
>
> — [Introduction | Docusaurus](https://docusaurus.io/docs) (확인: 2026-09-11)

Docusaurus는 Markdown·MDX 문서와 React 컴포넌트, 사이트 설정을 받아 문서 사이트를 빌드하는 도구입니다. 문서 사이트에 필요한 사이드바·검색·버전 관리·다국어 지원·테마 확장 기능을 제공하며, 문서 외에 블로그·개인 사이트·제품 사이트에도 사용할 수 있습니다. — [Introduction | Docusaurus](https://docusaurus.io/docs) (확인: 2026-09-11)

다만 Docusaurus를 “Markdown을 HTML로 바꾸는 도구”라고만 이해하면 중요한 부분을 놓칩니다. Docusaurus는 빌드 시 각 경로의 HTML을 미리 생성하지만, 최종적으로는 React 기반의 single-page application(SPA)으로 동작합니다. 처음에는 미리 생성된 HTML이 브라우저에 도착하고, 이후 JavaScript가 실행되어 React가 기존 HTML을 hydration하면서 클라이언트 내비게이션과 상호작용을 제공합니다. — [Static site generation (SSG) | Docusaurus](https://docusaurus.io/docs/advanced/ssg) (확인: 2026-09-11)

## 가장 작은 구성

Docusaurus는 공식 CLI로 기본 프로젝트를 만들 수 있습니다.

```bash
npx create-docusaurus@latest my-website classic
cd my-website
npx docusaurus start
```

`classic` 템플릿은 표준 문서 기능·블로그·사용자 정의 페이지·CSS 프레임워크를 포함한 시작점입니다. 개발 서버를 실행하면 기본적으로 `http://localhost:3000`에서 사이트를 확인할 수 있습니다. — [Installation | Docusaurus](https://docusaurus.io/docs/installation) (확인: 2026-09-11)

기본 프로젝트의 핵심 파일은 다음과 같습니다.

```text
my-website/
├── docs/                  # 문서 원본
├── blog/                  # 블로그 원본
├── src/pages/             # 사용자 정의 페이지
├── src/css/               # 사용자 정의 CSS
├── static/                # 그대로 복사할 정적 파일
├── docusaurus.config.js   # 사이트 전역 설정
├── sidebars.js            # 문서 사이드바 구성
└── package.json           # Node.js 의존성과 명령
```

공식 문서에서 이 구조의 각 디렉터리는 서로 다른 입력 역할을 가집니다. 특히 `docs/`의 파일은 문서 플러그인이 처리하고, `src/pages/`의 파일은 일반 페이지 라우트가 되며, `static/`의 파일은 최종 `build/` 디렉터리로 복사됩니다. `sidebars.js`는 문서 사이드바 순서를 정합니다. — [Installation | Docusaurus](https://docusaurus.io/docs/installation) (확인: 2026-09-11)

## 문서가 사이트가 되는 과정

가장 작은 문서는 다음처럼 만들 수 있습니다.

```markdown
<!-- docs/intro.md -->
---
sidebar_position: 1
---

# 시작하기

첫 번째 문서입니다.
```

일반적인 설정에서는 이 파일이 `/docs/intro` 경로의 문서 페이지가 됩니다. 문서 전용 사이트로 사용하면서 문서를 사이트 루트에 두고 싶다면 docs 플러그인의 `routeBasePath: '/'`를 설정할 수 있습니다. 이 저장소도 `docusaurus.config.ts`에서 `routeBasePath: '/'`를 사용하므로 `docs/index.md`가 사이트의 `/` 경로에 대응합니다. — [Docs Introduction | Docusaurus](https://docusaurus.io/docs/docs-introduction) (확인: 2026-09-11)

사이트 빌드는 다음 명령으로 실행합니다.

```bash
npm run build
```

이 저장소의 `package.json`에서 `npm run build`는 `docusaurus build`를 호출합니다. 빌드가 끝나면 정적 배포 산출물이 `build/`에 생성됩니다. 이 산출물을 GitHub Pages, Netlify, Vercel 같은 정적 호스팅 환경에 배포할 수 있습니다. — [Deployment | Docusaurus](https://docusaurus.io/docs/deployment) (확인: 2026-09-11)

## Markdown과 MDX

Docusaurus의 주된 콘텐츠 작성 형식은 Markdown입니다. MDX 컴파일러를 사용하면 Markdown 안에 JSX와 React 컴포넌트를 삽입할 수 있습니다.

```mdx
import Callout from '@site/src/components/Callout';

# 설치

<Callout type="info">Node.js가 필요합니다.</Callout>
```

이것은 Markdown을 단순한 HTML 조각으로만 취급하는 것과 다릅니다. MDX 파일은 React 컴포넌트로 변환되므로 문서 안에 실행 가능한 UI를 넣을 수 있습니다. 그만큼 일반 Markdown보다 컴파일 규칙과 React 렌더링 결과를 함께 고려해야 합니다. — [Markdown Features | Docusaurus](https://docusaurus.io/docs/markdown-features) (확인: 2026-09-11)

Docusaurus v3의 기본 동작은 `.md` 파일도 MDX 형식으로 처리하는 것입니다. 다만 이 저장소는 `docusaurus.config.ts`에서 `markdown.format: 'detect'`를 설정했으므로 `.md`는 CommonMark, `.mdx`는 MDX로 처리됩니다. 이 차이는 공식 기본값과 이 저장소의 실제 설정을 구분해야 하는 사례입니다. — [Markdown Features | Docusaurus](https://docusaurus.io/docs/markdown-features) (확인: 2026-09-11), [docusaurus.config.ts](https://github.com/ParkGyeongTae/dev-research/blob/main/docusaurus.config.ts) (확인: 2026-09-11)

## Docs 플러그인의 계층

Docusaurus의 문서 기능은 Markdown 파일을 계층적인 문서 사이트로 조직합니다. 공식 문서는 문서 구성을 다음 네 단계로 설명합니다.

1. 개별 페이지
2. 사이드바
3. 버전
4. 플러그인 인스턴스

이 구조에서 사이드바는 페이지를 읽는 순서를 표현하고, 버전은 제품 릴리스별 문서를 동시에 유지하게 합니다. 플러그인 인스턴스는 하나의 사이트 안에서 서로 다른 문서 집합을 분리해야 할 때 사용합니다. — [Docs Introduction | Docusaurus](https://docusaurus.io/docs/docs-introduction) (확인: 2026-09-11)

따라서 파일을 `docs/` 아래에 추가하는 것만으로 문서 내용은 만들 수 있지만, 독자가 어떤 순서로 읽는지까지 통제하려면 사이드바 구성이 필요합니다. 문서의 존재와 문서 내비게이션의 구조는 같은 문제가 아닙니다.

## Docusaurus의 동작 경계

Docusaurus는 사이트를 생성하고 브라우저에서 문서를 탐색하게 만드는 도구입니다. 하지만 다음을 자동으로 결정하지는 않습니다.

- 문서가 설명해야 할 도메인 지식
- 어떤 릴리스에서 어떤 문서를 보존할지
- 빌드 결과를 어느 환경에 배포할지
- 비공개 문서에 대한 인증·권한 정책

또한 “정적 사이트”라는 표현이 서버가 전혀 필요 없다는 뜻은 아닙니다. 빌드 결과를 제공하는 정적 웹 서버는 필요하고, Docusaurus 사이트의 상호작용에는 브라우저에서 실행되는 JavaScript가 사용됩니다. 정적 사이트 생성은 초기 HTML을 미리 제공해 로딩과 SEO를 돕지만, Docusaurus의 기능 전체가 그 HTML만으로 완결되는 것은 아닙니다. — [Static site generation (SSG) | Docusaurus](https://docusaurus.io/docs/advanced/ssg) (확인: 2026-09-11)

## 이 저장소에서의 Docusaurus

이 저장소는 Docusaurus 3.10.2를 사용합니다.

```text
Node.js       v22.21.1
Docusaurus    3.10.2
@docusaurus/core  3.10.2
```

직접 확인한 `package.json`의 핵심 설정은 다음과 같습니다.

```json
{
  "scripts": {
    "start": "docusaurus start",
    "build": "docusaurus build",
    "serve": "docusaurus serve"
  },
  "dependencies": {
    "@docusaurus/core": "^3.10.2",
    "@docusaurus/preset-classic": "^3.10.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

현재 저장소의 `npm run build`는 성공했고 `build/`에 정적 파일이 생성되었습니다. 이것은 Docusaurus가 이 저장소에서 실제로 문서 원본을 배포 가능한 사이트로 변환하고 있다는 직접 확인 결과입니다.

## 확인하지 못한 것

확인하지 못한 것은 없습니다. Docusaurus 예시를 포함한 이 문서는 현재 저장소의 `npm run build`로 빌드했고, 위에 적은 버전·설정·빌드 결과를 직접 확인했습니다.

*작성일: 2026-09-11*
