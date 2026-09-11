---
sidebar_position: 1
---

# Eleventy란 무엇인가

> **원문** — [Eleventy is a simpler static site generator](https://www.11ty.dev/)
>
> **확인 날짜** — 2026-09-11 (공식 홈페이지에 Stable 3.1.1과 Beta 3.1.2-beta.4가 표시됨)
>
> **검증 상태** — Eleventy 공식 홈페이지의 Quick Start·템플릿·출력·설정 관련 원문을 읽고, 이 환경의 Node.js와 Eleventy 설치 여부를 직접 확인했습니다. Eleventy 예시는 이 환경에서 실행하지 못했습니다.

## 한 문장으로 말하면

> Eleventy is a simpler static site generator.
>
> **번역** — Eleventy는 더 단순한 정적 사이트 생성기입니다.
>
> — [Eleventy 공식 홈페이지](https://www.11ty.dev/) (확인: 2026-09-11)

Eleventy(11ty)는 Markdown·HTML·Liquid·Nunjucks·JavaScript 등 여러 템플릿 언어를 입력으로 받아 정적 사이트를 생성하는 JavaScript 도구입니다. 특정 UI 프레임워크를 기본으로 요구하지 않고, 필요한 파일과 디렉터리를 지정해 기존 프로젝트에 점진적으로 적용할 수 있다는 점이 핵심입니다. — [Eleventy 공식 홈페이지](https://www.11ty.dev/) (확인: 2026-09-11)

Eleventy를 “React나 Vue 앱을 정적으로 렌더링하는 프레임워크”로 이해하면 범위를 잘못 잡게 됩니다. Eleventy의 기본 모델은 템플릿을 빌드 시점에 HTML로 변환하는 것이며, 브라우저 상호작용은 필요할 때 별도의 JavaScript나 web component를 추가하는 방식입니다.

## 가장 작은 프로젝트

공식 Quick Start의 최소 흐름은 Markdown 파일 하나를 만들고 Eleventy를 실행하는 것입니다.

```text
my-site/
└── index.md
```

```markdown
---
title: 시작 페이지
---

# {{ title }}

첫 번째 페이지입니다.
```

```bash
npx @11ty/eleventy --serve
```

Eleventy는 현재 디렉터리에서 지원하는 확장자의 파일을 찾아 `_site/`에 출력합니다. Markdown 파일은 `index.html`로 변환되고, `--serve`를 사용하면 로컬 개발 서버도 실행됩니다. 공식 예시의 개발 서버 주소는 `http://localhost:8080/`입니다. — [Eleventy 공식 홈페이지](https://www.11ty.dev/) (확인: 2026-09-11)

## 여러 템플릿 언어를 함께 사용합니다

Eleventy는 HTML·Markdown·Liquid·Nunjucks·JavaScript 등 여러 입력 형식을 지원합니다. 한 프로젝트에서 하나만 선택할 수도 있고, 파일별로 다른 언어를 사용할 수도 있습니다. — [Eleventy 공식 홈페이지](https://www.11ty.dev/) (확인: 2026-09-11)

```text
index.md             # 문서
_includes/card.njk   # 재사용 템플릿
posts/post.liquid    # 게시물 템플릿
data/site.json       # 데이터
```

이 유연성은 장점이면서 판단 지점이기도 합니다. 팀이 여러 템플릿 언어를 무분별하게 섞으면 각 파일의 문법과 데이터 전달 규칙을 다시 배워야 하므로, 지원된다는 사실과 그렇게 쓰는 것이 좋은지는 구분해야 합니다.

## Front Matter와 컬렉션

Front Matter는 콘텐츠의 제목·날짜·태그 같은 메타데이터를 전달하고, 컬렉션은 관련 콘텐츠를 묶어 목록을 만드는 데 사용합니다.

```liquid
{%- for post in collections.posts %}
  <a href="{{ post.url }}">{{ post.data.title }}</a>
{%- endfor %}
```

템플릿은 컬렉션을 순회해 게시물 목록을 만들고, 각 원본 파일은 개별 HTML 페이지가 됩니다. 즉, Eleventy의 핵심은 컴포넌트 트리보다 **입력 파일·Front Matter·컬렉션·템플릿 사이의 데이터 흐름**입니다.

## 빌드와 점진적 도입

```bash
npx @11ty/eleventy
npx @11ty/eleventy --serve
```

첫 번째 명령은 `_site/`에 정적 파일을 만들고, 두 번째 명령은 변경 감시와 개발 서버를 함께 실행합니다. Eleventy는 지정한 파일과 디렉터리만 찾아 처리할 수 있어 기존 사이트 전체를 한 번에 옮기지 않고 일부 템플릿부터 전환하는 점진적 도입도 가능합니다. — [Eleventy 공식 홈페이지](https://www.11ty.dev/) (확인: 2026-09-11)

## Eleventy의 경계

Eleventy가 생성하는 것은 정적 출력입니다. 사용자별 세션·실시간 데이터·권한 확인이 필요한 기능은 별도의 서버나 브라우저 JavaScript가 필요합니다. 또한 Eleventy는 템플릿 언어를 여러 개 지원하지만, 템플릿 언어 간 데이터 모델과 렌더링 규칙까지 자동으로 통일해 주지는 않습니다.

## 실행 환경과 확인 결과

```text
Node.js    v22.21.1
Eleventy   설치되지 않음
```

공식 홈페이지의 Node.js 18 이상 요구사항은 충족하지만, `eleventy` 실행 파일은 설치되어 있지 않습니다. 따라서 `npx @11ty/eleventy` 예시는 **미실행**입니다.

## 확인하지 못한 것

- **이 환경에서의 Eleventy 빌드 출력** — Eleventy 패키지가 설치되어 있지 않아 최소 프로젝트를 직접 빌드하지 못했습니다.
- **공식 페이지의 성능 비교 수치 재현** — 하드웨어·입력 파일 수·템플릿·측정 조건을 동일하게 구성하지 못해 수치를 인용하지 않았습니다.

*작성일: 2026-09-11*
