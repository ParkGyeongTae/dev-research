---
sidebar_position: 1
---

# MkDocs란 무엇인가

> **원문** — [MkDocs 공식 홈페이지](https://www.mkdocs.org/)
>
> **확인 날짜** — 2026-09-11 (공식 문서에 판번호가 표시되지 않음)
>
> **검증 상태** — 공식 홈페이지·Getting Started·Configuration·Writing Your Docs 원문을 읽었으며, 이 문서의 실행 환경만 직접 확인했습니다. MkDocs 예시는 이 환경에서 실행하지 못했습니다.

## 한 문장으로 말하면

> MkDocs is a fast, simple and downright gorgeous static site generator that's geared towards building project documentation.
>
> **번역** — MkDocs는 프로젝트 문서를 만드는 데 초점을 둔 빠르고 단순하며 매우 매력적인 정적 사이트 생성기입니다.
>
> — [MkDocs 공식 홈페이지](https://www.mkdocs.org/) (확인: 2026-09-11)

MkDocs는 Markdown으로 작성한 문서와 YAML 설정 파일을 입력받아 정적 HTML 사이트를 생성합니다. 결과물은 서버에서 애플리케이션 코드를 실행하지 않고도 웹 서버나 정적 호스팅 서비스에서 제공할 수 있는 파일 묶음입니다. 공식 문서도 MkDocs의 문서 원본은 Markdown으로 작성하고, 하나의 YAML 설정 파일로 구성한다고 설명합니다. — [MkDocs 공식 홈페이지](https://www.mkdocs.org/) (확인: 2026-09-11)

핵심은 MkDocs가 문서를 직접 서비스하는 애플리케이션 서버가 아니라 **문서 소스를 웹사이트 산출물로 변환하는 빌드 도구**라는 점입니다. 따라서 문서를 수정하는 일과 수정한 문서를 배포하는 일은 분리됩니다.

## 가장 작은 프로젝트

공식 문서가 제시하는 기본 구조는 다음과 같습니다.

```text
my-project/
├── mkdocs.yml
└── docs/
    └── index.md
```

`mkdocs.yml`은 프로젝트 설정 파일이고, `docs/`는 문서 원본을 두는 기본 디렉터리입니다. `docs/index.md`는 기본 홈페이지가 됩니다. `site_name`은 설정 파일에 반드시 필요한 항목이며, 나머지 설정은 선택 사항입니다. — [Configuration](https://www.mkdocs.org/user-guide/configuration/) (확인: 2026-09-11), [Writing Your Docs](https://www.mkdocs.org/user-guide/writing-your-docs/) (확인: 2026-09-11)

```yaml
# mkdocs.yml
site_name: 데이터 파이프라인 노트
```

````markdown
<!-- docs/index.md -->
# 데이터 파이프라인 노트

첫 번째 문서입니다.
````

이 두 파일을 빌드하면 Markdown 페이지가 테마가 적용된 HTML 페이지로 변환됩니다. 입력 파일의 위치와 이름이 출력 사이트의 경로에도 영향을 줍니다. 예를 들어 `docs/about.md`는 기본적으로 `/about/` 페이지가 되고, `docs/user-guide/getting-started.md`는 `/user-guide/getting-started/` 페이지가 됩니다. — [Writing Your Docs](https://www.mkdocs.org/user-guide/writing-your-docs/) (확인: 2026-09-11)

## MkDocs가 하는 일

### 1. Markdown을 HTML로 변환합니다

MkDocs 페이지는 Markdown으로 작성합니다. MkDocs는 Python-Markdown을 사용해 Markdown을 HTML로 렌더링하며, 필요한 경우 `markdown_extensions` 설정으로 문법 확장을 켤 수 있습니다. — [Writing Your Docs](https://www.mkdocs.org/user-guide/writing-your-docs/) (확인: 2026-09-11)

````markdown
# 설치

```bash
pip install mkdocs
```
````

여기서 중요한 것은 Markdown 파일이 곧 배포 파일은 아니라는 점입니다. Markdown은 사람이 편집하는 입력이고, 브라우저가 받는 HTML은 MkDocs가 빌드한 출력입니다.

### 2. 문서 내비게이션을 구성합니다

`nav`를 설정하면 문서 사이트의 전역 내비게이션에 포함할 페이지와 순서를 직접 정할 수 있습니다.

```yaml
site_name: 데이터 파이프라인 노트
nav:
  - 시작하기: index.md
  - 설치: installation.md
  - 운영: operations.md
```

`nav`를 생략하면 MkDocs가 문서 디렉터리의 Markdown 파일을 찾아 내비게이션을 자동으로 구성합니다. 이 경우 파일명 기준으로 정렬되므로, 원하는 독서 순서가 있다면 `nav`를 명시하는 편이 안전합니다. — [Writing Your Docs](https://www.mkdocs.org/user-guide/writing-your-docs/) (확인: 2026-09-11)

### 3. 테마와 확장을 적용합니다

`theme`는 문서 사이트의 표시 방식을 정합니다. MkDocs에는 기본 테마가 있고, 설정으로 다른 설치된 테마를 선택하거나 테마 설정을 덧붙일 수 있습니다. 플러그인은 `plugins`, Markdown 문법 확장은 `markdown_extensions`에 설정합니다. — [Configuration](https://www.mkdocs.org/user-guide/configuration/) (확인: 2026-09-11)

```yaml
site_name: 데이터 파이프라인 노트
theme:
  name: material
plugins:
  - search
markdown_extensions:
  - admonition
```

위 예시의 `material` 테마와 `admonition` 확장은 별도로 설치되어 있어야 합니다. `site_name`처럼 MkDocs 자체가 요구하는 설정과, 외부 테마·플러그인이 요구하는 설정을 구분해야 합니다.

### 4. 정적 파일을 생성합니다

```bash
mkdocs build
```

`mkdocs build`는 기본적으로 `site/` 디렉터리에 사이트를 생성합니다. 그 안에는 문서에서 변환된 HTML과 테마의 CSS·JavaScript·이미지 등이 들어갑니다. 이후 `site/`의 내용을 정적 파일을 제공할 수 있는 호스팅 환경에 배포하면 됩니다. — [Getting Started](https://www.mkdocs.org/getting-started/) (확인: 2026-09-11), [Deploying Your Docs](https://www.mkdocs.org/user-guide/deploying-your-docs/) (확인: 2026-09-11)

`site/`는 소스 문서가 아니라 빌드 산출물이므로 일반적으로 Git에 커밋하지 않습니다. 공식 Getting Started 문서도 소스 관리 도구를 사용한다면 `site/`를 ignore할 것을 안내합니다. — [Getting Started](https://www.mkdocs.org/getting-started/) (확인: 2026-09-11)

## 작성 중에는 `serve`를 사용합니다

```bash
mkdocs serve
```

`mkdocs serve`는 내장 개발 서버를 실행하고 문서나 `mkdocs.yml`이 바뀌었을 때 사이트를 다시 빌드합니다. 공식 예시에서는 `http://127.0.0.1:8000/`에서 사이트를 확인합니다. — [Getting Started](https://www.mkdocs.org/getting-started/) (확인: 2026-09-11)

이 명령이 제공하는 것은 운영 서버가 아니라 **작성 중 결과를 확인하기 위한 개발 서버**입니다. 운영 배포에서는 `mkdocs build`로 생성한 정적 파일을 호스팅해야 합니다.

## MkDocs의 경계

MkDocs는 문서 사이트 생성과 문서 표시를 담당하지만 다음까지 자동으로 결정해 주지는 않습니다.

- 문서의 내용과 정보 구조
- CI에서 언제 빌드할지
- 빌드 결과를 어느 호스팅 서비스에 배포할지
- 인증·권한이 필요한 문서를 어떻게 보호할지

이 구분이 중요한 이유는 “MkDocs를 사용한다”는 말이 곧 “문서 사이트가 운영된다”는 뜻은 아니기 때문입니다. MkDocs는 `mkdocs.yml`과 Markdown을 정적 파일로 바꾸고, 그 이후의 빌드 자동화·배포·접근 제어는 별도로 구성해야 합니다.

## 실행 환경과 확인 결과

이 문서를 작성한 환경에서 확인한 Python 버전은 다음과 같습니다.

```text
Python 3.9.6
```

`mkdocs --version`을 실행할 수 있는 `mkdocs` 명령은 설치되어 있지 않았습니다. 따라서 위의 `mkdocs new`, `mkdocs serve`, `mkdocs build` 예시는 **미실행**입니다. 명령과 출력은 공식 문서의 예시를 이 환경에서 재현한 결과가 아닙니다.

## 확인하지 못한 것

- **이 환경에서의 MkDocs 빌드 출력** — `mkdocs` 명령이 설치되어 있지 않아 최소 프로젝트를 직접 생성·빌드하지 못했습니다.
- **특정 MkDocs 릴리스의 동작** — 공식 문서 페이지에 판번호가 표시되지 않아 이 문서는 확인일 기준 공식 문서의 설명으로 정리했습니다.

*작성일: 2026-09-11*
