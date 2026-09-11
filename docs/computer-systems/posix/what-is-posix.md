---
sidebar_position: 1
---

# POSIX란 무엇인가 — 운영체제의 공통 인터페이스를 정하는 표준

> **원문** — [The Open Group Base Specifications Issue 8, IEEE Std 1003.1-2024, Base Definitions 1.1 Scope](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html)
>
> **확인 날짜** — 2026-09-11. 이 문서는 POSIX.1-2024(Issue 8)를 기준으로 작성했습니다.
>
> **검증 상태** — Issue 8의 Base Definitions 1장·2장, `<unistd.h>`, Shell Command Language의 관련 절을 읽고 정리했습니다. `getconf`와 셸의 간단한 동작은 이 문서의 실행 환경에서 직접 확인했습니다. 규격 전문을 통독한 것은 아닙니다.

POSIX는 **운영체제가 응용 프로그램에 제공해야 하는 인터페이스와 실행 환경을 정한 표준**입니다. 운영체제 자체도 아니고, 특정 커널이나 라이브러리도 아닙니다.

POSIX가 필요한 이유는 운영체제 내부 구현을 같게 만들기 위해서가 아닙니다. 운영체제가 달라도 프로그램이 사용할 수 있는 **공통된 이름·호출 방법·동작 규칙**을 정해 소스 코드의 이식성을 높이기 위해서입니다.

예를 들어 POSIX는 `open()`이라는 함수가 어떤 인자를 받고 어떤 오류를 보고하는지, `sh`가 어떤 셸 언어를 제공하는지, `grep`이나 `sed`가 어떤 옵션과 입력 형식을 지원하는지를 정의합니다. 각 운영체제는 내부적으로 전혀 다른 방식으로 구현할 수 있지만, POSIX를 준수한다고 주장하는 구현은 표준이 요구하는 외부 동작을 제공해야 합니다.

## 실행 환경

아래 실행 기록은 macOS에서 확인했습니다.

```text
$ date +%Y-%m-%d
2026-09-11

$ printf '%-18s %s\n' POSIX_VERSION "$(getconf _POSIX_VERSION)"
POSIX_VERSION      200112

$ printf '%-18s %s\n' XOPEN_VERSION "$(getconf _XOPEN_VERSION 2>&1)"
XOPEN_VERSION      600

$ printf '%-18s %s\n' PATH "$(getconf PATH)"
PATH               /usr/bin:/bin:/usr/sbin:/sbin
```

따라서 이 환경이 보고하는 기준은 POSIX.1-2024가 아니라 `200112`, 즉 POSIX.1-2001입니다. 이것은 **이 시스템이 노출하는 POSIX 기준의 실측값**이지, macOS 전체가 POSIX.1-2024의 기능을 전혀 제공하지 않는다는 뜻은 아닙니다. 구현은 표준에 없는 확장을 제공할 수 있습니다.

## 1. POSIX가 정하는 것

POSIX.1-2024는 다음과 같이 자신의 범위를 설명합니다.

> POSIX.1-2024 defines a standard operating system interface and environment, including a command interpreter (or "shell"), and common utility programs to support applications portability at the source code level. It is intended to be used by both application developers and system implementors.
>
> **번역** — POSIX.1-2024는 표준 운영체제 인터페이스와 실행 환경을 정의합니다. 여기에는 명령 해석기, 즉 셸과 응용 프로그램의 소스 코드 수준 이식성을 지원하는 공통 유틸리티가 포함됩니다. 이 표준은 응용 프로그램 개발자와 시스템 구현자 모두가 사용하도록 만들어졌습니다.
>
> — [Base Definitions 1.1 Scope](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-11)

이 정의에서 중요한 단어는 `interface`와 `environment`입니다. POSIX는 커널의 자료구조나 스케줄러의 알고리즘을 정하지 않고, 프로그램이 관찰하고 사용할 수 있는 경계를 정합니다.

POSIX.1-2024는 네 가지 주요 구성으로 나뉩니다.

| 구성 | 다루는 것 |
| --- | --- |
| Base Definitions | 공통 용어·개념·유틸리티 규칙·C 헤더 정의 |
| System Interfaces | 시스템 서비스 함수와 C 언어 인터페이스, 오류·이식성 규칙 |
| Shell and Utilities | 셸 언어와 `awk`, `sed`, `grep` 같은 공통 유틸리티 |
| Rationale | 표준에 포함하거나 제외한 이유와 역사적 설명. 정보성 자료이며 규범 자체는 아님 |

