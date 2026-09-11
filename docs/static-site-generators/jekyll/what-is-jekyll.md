---
sidebar_position: 1
---

# Jekyll이란 무엇인가

> **원문** — [Quickstart | Jekyll](https://jekyllrb.com/docs/)
>
> **확인 날짜** — 2026-09-11 (공식 문서 v4.4.1)
>
> **검증 상태** — Jekyll 공식 Quickstart 원문을 읽고, 이 환경의 Ruby·Jekyll 설치 여부를 직접 확인했습니다. Jekyll 예시는 이 환경에서 실행하지 못했습니다.

## 한 문장으로 말하면

> Jekyll is a static site generator.
>
> **번역** — Jekyll은 정적 사이트 생성기입니다.
>
> — [Quickstart | Jekyll](https://jekyllrb.com/docs/) (확인: 2026-09-11)

Jekyll은 Markdown 같은 마크업으로 작성한 텍스트에 레이아웃을 적용해 정적 웹사이트를 생성합니다. 사이트의 모양·URL·페이지에 표시할 데이터 등을 템플릿과 설정으로 조정할 수 있습니다. — [Quickstart | Jekyll](https://jekyllrb.com/docs/) (확인: 2026-09-11)

Jekyll의 중요한 특징은 **콘텐츠와 사이트 구조가 파일로 표현되고, 빌드가 끝난 뒤에는 정적 파일만 배포한다는 점**입니다. 따라서 요청마다 애플리케이션 서버가 콘텐츠를 조합하지 않아도 됩니다.

## 기본 구성

Jekyll 프로젝트의 핵심 구성은 다음과 같습니다.

```text
my-site/
├── _config.yml
├── _posts/
├── _layouts/
├── _includes/
├── assets/
└── index.md
```

`_config.yml`은 사이트 설정, `_layouts/`는 페이지 레이아웃, `_includes/`는 재사용할 템플릿 조각, `_posts/`는 날짜 기반 게시물, `assets/`는 CSS·JavaScript·이미지 같은 리소스를 두는 영역입니다. Jekyll 공식 문서는 Pages·Posts·Front Matter·Collections·Data Files·Layouts를 각각 별도 개념으로 다룹니다. — [Quickstart | Jekyll](https://jekyllrb.com/docs/) (확인: 2026-09-11)

```yaml
# _config.yml
title: 데이터 파이프라인 노트
description: 데이터 엔지니어링 학습 문서
```

```markdown
---
layout: default
title: 시작하기
---

# 시작하기

첫 번째 페이지입니다.
```

문서 위의 YAML 영역을 Front Matter라고 부릅니다. Front Matter는 페이지의 제목·레이아웃·날짜·분류 같은 메타데이터를 템플릿에 전달합니다. 본문만 보고 결과를 판단하면 레이아웃 선택과 URL 생성에 사용된 메타데이터를 놓칠 수 있습니다.

## Liquid와 레이아웃

Jekyll은 Liquid 템플릿으로 페이지 데이터를 HTML에 삽입합니다.

```liquid
<!-- _layouts/default.html -->
<!doctype html>
<html>
  <head>
    <title>{{ page.title }} | {{ site.title }}</title>
  </head>
  <body>
    {{ content }}
  </body>
</html>
```

페이지의 `{{ content }}` 자리에 Markdown 본문이 들어갑니다. 레이아웃을 재사용하면 여러 페이지의 HTML 골격을 한곳에서 관리할 수 있지만, 레이아웃·include·Front Matter 사이의 연결이 깨지면 결과가 빈 페이지나 잘못된 제목으로 나타날 수 있습니다.

## Posts와 Collections

Jekyll은 블로그 게시물을 `_posts/` 아래에 날짜가 포함된 파일명으로 저장하는 모델을 제공합니다. 게시물 외에 반복되는 문서 집합을 만들고 싶다면 Collections를 사용할 수 있습니다. 공식 문서의 콘텐츠 항목도 Posts와 Collections를 별도 기능으로 구분합니다. — [Quickstart | Jekyll](https://jekyllrb.com/docs/) (확인: 2026-09-11)

```text
_posts/
└── 2026-09-11-first-post.md
```

파일 위치와 이름 규칙은 단순한 명명 규칙이 아니라 Jekyll이 콘텐츠를 어떤 종류로 해석할지에 영향을 줍니다. 게시물처럼 날짜 순서가 중요한 콘텐츠와 API 문서처럼 고정된 계층이 중요한 콘텐츠를 같은 방식으로 모델링하면 URL·정렬·템플릿이 어긋날 수 있습니다.

## 개발 서버와 빌드

```bash
bundle exec jekyll serve
jekyll build
```

공식 Quickstart에서 `bundle exec jekyll serve`는 사이트를 빌드하고 `http://localhost:4000`의 로컬 서버에서 제공하며, `--livereload`를 추가하면 변경 사항을 자동 반영합니다. Jekyll은 Ruby 2.7 이상·RubyGems·GCC와 Make를 요구합니다. — [Quickstart | Jekyll](https://jekyllrb.com/docs/) (확인: 2026-09-11)

## GitHub Pages와의 관계

Jekyll은 GitHub Pages와 자주 함께 언급되지만, 둘은 같은 제품이 아닙니다. Jekyll은 사이트를 빌드하는 도구이고 GitHub Pages는 빌드 결과를 호스팅하는 서비스입니다. 따라서 Jekyll의 Ruby 의존성·플러그인 사용 가능 여부와 GitHub Pages의 빌드 환경을 별도로 확인해야 합니다.

## Jekyll의 경계

Jekyll은 정적 파일을 만드는 빌드 도구이므로 로그인·권한·실시간 사용자별 데이터 같은 서버 기능을 자체적으로 제공하지 않습니다. 그런 기능이 필요하면 별도의 백엔드나 클라이언트 JavaScript가 필요합니다.

## 실행 환경과 확인 결과

```text
Ruby       2.6.10p210
Jekyll     설치되지 않음
```

현재 Ruby는 공식 Quickstart의 최소 버전 2.7.0보다 낮고, `jekyll` 명령도 설치되어 있지 않습니다. 따라서 `jekyll serve`와 `jekyll build`는 **미실행**입니다.

## 확인하지 못한 것

- **이 환경에서의 Jekyll 빌드 출력** — Ruby 버전이 요구사항보다 낮고 Jekyll이 설치되어 있지 않아 실행하지 못했습니다.
- **GitHub Pages의 현재 빌드 환경** — 이 문서의 주제는 Jekyll 자체이며, 호스팅 서비스의 별도 빌드 정책은 확인하지 않았습니다.

*작성일: 2026-09-11*
