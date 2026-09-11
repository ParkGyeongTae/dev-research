---
sidebar_position: 1
---

# Hugo란 무엇인가

> **원문** — [Introduction | Hugo](https://gohugo.io/about/introduction/)
>
> **확인 날짜** — 2026-09-11 (공식 문서에 확인한 페이지의 판번호가 표시되지 않음)
>
> **검증 상태** — Hugo 공식 Introduction·Features·Documentation 원문을 읽고, 이 환경의 Hugo 설치 여부를 직접 확인했습니다. Hugo 예시는 이 환경에서 실행하지 못했습니다.

## 한 문장으로 말하면

> Hugo is a static site generator written in Go, optimized for speed and designed for flexibility.
>
> **번역** — Hugo는 Go로 작성되었으며 속도에 최적화되고 유연성을 목표로 설계된 정적 사이트 생성기입니다.
>
> — [Introduction | Hugo](https://gohugo.io/about/introduction/) (확인: 2026-09-11)

Hugo는 콘텐츠 파일과 템플릿·설정·리소스를 빌드 시점에 결합해 정적 웹사이트를 만드는 도구입니다. 문서 사이트뿐 아니라 블로그·기업 사이트·다국어 사이트·랜딩 페이지에도 사용할 수 있습니다. — [Introduction | Hugo](https://gohugo.io/about/introduction/) (확인: 2026-09-11)

Hugo의 핵심 특성은 **별도의 런타임 애플리케이션 서버 없이 단일 실행 파일로 사이트를 빌드한다는 점**입니다. 최종 결과물은 HTML·CSS·JavaScript·이미지 같은 정적 파일이고, 이를 정적 파일 호스팅 서비스에 배포합니다.

## 콘텐츠와 템플릿을 분리합니다

가장 작은 Hugo 프로젝트는 다음과 같은 형태로 생각할 수 있습니다.

```text
my-site/
├── content/
│   └── _index.md
├── layouts/
│   └── _default/
│       └── single.html
├── static/
│   └── favicon.ico
├── hugo.yaml
└── public/              # 빌드 결과
```

`content/`는 작성할 콘텐츠, `layouts/`는 콘텐츠를 HTML로 표현할 템플릿, `static/`은 변환하지 않고 복사할 파일, `hugo.yaml`은 사이트 설정을 두는 자리입니다. `public/`은 `hugo` 명령이 생성하는 기본 출력 디렉터리입니다. Hugo 공식 문서도 콘텐츠 관리·템플릿·정적 파일·설정을 별도 영역으로 다룹니다. — [Hugo Documentation](https://gohugo.io/documentation/) (확인: 2026-09-11)

```markdown
<!-- content/_index.md -->
---
title: 데이터 파이프라인 노트
---

# 데이터 파이프라인 노트

첫 번째 페이지입니다.
```

```yaml
# hugo.yaml
baseURL: https://example.com/
languageCode: ko-kr
title: 데이터 파이프라인 노트
```

콘텐츠 Markdown만 작성한다고 페이지 모양이 정해지는 것은 아닙니다. 어떤 레이아웃이 선택되는지, Front Matter가 어떤 값을 제공하는지, 템플릿이 그 값을 어떻게 사용하는지가 최종 HTML을 결정합니다. 그래서 Hugo를 Markdown 변환기로만 보면 템플릿 계층과 콘텐츠 조직이 만들어 내는 동작을 놓치게 됩니다.

## 콘텐츠 조직이 URL과 페이지 종류를 만듭니다

Hugo는 콘텐츠를 섹션·페이지·분류 같은 구조로 조직하고, 그 구조를 메뉴·URL·목록 페이지 생성에 활용합니다. 공식 문서는 content types, menus, taxonomies, cross references, summaries 등을 콘텐츠 관리 기능으로 제공합니다. — [Hugo Documentation](https://gohugo.io/documentation/) (확인: 2026-09-11)

예를 들어 다음처럼 콘텐츠를 배치할 수 있습니다.

```text
content/
├── _index.md
└── guides/
    ├── _index.md
    └── getting-started.md
```

이 구조는 `guides`라는 섹션과 그 안의 `getting-started` 페이지를 표현합니다. 실제 URL은 설정·Front Matter·permalink에 따라 달라질 수 있으므로, 디렉터리 이름만 보고 최종 URL을 확정하면 안 됩니다.

## 템플릿과 Hugo Pipes

Hugo 템플릿은 콘텐츠·데이터·리소스를 읽어 출력 형식으로 렌더링합니다. HTML이 기본 출력 형식이지만 JSON·RSS·CSV 같은 다른 출력 형식도 구성할 수 있습니다. Hugo Pipes는 이미지·스타일시트·JavaScript를 변환·최적화하는 asset pipeline을 제공합니다. — [Features | Hugo](https://gohugo.io/about/features/) (확인: 2026-09-11)

```go-html-template
<!-- layouts/_default/single.html -->
<!doctype html>
<html lang="{{ .Site.LanguageCode }}">
  <head>
    <title>{{ .Title }}</title>
  </head>
  <body>
    <h1>{{ .Title }}</h1>
    {{ .Content }}
  </body>
</html>
```

템플릿이 잘못되거나 Front Matter의 형식이 틀리면 빌드가 실패하거나 예상과 다른 페이지가 생성될 수 있습니다. 즉, 빌드가 빠르다는 장점은 템플릿·콘텐츠 계약을 느슨하게 관리해도 된다는 뜻이 아닙니다.

## 개발 서버와 빌드

```bash
hugo server
hugo
```

`hugo server`는 작성 중 변경을 확인하기 위한 개발 서버이고, `hugo`는 배포용 정적 사이트를 생성하는 기본 명령입니다. 공식 문서는 Hugo의 내장 웹 서버로 콘텐츠·구조·동작·표현의 변경을 즉시 확인한 뒤 호스트나 Git 제공자에 배포하는 흐름을 안내합니다. — [Introduction | Hugo](https://gohugo.io/about/introduction/) (확인: 2026-09-11)

## Hugo의 경계

Hugo는 데이터베이스에서 매 요청마다 콘텐츠를 읽고 HTML을 만드는 서버가 아닙니다. 빌드 시점에 페이지를 만들기 때문에 다음 데이터는 빌드 시점에 이용 가능해야 합니다.

- 콘텐츠 파일과 Front Matter
- 템플릿이 사용하는 로컬 데이터
- 빌드 시점에 가져오는 외부 데이터

실시간 사용자별 데이터, 로그인 세션, 요청마다 달라지는 결과가 핵심이라면 Hugo가 생성한 정적 페이지 위에 별도의 API나 클라이언트 로직이 필요합니다. Hugo의 정적 출력은 배포를 단순하게 하지만, 동적 기능까지 자동으로 제공하지는 않습니다.

## 실행 환경과 확인 결과

```text
Hugo       설치되지 않음
Node.js    v22.21.1
```

`hugo` 명령이 설치되어 있지 않아 `hugo server`와 `hugo`는 **미실행**입니다. 위 명령의 출력은 이번 환경에서 재현한 결과가 아닙니다.

## 확인하지 못한 것

- **이 환경에서의 Hugo 빌드 출력** — Hugo 실행 파일이 설치되어 있지 않아 최소 프로젝트를 직접 빌드하지 못했습니다.
- **특정 Hugo 릴리스의 기본값** — 공식 문서의 확인 페이지에 판번호가 표시되지 않아 릴리스별 기본값은 확인하지 않았습니다.

*작성일: 2026-09-11*