— [Base Definitions 1.1 Scope](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-11)

따라서 POSIX를 “셸 스크립트 규칙”으로만 이해하면 범위를 지나치게 좁힌 것입니다. 셸은 POSIX의 한 부분이고, C 함수·헤더·파일·프로세스·신호·스레드·로케일·표준 유틸리티도 POSIX의 대상입니다.

가장 작은 예로 파일을 여는 프로그램을 보겠습니다.

```c
#include <fcntl.h>
#include <unistd.h>

int main(void) {
    int fd = open("input.txt", O_RDONLY);
    if (fd == -1) {
        return 1;
    }
    close(fd);
    return 0;
}
```

이 코드가 POSIX를 활용하는 지점은 `open()`과 `close()`의 이름, 헤더, 인자와 반환값, 오류 처리 방식입니다. macOS와 Linux의 커널 구현이 같다는 뜻이 아니라, 둘이 이 공통 인터페이스를 제공한다는 뜻입니다.

POSIX가 정하는 것은 외부 동작이지 내부 구현이 아닙니다.

> POSIX.1-2024 describes the external characteristics and facilities that are of importance to application developers, rather than the internal construction techniques employed to achieve these capabilities.
>
> **번역** — POSIX.1-2024는 기능을 구현하기 위해 사용한 내부 구성 방식이 아니라, 응용 프로그램 개발자에게 중요한 외부 특성과 기능을 설명합니다.
>
> — [Base Definitions 1.1 Scope](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-11)

그러므로 POSIX를 지킨다고 해서 다음이 같아지는 것은 아닙니다.

- 커널의 구현 방식
- 스케줄러와 메모리 관리 방식
- 파일 시스템의 내부 자료구조
- 컴파일러와 링크 방식
- 시스템의 모든 명령어와 옵션

POSIX가 약속하는 것은 표준이 다루는 인터페이스와 동작의 범위입니다.

## 2. POSIX가 보장하려는 것은 바이너리가 아니라 소스 코드 이식성입니다

POSIX.1-2024가 말하는 이식성은 `source code level`의 이식성입니다. 같은 소스 코드를 다른 POSIX 구현에서 다시 빌드할 수 있도록 공통 인터페이스를 제공한다는 뜻입니다.

따라서 macOS에서 빌드한 실행 파일을 Linux에서 그대로 실행할 수 있어야 한다는 보장은 POSIX에 없습니다. 실행 파일 형식, CPU 명령어, ABI, 동적 링커가 다를 수 있기 때문입니다. 반대로 같은 POSIX 인터페이스를 사용한 소스 코드는 필요한 조건을 갖추면 각 환경에서 다시 빌드할 수 있습니다.

다만 “소스 코드가 빌드된다”가 “모든 결과가 완전히 같다”는 뜻도 아닙니다. 규격이 선택 사항으로 남긴 기능, 구현에 맡긴 값, 로케일·파일 시스템·리소스 한계에 따라 결과가 달라질 수 있습니다.

## 3. 표준, 구현, 확장을 구분해야 합니다

POSIX 표준은 약속이고, 운영체제는 그 약속을 구현한 제품입니다.

| 구분 | 의미 | 예 |
| --- | --- | --- |
| 표준 | 여러 구현이 따라야 할 인터페이스와 동작 규칙 | `open()`의 인터페이스, `sh`의 문법 |
| 구현 | 특정 운영체제가 표준을 실제로 제공하는 방식 | Darwin, Linux, BSD 계열의 시스템 인터페이스 |
| 확장 | POSIX가 요구하지 않지만 구현이 추가한 기능 | Bash 배열, GNU `grep -P` |

구현은 POSIX에 없는 기능을 추가할 수 있습니다. POSIX.1-2024의 준수 조건도 비표준 확장을 허용하되, 확장이 POSIX 기능의 동작을 바꿀 수 있으므로 문서화해야 한다고 설명합니다.
— [Base Definitions 2.1.1 Requirements](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap02.html) (확인: 2026-09-11)

이 구분이 필요한 이유는 확장이 편리하면서도 이식성을 제한하기 때문입니다. 다음 스크립트는 Bash에서는 자연스럽지만 POSIX 셸 문법으로 볼 수 없습니다.

```bash
#!/usr/bin/env bash
items=(one two)
printf '%s\n' "${items[0]}"
```

