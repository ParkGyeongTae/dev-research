---
sidebar_position: 1
---

# Sphinx란 무엇인가

> **원문** — [Sphinx 공식 문서](https://www.sphinx-doc.org/en/master/)
>
> **확인 날짜** — 2026-09-11 (공식 문서에 확인한 페이지의 판번호가 표시되지 않음)
>
> **검증 상태** — Sphinx 공식 문서·reStructuredText·자동 API 문서화 원문을 읽고, 이 환경의 Python·Sphinx 설치 여부를 직접 확인했습니다. Sphinx 예시는 이 환경에서 실행하지 못했습니다.

## 한 문장으로 말하면

> Author in reStructuredText or MyST Markdown to create highly structured technical documents.
>
> **번역** — reStructuredText 또는 MyST Markdown으로 구조가 풍부한 기술 문서를 작성할 수 있습니다.
>
> — [Sphinx 공식 문서](https://www.sphinx-doc.org/en/master/) (확인: 2026-09-11)

Sphinx는 기술 문서를 작성하고 HTML·LaTeX·PDF·ePub 등 여러 형식으로 빌드하는 문서 생성기입니다. 일반적인 정적 사이트 생성기처럼 웹사이트를 만들 수 있지만, Sphinx의 중심은 웹사이트 외형보다 **문서 구조·교차 참조·API 문서화·다양한 출력 형식**입니다. — [Sphinx 공식 문서](https://www.sphinx-doc.org/en/master/) (확인: 2026-09-11)

## Markdown 사이트 생성기와 다른 지점

VitePress·MkDocs가 Markdown 기반 문서 사이트를 빠르게 만드는 데 초점을 둔다면, Sphinx는 문서를 하나의 구조화된 기술 문서 집합으로 취급합니다. 섹션·코드 객체·각주·인용·용어집·다른 프로젝트의 문서까지 참조할 수 있고, HTML이 아닌 LaTeX·ePub 같은 출력도 생성합니다. — [Sphinx 공식 문서](https://www.sphinx-doc.org/en/master/) (확인: 2026-09-11)

이 차이 때문에 Sphinx를 “Python용 Markdown 사이트 생성기”라고만 부르면 부정확합니다. Python 프로젝트에서 많이 사용되지만, 문서의 입력 언어·도메인·출력 형식·확장 기능을 조합하는 문서 빌드 시스템에 가깝습니다.

## 가장 작은 구성

Sphinx 프로젝트는 보통 문서 원본과 `conf.py`, 목차 파일을 둡니다.

```text
docs/
└── source/
    ├── conf.py
    ├── index.rst
    └── usage.rst
```

```rst
.. toctree::
   :maxdepth: 2

   usage
```

`index.rst`의 `toctree`는 문서 페이지를 하나의 문서 구조로 연결합니다. 페이지 파일을 만들었더라도 toctree에 연결하지 않으면 독자가 전체 문서 흐름에서 발견하지 못할 수 있습니다.

Sphinx는 reStructuredText를 기본 문서 언어로 사용하고 MyST Markdown도 지원합니다. reStructuredText는 단순한 서식 문법을 넘어 directive·role·cross-reference를 표현하는 문법을 제공합니다. — [reStructuredText | Sphinx](https://www.sphinx-doc.org/en/master/usage/restructuredtext/index.html) (확인: 2026-09-11)

## `autodoc`으로 코드에서 API 문서를 만듭니다

Sphinx의 강점은 소스 코드의 docstring을 문서에 재사용할 수 있다는 점입니다.

```python
# example.py
def add(left: int, right: int) -> int:
    """두 정수를 더합니다."""
    return left + right
```

```rst
.. autofunction:: example.add
```

`autodoc`은 문서화할 Python 모듈을 import하고 docstring을 읽습니다. 따라서 문서 빌드 환경에 해당 패키지와 의존성이 설치되어 있어야 하며, import 시 부작용이 있는 코드는 빌드 중 실행될 수 있습니다. 이 점은 문서 빌드가 단순한 텍스트 변환이 아니라 코드 실행 환경과 연결될 수 있음을 보여 줍니다. — [sphinx.ext.autodoc](https://www.sphinx-doc.org/en/master/usage/extensions/autodoc.html) (확인: 2026-09-11)

`autodoc`을 쓰면 함수 시그니처와 설명을 코드 가까이에 둘 수 있어 중복을 줄일 수 있지만, 문서 빌드가 코드를 import할 수 있어야 한다는 운영 조건이 추가됩니다.

## 빌드

```bash
sphinx-build -M html docs/source docs/build
```

`sphinx-build`는 소스 디렉터리의 문서를 읽어 출력 디렉터리에 결과를 생성합니다. HTML 외에도 LaTeX·ePub 등 builder를 선택할 수 있습니다. — [sphinx-build](https://www.sphinx-doc.org/en/master/man/sphinx-build.html) (확인: 2026-09-11)

## Sphinx의 경계

Sphinx는 문서 구조와 출력 생성에 강하지만 다음은 별도로 결정해야 합니다.

- 문서 원본을 어떤 언어로 작성할지
- Python 모듈 import에 필요한 의존성을 어떻게 제공할지
- 어떤 builder와 테마를 사용할지
- 빌드 결과를 어디에 배포하고 접근 권한을 어떻게 관리할지

특히 `autodoc`은 “코드와 문서가 항상 자동으로 정확히 동기화된다”는 보장이 아닙니다. import 가능한 환경, 올바른 docstring, 적절한 directive가 함께 필요합니다.

## 실행 환경과 확인 결과

```text
Python       3.9.6
Sphinx       설치되지 않음
sphinx-build 설치되지 않음
```

Sphinx가 설치되어 있지 않아 `sphinx-build` 예시는 **미실행**입니다.

## 확인하지 못한 것

- **이 환경에서의 Sphinx 빌드 출력** — `sphinx-build`가 설치되어 있지 않아 최소 프로젝트를 직접 빌드하지 못했습니다.
- **특정 Sphinx 릴리스의 기본 설정** — 공식 문서의 확인 페이지에 판번호가 표시되지 않아 릴리스별 차이는 대조하지 않았습니다.

*작성일: 2026-09-11*
