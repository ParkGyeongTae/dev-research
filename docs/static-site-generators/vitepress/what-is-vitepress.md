---
sidebar_position: 1
---

# VitePress란 무엇인가

> **원문** — [What is VitePress? | VitePress](https://vitepress.dev/guide/what-is-vitepress)
>
> **확인 날짜** — 2026-09-11 (공식 사이트 버전 선택기에 `2.0.0-alpha.20`과 `1.6.4`가 표시됨)
>
> **검증 상태** — 공식 What is VitePress·Getting Started·Routing 원문을 읽었고, 이 환경의 Node.js와 VitePress 설치 여부를 직접 확인했습니다. VitePress 예시는 이 환경에서 실행하지 못했습니다.

## 한 문장으로 말하면

> VitePress is a Static Site Generator (SSG) designed for building fast, content-centric websites.
>
> **번역** — VitePress는 빠르고 콘텐츠 중심적인 웹사이트를 만들기 위한 정적 사이트 생성기(SSG)입니다.
>
> — [What is VitePress? | VitePress](https://vitepress.dev/guide/what-is-vitepress) (확인: 2026-09-11)

VitePress는 Markdown으로 작성한 콘텐츠에 테마를 적용해 정적 HTML 페이지를 만들고, 그 결과물을 정적 파일을 제공할 수 있는 환경에 배포하는 도구입니다. 이름처럼 Vite를 빌드 기반으로 사용하고 Vue와 결합하므로, 단순한 Markdown 변환기보다 **Vite·Vue 애플리케이션의 개발 경험을 문서 사이트에 적용한 생성기**에 가깝습니다. — [What is VitePress? | VitePress](https://vitepress.dev/guide/what-is-vitepress) (확인: 2026-09-11)

## 정적 사이트인데 Vue 애플리케이션인 이유

VitePress는 최초 방문 시 미리 생성한 정적 HTML을 제공합니다. 이후 브라우저가 JavaScript 번들을 실행하면 페이지가 Vue SPA로 전환되고, 사이트 내부 이동은 전체 페이지 새로고침 대신 클라이언트 내비게이션으로 처리됩니다. 이 과정을 hydration이라고 합니다. — [What is VitePress? | VitePress](https://vitepress.dev/guide/what-is-vitepress) (확인: 2026-09-11)

따라서 VitePress를 “서버가 매 요청마다 Markdown을 HTML로 렌더링하는 시스템”으로 이해하면 틀립니다. 렌더링의 핵심은 빌드 시점에 수행되고, 배포 시점에는 생성된 파일을 제공하면 됩니다. 다만 Vue 기반 상호작용과 빠른 내부 이동을 위해 브라우저에서 JavaScript가 실행됩니다.

이 구조는 두 결과를 함께 노립니다.

- 처음 접속할 때는 미리 생성된 HTML 덕분에 콘텐츠가 빠르게 보이고 SEO에 유리합니다.
- 첫 페이지가 로드된 뒤에는 Vue SPA처럼 페이지 전체를 다시 받지 않고 이동할 수 있습니다.

## 가장 작은 프로젝트

VitePress 공식 Setup Wizard는 다음 명령으로 기본 프로젝트를 생성합니다.

```bash
npm add -D vitepress@next
npx vitepress init
```

현재 공식 Getting Started 문서는 Node.js 22 이상을 사전 요구사항으로 안내하고, VitePress를 ESM 전용 패키지로 설명합니다. 따라서 `require()` 대신 ESM import를 사용해야 하며, 설정 파일을 `.js`로 둘 때는 가까운 `package.json`의 `type` 설정도 확인해야 합니다. — [Getting Started | VitePress](https://vitepress.dev/guide/getting-started) (확인: 2026-09-11)

기존 프로젝트 안에 문서 사이트를 넣는 경우의 기본 구조는 다음과 같습니다.

```text
project/
├── docs/
│   ├── .vitepress/
│   │   └── config.js
│   ├── index.md
│   └── guide.md
└── package.json
```

`docs/`는 VitePress 사이트의 프로젝트 루트이고, `.vitepress/`는 설정·개발 서버 캐시·빌드 결과·선택적 테마 코드를 두는 예약 디렉터리입니다. 기본적으로 운영 빌드 결과는 `.vitepress/dist/`에 생성됩니다. — [Getting Started | VitePress](https://vitepress.dev/guide/getting-started) (확인: 2026-09-11)

## 파일 기반 라우팅

VitePress는 Markdown 파일의 위치를 URL로 매핑합니다.

```text
docs/index.md                    -> /
docs/guide.md                    -> /guide.html
docs/guide/index.md              -> /guide/
docs/guide/getting-started.md    -> /guide/getting-started.html
```

즉, 문서 파일을 어디에 두는지가 사이트 경로의 기본값을 결정합니다. `index.md`는 해당 디렉터리의 대표 페이지가 됩니다. VitePress는 경로 재작성과 clean URL 같은 설정도 제공하지만, 기본 모델은 디렉터리 구조와 Markdown 파일의 대응입니다. — [Routing | VitePress](https://vitepress.dev/guide/routing) (확인: 2026-09-11)

내부 문서 링크는 확장자를 생략하는 것이 권장됩니다.

```markdown
[시작하기](./guide/getting-started)
```

`.md`나 `.html`을 직접 적는 방식도 동작할 수 있지만, 확장자를 생략하면 VitePress 설정에 따라 최종 URL이 결정되므로 소스 경로와 배포 URL을 덜 강하게 묶을 수 있습니다. — [Routing | VitePress](https://vitepress.dev/guide/routing) (확인: 2026-09-11)

## Markdown을 Vue 컴포넌트로 확장합니다

VitePress의 각 Markdown 페이지는 Vue Single-File Component처럼 처리됩니다. 그래서 일반 Markdown을 작성하면서 Vue 템플릿 기능이나 가져온 Vue 컴포넌트를 함께 사용할 수 있습니다. — [What is VitePress? | VitePress](https://vitepress.dev/guide/what-is-vitepress) (확인: 2026-09-11)

```md
# 설치

<button @click="count++">클릭: {{ count }}</button>

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>
```

이 예시는 문서가 단순한 텍스트 파일에 머물지 않고 Vue의 상태와 이벤트를 포함할 수 있음을 보여 줍니다. 반대로 문서에 상호작용이 필요하지 않다면 일반 Markdown만 사용하는 편이 빌드와 유지보수의 복잡도를 낮춥니다.

## 테마와 설정

`.vitepress/config.js`는 사이트 전역 설정과 테마 설정의 진입점입니다.

```js
// docs/.vitepress/config.js
export default {
  title: '데이터 파이프라인 노트',
  description: '데이터 엔지니어링 학습 문서',

  themeConfig: {
    nav: [
      { text: '가이드', link: '/guide' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: '가이드',
          items: [
            { text: '시작하기', link: '/guide/getting-started' }
          ]
        }
      ]
    }
  }
}
```

`themeConfig`는 기본 테마의 내비게이션·사이드바 등 표시 방식을 설정합니다. 기본 테마를 확장하거나 완전히 대체하는 사용자 정의 테마도 만들 수 있습니다. VitePress는 Vite 플러그인 생태계와 데이터 로딩·동적 라우트 생성 API도 활용할 수 있습니다. — [What is VitePress? | VitePress](https://vitepress.dev/guide/what-is-vitepress) (확인: 2026-09-11), [Getting Started | VitePress](https://vitepress.dev/guide/getting-started) (확인: 2026-09-11)

## 개발과 빌드

공식 문서가 제시하는 기본 npm 스크립트는 다음과 같습니다.

```json
{
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  }
}
```

`docs:dev`는 문서 수정 사항을 즉시 반영하는 개발 서버를 실행하고, `docs:build`는 배포용 사이트를 생성하며, `docs:preview`는 빌드 결과를 로컬에서 확인합니다. 공식 Getting Started 문서의 개발 서버 기본 주소는 `http://localhost:5173`입니다. — [Getting Started | VitePress](https://vitepress.dev/guide/getting-started) (확인: 2026-09-11)

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

빌드 결과인 `.vitepress/dist/`는 정적 파일이므로 정적 파일을 제공할 수 있는 웹 서버에 배포할 수 있습니다. 다만 clean URL을 사용하려면 호스팅 서버가 `/foo`를 `/foo.html`로 매핑하는 기능을 지원하는지 함께 확인해야 합니다. — [Routing | VitePress](https://vitepress.dev/guide/routing) (확인: 2026-09-11)

## VitePress의 경계

VitePress는 문서와 콘텐츠를 사이트로 만드는 도구이지만 다음을 대신 결정하지는 않습니다.

- 문서가 설명해야 할 내용과 정보 구조
- 문서 빌드를 실행할 CI 파이프라인
- 빌드 결과를 배포할 호스팅 환경
- 비공개 문서의 인증·권한 정책

또한 동적 데이터가 있다고 해서 런타임 서버에서 매 요청마다 페이지를 생성하는 것은 아닙니다. VitePress의 동적 라우트도 가능한 페이지 경로를 빌드 시점에 결정해야 합니다. 외부 데이터나 로컬 파일로부터 경로를 만든다면 paths loader가 반환할 경로를 빌드 시점에 계산할 수 있어야 합니다. — [Routing | VitePress](https://vitepress.dev/guide/routing) (확인: 2026-09-11)

## 실행 환경과 확인 결과

이 문서를 작성한 환경에서 확인한 결과는 다음과 같습니다.

```text
Node.js       v22.21.1
VitePress     설치되지 않음
```

공식 문서의 Node.js 22 이상 요구사항은 이 환경에서 충족하지만, `vitepress` 패키지와 실행 파일은 설치되어 있지 않았습니다. 따라서 `vitepress init`, `vitepress dev`, `vitepress build` 명령은 **미실행**입니다. 위 명령과 출력은 이번 환경에서 직접 실행한 결과가 아닙니다.

## 확인하지 못한 것

- **이 환경에서의 VitePress 빌드 출력** — `vitepress` 패키지가 설치되어 있지 않아 최소 프로젝트를 직접 생성·빌드하지 못했습니다.
- **특정 안정 릴리스의 세부 동작** — 공식 문서의 버전 선택기에 `2.0.0-alpha.20`과 `1.6.4`가 함께 표시되어, 이 문서에서는 특정 릴리스에 종속되지 않는 공식 가이드의 개념과 구조를 중심으로 정리했습니다.

*작성일: 2026-09-11*