반대로 POSIX 셸에 맞춘 코드는 Bash에서도 실행될 수 있지만, Bash에서 실행된다는 사실만으로 POSIX 코드가 되는 것은 아닙니다. 어떤 기능을 사용했는지와 그 기능이 어느 규격에 속하는지를 따로 확인해야 합니다.

## 4. POSIX 판과 옵션

“POSIX에 있다”는 말만으로는 충분하지 않습니다. 어느 판을 말하는지, 필수 기능인지 선택 기능인지가 함께 필요합니다.

POSIX.1-2024를 준수하는 구현은 필수 함수·헤더·유틸리티를 제공해야 하며, 해당 판의 `_POSIX_VERSION` 값을 `202405L`로 설정해야 합니다. XSI를 지원하는 구현은 POSIX 준수 조건에 더해 `_XOPEN_UNIX`와 `_XOPEN_VERSION` 같은 조건을 충족해야 합니다.
— [Base Definitions 2.1.3 POSIX Conformance](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap02.html) (확인: 2026-09-11)

표준은 선택 기능도 별도로 표시합니다. 구현이 옵션을 지원한다고 주장할 때에는 해당 옵션을 구성하는 기능을 모두 제공해야 합니다. 그러므로 POSIX 준수 구현이라고 해서 POSIX 문서에 나오는 모든 옵션을 반드시 제공하는 것은 아닙니다.

`getconf`는 구현이 제공하는 일부 기준과 옵션 정보를 조회하는 표준 유틸리티입니다.

```text
$ getconf _POSIX_VERSION
200112

$ getconf _XOPEN_VERSION
600

$ getconf PATH
/usr/bin:/bin:/usr/sbin:/sbin
```

이 출력에서 읽을 수 있는 것은 다음까지입니다.

- 이 환경이 `_POSIX_VERSION`에 `200112`를 보고한다는 것
- 이 환경이 `_XOPEN_VERSION`에 `600`을 보고한다는 것
- 이 환경의 표준 유틸리티 탐색 경로가 위와 같다는 것

이 출력만으로 시스템 전체의 모든 POSIX 기능이 정상인지, 모든 옵션을 지원하는지, UNIX 인증을 받았는지까지 결론 내릴 수는 없습니다. 각 기능의 요구사항과 구현 문서를 별도로 확인해야 합니다.

## 5. POSIX 문장을 읽는 법

POSIX 문서에서 단어 하나가 요구 수준을 바꿉니다.

> The word shall indicates mandatory requirements strictly to be followed in order to conform to the standard.
>
> **번역** — `shall`은 표준을 준수하기 위해 엄격히 따라야 하는 필수 요구사항을 나타냅니다.
>
> The word should indicates that among several possibilities one is recommended as particularly suitable, without mentioning or excluding others.
>
> **번역** — `should`는 여러 가능성 가운데 특히 적절하다고 권장되는 것을 나타내며, 다른 가능성을 배제하지는 않습니다.
>
> The word may is used to indicate a course of action permissible within the limits of the standard (may equals is permitted to).
>
> **번역** — `may`는 어떤 동작이 허용되지만 필수는 아님을 나타냅니다.
>
> — [Base Definitions 1.2 Word Usage](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-11)

`shall`은 준수하는 구현에서 기대할 수 있는 필수 동작입니다. `should`와 `may`는 구현 간 차이가 생길 수 있는 영역이므로, 이식 가능한 응용 프로그램은 그 존재에 의존하면 안 됩니다.

표준이 결과를 하나로 고정하지 않는 방식도 구분해야 합니다.

| 표현 | 입력·프로그램 | 의미 |
| --- | --- | --- |
| `unspecified` | 유효함 | 표준이 결과의 구체적인 값을 정하지 않음 |
| `undefined` | 유효하지 않음 | 표준이 결과를 정의하지 않음 |
| `implementation-defined` | 유효할 수 있음 | 구현자가 선택하고 그 선택을 문서화해야 함 |

예를 들어 `unspecified`는 “반드시 실패한다”는 뜻이 아닙니다. 여러 결과가 가능하지만 프로그램이 특정 결과를 기대해서는 안 된다는 뜻입니다. `implementation-defined`도 “모든 구현에서 같은 값”이라는 뜻은 아니며, 해당 구현의 문서를 확인해야 한다는 뜻입니다.

## 6. 셸은 POSIX의 한 사례입니다

