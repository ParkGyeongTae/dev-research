---
sidebar_position: 1
---

# Astro란 무엇인가

> **원문** — [Astro Docs](https://docs.astro.build/)
>
> **확인 날짜** — 2026-09-11 (공식 문서에 확인한 페이지의 판번호가 표시되지 않음)
>
> **검증 상태** — Astro 공식 Docs·Markdown Content·Content Collections 원문을 읽고, 이 환경의 Node.js와 Astro 설치 여부를 직접 확인했습니다. Astro 예시는 이 환경에서 실행하지 못했습니다.

## 한 문장으로 말하면

> Astro is a perfect choice for your content-focused site: blogs, marketing sites, portfolios, and more!
>
> **번역** — Astro는 블로그·마케팅 사이트·포트폴리오 등 콘텐츠 중심 사이트에 적합한 선택입니다.
>
> — [Authoring Content | Astro](https://docs.astro.build/en/guides/content/) (확인: 2026-09-11)

Astro는 콘텐츠 중심 웹사이트를 만들기 위한 JavaScript 기반 웹 프레임워크입니다. Markdown·MDX·Markdoc 콘텐츠, 콘텐츠 컬렉션, 파일 기반 라우팅, React·Vue 같은 UI 프레임워크 통합을 조합해 정적 또는 서버 렌더링 사이트를 만들 수 있습니다. — [Astro Docs](https://docs.astro.build/) (확인: 2026-09-11)

Astro를 단순한 문서 사이트 생성기로만 보면 범위를 좁게 이해하게 됩니다. VitePress·Docusaurus가 문서 사이트 기능을 중심에 둔다면, Astro는 콘텐츠 사이트 전반을 만들고 필요한 UI에만 상호작용을 추가하는 쪽에 가깝습니다.

## 파일 기반 라우팅

Astro에서는 `src/pages/` 안의 파일이 사이트의 페이지가 됩니다.

```text
src/
└── pages/
    ├── index.astro
    ├── about.astro
    └── posts/
        └── first-post.md
```

`src/pages/about.astro`는 `/about/`, `src/pages/posts/first-post.md`는 해당 파일 경로를 바탕으로 한 페이지가 됩니다. Astro 공식 문서는 `src/pages/`의 파일이 파일 기반 라우팅으로 엔드포인트를 만든다고 설명합니다. — [Pages | Astro](https://docs.astro.build/en/basics/astro-pages/) (확인: 2026-09-11)

```markdown
---
title: 첫 번째 글
---

# {{ title }}

콘텐츠 페이지입니다.
```

## Content Collections로 콘텐츠의 모양을 검증합니다

관련 Markdown·MDX 파일이 많아지면 Content Collections로 콘텐츠 집합을 정의할 수 있습니다. 컬렉션은 같은 구조를 공유하는 콘텐츠를 묶고, 스키마를 통해 편집기 자동 완성·타입 검사·검증을 제공할 수 있습니다. — [Content collections | Astro](https://docs.astro.build/en/guides/content-collections/) (확인: 2026-09-11)

```text
src/content/
├── config.ts
└── posts/
    ├── first-post.md
    └── second-post.md
```

이 방식의 핵심은 Markdown 파일을 단순히 페이지로 렌더링하는 것이 아니라, 콘텐츠를 **정해진 데이터 구조를 가진 레코드 집합**으로 다루는 데 있습니다. 제목·작성일·태그가 필요한 게시물에서 필드 누락이나 타입 오류를 빌드 단계에 발견할 수 있습니다.

반대로 페이지가 한두 개뿐이라면 컬렉션을 만드는 비용이 이점보다 클 수 있습니다. 공식 문서도 구조가 반복되는 콘텐츠에 컬렉션을 사용하고, 단일 페이지에는 일반 페이지 파일을 고려하도록 구분합니다. — [Content collections | Astro](https://docs.astro.build/en/guides/content-collections/) (확인: 2026-09-11)

## Markdown과 MDX

Astro는 Markdown을 페이지와 콘텐츠 컬렉션의 입력으로 사용할 수 있고, MDX 통합을 설치하면 JSX와 컴포넌트를 콘텐츠에 사용할 수 있습니다. — [Markdown in Astro](https://docs.astro.build/en/guides/markdown-content/) (확인: 2026-09-11)

```mdx
import Notice from '../components/Notice.astro'

# 설치

<Notice>Node.js가 필요합니다.</Notice>
```

여기서 콘텐츠 파일과 UI 컴포넌트의 경계가 흐려질 수 있습니다. 문서가 주로 텍스트라면 Markdown을 유지하고, 실제 상호작용이 필요한 부분에만 컴포넌트를 넣는 것이 구조를 읽기 쉽습니다.

## 정적 빌드와 동적 데이터

Astro는 콘텐츠를 빌드 시점에 읽고 정적 페이지로 만들 수 있습니다. Content Collections의 build-time 데이터는 성능·캐싱에 유리하지만, 실시간 주가처럼 자주 바뀌는 데이터에는 적합하지 않을 수 있습니다. 그런 경우 요청 시 데이터를 가져오는 live content를 검토해야 하며, 그 대신 요청 비용이 생깁니다. — [Content collections | Astro](https://docs.astro.build/en/guides/content-collections/) (확인: 2026-09-11)

```bash
npm create astro@latest
npm run dev
npm run build
```

Astro 공식 문서는 CLI로 새 프로젝트를 만들고 개발 서버와 빌드를 실행하는 흐름을 제공합니다. 다만 이 명령의 구체적인 스크립트는 생성한 템플릿과 Astro 버전에 따라 달라질 수 있으므로, 프로젝트의 `package.json`을 기준으로 확인해야 합니다. — [Astro Docs](https://docs.astro.build/) (확인: 2026-09-11)

## Astro의 경계

Astro는 콘텐츠를 정적으로 생성하는 데 강하지만 모든 페이지가 정적이어야 한다는 뜻은 아닙니다. 페이지·콘텐츠·렌더링 모드·UI 프레임워크 통합을 조합할 수 있으므로, 실제 배포 방식은 프로젝트 설정에 따라 달라집니다. 정적 호스팅을 선택하려면 페이지와 데이터가 빌드 시점에 결정 가능한지부터 확인해야 합니다.

## 실행 환경과 확인 결과

```text
Node.js    v22.21.1
Astro      설치되지 않음
```

Node.js는 설치되어 있지만 Astro 패키지와 실행 파일은 이 저장소에 설치되어 있지 않습니다. 따라서 `npm create astro@latest`, `npm run dev`, `npm run build` 예시는 **미실행**입니다.

## 확인하지 못한 것

- **이 환경에서의 Astro 프로젝트 생성·빌드 출력** — Astro 패키지가 설치되어 있지 않아 직접 실행하지 못했습니다.
- **특정 Astro 릴리스의 기본 렌더링 모드** — 공식 문서의 확인 페이지에 판번호가 표시되지 않아 릴리스별 기본값은 단정하지 않았습니다.

*작성일: 2026-09-11*