POSIX의 셸 규격은 `sh`라는 명령 해석기와 그 언어를 정의합니다. 그러나 `/bin/sh`라는 경로, `bash`라는 구현, Bash의 배열과 같은 기능까지 POSIX가 모두 정하는 것은 아닙니다.

예를 들어 POSIX 표준 경로를 하드코딩하는 대신 표준 `PATH`를 확인할 수 있습니다.

```text
$ env PATH="$(getconf PATH)" command -v sh
/bin/sh
```

이 실행 결과에서 `/bin/sh`가 나온 것은 이 macOS 환경의 사실입니다. POSIX가 모든 시스템에서 `/bin/sh`를 보장한다는 뜻은 아닙니다. 표준은 `sh`를 표준 경로에서 찾을 수 있는 실행 환경과 그 유틸리티의 동작을 정의하지만, 특정 절대 경로를 요구하지 않습니다.

또한 다음처럼 Bash 확장을 사용하면 셸의 이름이 `sh`인지와 무관하게 이식성이 깨질 수 있습니다.

```bash
items=(one two)
```

실무에서 “POSIX 셸 스크립트”라고 부르는 것은 보통 POSIX Shell and Utilities가 정의한 문법과 유틸리티만 사용하는 스크립트를 뜻합니다. 하지만 그 표현을 쓸 때에도 사용한 유틸리티 옵션, 셸의 호출 방식, 대상 시스템이 지원하는 POSIX 판과 옵션을 함께 확인해야 합니다.

## 7. POSIX, UNIX, Linux는 같은 말이 아닙니다

POSIX는 표준의 이름이고, UNIX는 The Open Group의 상표·인증 체계와 연결된 제품 명칭이며, Linux는 커널과 그 위의 운영체제 생태계를 가리키는 이름입니다.

따라서 다음 추론은 성립하지 않습니다.

- POSIX는 운영체제다.
- Linux는 POSIX 그 자체다.
- UNIX 인증이 없으면 POSIX 기능을 제공할 수 없다.
- UNIX 인증을 받으면 모든 환경에서 같은 동작을 한다.

UNIX 인증과 POSIX 준수는 관련될 수 있지만 동일한 주장도, 서로의 완전한 대체물도 아닙니다. 이식성을 판단할 때는 상표보다 실제로 필요한 POSIX 인터페이스·판·옵션·확장을 확인해야 합니다.

## 8. POSIX를 기준으로 삼는다는 것

POSIX를 기준으로 삼는다는 것은 “어떤 운영체제에서든 모든 동작이 같아야 한다”고 요구하는 것이 아닙니다. **대상 환경들이 공통으로 제공해야 하는 최소 인터페이스를 선택하는 것**입니다.

다음과 같은 경우 POSIX 기준이 유용합니다.

- 여러 UNIX 계열 운영체제에서 다시 빌드해야 하는 C 프로그램
- 배포판과 셸이 고정되지 않은 설치·CI 스크립트
- 운영체제에 기본으로 제공되는 표준 유틸리티만 사용해야 하는 스크립트
- 특정 구현의 확장에 종속되지 않아야 하는 라이브러리

반대로 실행 환경을 하나로 고정했고 Bash나 GNU 도구가 명시적으로 보장된다면, 그 확장을 사용하는 것이 더 읽기 쉽고 실용적일 수 있습니다. 그 경우 문서와 실행 환경에 의존성을 명시해야 합니다.

POSIX의 핵심은 “가장 오래된 문법을 무조건 사용하라”가 아닙니다. **표준이 무엇을 약속하고, 구현이 무엇을 추가했으며, 내 프로그램이 어느 약속에 의존하는지를 분리해서 판단하라**는 것입니다.

## 확인하지 못한 것

- 이 문서에서는 POSIX.1-2024의 전체 함수·유틸리티 목록을 열거하지 않았습니다. 범위와 구조를 설명하는 데 필요한 공식 절만 확인했기 때문입니다.
- macOS의 `getconf`가 보고하는 값과 실제로 지원하는 개별 기능 전체를 대조하지 않았습니다. 위 출력은 실행 기록이지, macOS 전체의 POSIX 기능 목록이 아닙니다.
- UNIX 인증 등록부와 SUS의 세부 관계는 이 문서의 핵심 범위가 아니므로 다루지 않았습니다. POSIX와 UNIX 인증을 같은 개념으로 취급하지 않는 데 필요한 수준까지만 구분했습니다.

---

*작성일: 2026-09-11*
