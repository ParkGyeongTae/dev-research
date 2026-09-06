---
sidebar_position: 1
---

# POSIX란 무엇인가 — 규격이 정한 것과, 일부러 정하지 않은 것

POSIX는 **운영체제가 프로그램에게 보여 주는 인터페이스를 글로 적어 둔 문서**입니다.
소프트웨어가 아니고, 운영체제도 아니고, 리눅스의 표준도 아닙니다. 문서입니다 — 다만 판번호가 붙고, 인증 제도가 딸려 있고, **그것을 지켰는지 시스템이 스스로 보고하도록** 정해 둔 문서입니다.

이 문서가 답하는 것은 셋입니다.

1. POSIX가 무엇을 하는 물건인가 (§1~§3)
2. **규격을 어떻게 읽는가** — `shall`/`should`/`may`, 그리고 "정하지 않았다"의 세 종류 (§4)
3. "POSIX 준수"라는 말을 어디까지 믿을 수 있는가 (§5~§8)

가장 중요한 것은 두 번째입니다. POSIX를 오해하는 대부분의 경우는 규격에 무엇이 있는지 몰라서가 아니라, **규격이 "정하지 않겠다"고 명시한 것을 "정해져 있다"고 읽어서** 생깁니다.

## 실행 환경

이 문서의 모든 실행 기록은 아래 한 대에서 나왔습니다.

```
$ sw_vers
ProductName:		macOS
ProductVersion:		15.7.4
BuildVersion:		24G517

$ uname -a
Darwin gyeongtaee.local 24.6.0 Darwin Kernel Version 24.6.0: Mon Jan 19 22:01:58 PST 2026; root:xnu-11417.140.69.708.3~1/RELEASE_ARM64_T6041 arm64

$ /bin/bash --version | head -1
GNU bash, version 3.2.57(1)-release (arm64-apple-darwin24)

$ /bin/zsh --version
zsh 5.9 (arm64-apple-darwin24.0)
```

리눅스에서는 돌려보지 못했습니다. 리눅스에 대한 서술은 모두 문서 인용이고, 그렇다고 표시했습니다(§10).

---

## 1. 무엇이고, 무엇이 아닌가

규격이 스스로 밝히는 목적입니다.

> POSIX.1-2024 defines a standard operating system interface and environment, including a command interpreter (or "shell"), and common utility programs to support applications portability at the source code level. It is intended to be used by both application developers and system implementors.

— [The Open Group Base Specifications Issue 8, Base Definitions, 1. Introduction](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-06)

두 군데를 붙잡아 두면 나머지가 따라옵니다.

- **"interface and environment"** — 규격이 정하는 것은 **경계면**입니다. 커널이 어떻게 구현됐는지, 스케줄러가 어떻게 도는지는 규격의 관심이 아닙니다. "이 함수를 이 인자로 부르면 무엇이 일어나야 하는가"만 정합니다.
- **"at the source code level"** — 보장하려는 것은 **소스를 옮겨서 다시 빌드하면 돌아간다**입니다. 바이너리 호환이 아닙니다. 맥에서 빌드한 실행 파일이 리눅스에서 돌지 않는 것은 POSIX가 깨진 것이 아니라, 애초에 POSIX가 약속한 적이 없는 것입니다.

무엇이 아닌지도 같이 못 박아 둡니다.

| 흔한 오해 | 실제 |
| --- | --- |
| POSIX는 운영체제다 / 라이브러리다 | 문서입니다. 구현은 각 OS가 알아서 합니다 |
| POSIX는 리눅스 계열의 표준이다 | 인증받은 리눅스 배포판은 없습니다(§6) |
| POSIX를 지키면 어디서나 같은 결과가 나온다 | 하한선의 보장입니다. 같은 동작의 보장이 아닙니다(§4, §8) |
| POSIX = 셸 스크립트 작성 규칙 | 셸은 네 권 중 한 권입니다(§3) |
| POSIX는 시스템 콜 규격이다 | 절반만 맞습니다. `awk`·`sed`의 동작도 규격 안에 있습니다(§3) |

## 2. 이름이 넷, 물건은 하나

처음 읽을 때 가장 먼저 걸리는 것이 이름입니다. 아래 넷은 **같은 문서를 가리키는 다른 이름**입니다.

| 부르는 이름 | 누가 쓰는 이름인가 |
| --- | --- |
| POSIX.1-2024 | 규격 본문이 자기를 부르는 이름 |
| IEEE Std 1003.1-2024 | IEEE 쪽 표준 번호 |
| The Open Group Base Specifications Issue 8 | The Open Group 쪽 발행 이름 |
| SUS(Single UNIX Specification) | 인증 제도 쪽에서 부르는 이름 |

발행 페이지 제목이 그대로 이 사실을 보여 줍니다 — "The Open Group Base Specifications Issue 8 / IEEE Std 1003.1-2024 Edition".
— [The Open Group Base Specifications Issue 8](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-06)

그래서 **"Issue 8"과 "POSIX.1-2024"가 같은 말**이고, 뒤에 나올 "Issue 6"은 "POSIX.1-2001"과 같은 말입니다. 자료마다 다른 이름을 쓰기 때문에 판을 대조할 때 이 표가 필요합니다.

## 3. 무엇을 정의하는가 — 네 권

POSIX.1-2024는 네 권으로 나뉩니다.

| 권 | 다루는 것 |
| --- | --- |
| Base Definitions | 용어·개념·헤더, 그리고 **규격을 읽는 규칙**(§4가 여기서 나옵니다) |
| System Interfaces | C 함수 수준의 시스템 인터페이스 (`open`, `fork`, `sysconf` …) |
| Shell and Utilities | **셸 언어와 명령줄 유틸리티** (`sh`, `awk`, `sed`, `grep` …) |
| Rationale (Informative) | 왜 이렇게 정했는지 — **규범이 아님** |

— [The Open Group Base Specifications Issue 8](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-06)

두 가지를 여기서 챙깁니다.

- 셸 스크립트를 짜는 사람이 실제로 부딪히는 곳은 **세 번째 권**입니다. 셸 문법도, `awk`·`sed`의 동작도 이 권에 있습니다.
- 네 번째 권은 **정보성(informative)** 입니다. 읽으면 이해에는 크게 도움이 되지만, 거기 적힌 것을 근거로 "규격이 이렇게 정했다"고 말할 수 없습니다. 규범(normative)과 정보성의 구분은 규격 안에서도 계속 나옵니다 — 유틸리티 페이지의 APPLICATION USAGE·EXAMPLES 절도 정보성입니다(§7에서 `#!`가 여기 걸립니다).

## 4. 규격을 읽는 법

여기가 이 문서의 중심입니다. 규격은 "된다/안 된다"의 두 값이 아니라 **여러 단계의 강제력**으로 쓰여 있습니다. 이 단계를 모르면 같은 문장을 읽고도 정반대로 해석합니다.

### (a) `shall` · `should` · `may` — 세 단어가 강제력을 가릅니다

규격은 첫 권에서 이 세 단어의 뜻을 못 박고 시작합니다.

> **shall**: For an implementation that conforms to POSIX.1-2024, describes a feature or behavior that is mandatory
>
> **should**: For an implementation that conforms to POSIX.1-2024, describes a feature or behavior that is recommended but not mandatory
>
> **may**: Describes a feature or behavior that is optional for an implementation that conforms to POSIX.1-2024

— [The Open Group Base Specifications Issue 8, Base Definitions, 1.6 Terminology](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-06)

실무에서 쓰는 방법은 단순합니다. **규격 문장을 읽을 때 동사 앞의 단어부터 봅니다.**
`shall`이 붙어 있으면 그 시스템이 준수를 주장하는 한 기대해도 됩니다. `should`나 `may`가 붙어 있으면 **구현마다 다를 수 있다는 뜻**이고, 그 위에 코드를 올리면 안 됩니다.

### (b) "정하지 않았다"에 세 종류가 있습니다

가장 많이 오해하는 지점입니다. 규격에 없는 것은 한 종류가 아닙니다.

> **unspecified**: Describes the nature of a value or behavior not specified by POSIX.1-2024 which results from use of a **valid** program construct or valid data input
>
> **undefined**: Describes the nature of a value or behavior not defined by POSIX.1-2024 which results from use of an **invalid** program construct or invalid data input
>
> **implementation-defined**: Describes a value or behavior that is not defined by POSIX.1-2024 but is **selected by an implementor**

— [The Open Group Base Specifications Issue 8, Base Definitions, 1.6 Terminology](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-06)

셋의 차이를 실무 언어로 옮기면 이렇습니다.

| 규격의 표현 | 프로그램은 | 결과는 | 구현이 문서화할 의무 |
| --- | --- | --- | --- |
| unspecified | 정상입니다 | 무엇이 나올지 규격이 안 정합니다 | 없습니다 |
| undefined | 잘못됐습니다 | 무엇이 일어나도 규격 위반이 아닙니다 | 없습니다 |
| implementation-defined | 정상입니다 | 구현이 고르되, **골랐으면 문서에 적어야** 합니다 | 있습니다 |

`implementation-defined`가 셋 중 유일하게 **쓸 만한** 쪽입니다. 값은 시스템마다 달라도, 그 시스템의 문서를 보면 무엇으로 정했는지 알 수 있기 때문입니다.

**`local`이 `unspecified`의 교과서적인 사례입니다.** 셸 함수에서 지역 변수를 만들 때 흔히 쓰는 그 `local`입니다.

```
$ for sh in /bin/bash /bin/dash /bin/zsh; do printf '%-10s ' "$sh"; "$sh" -c 'f() { local v=1; echo "local ok: $v"; }; f'; done
/bin/bash  local ok: 1
/bin/dash  local ok: 1
/bin/zsh   local ok: 1
```

셋 다 됩니다. 그래서 "이건 이식성 있다"고 굳어집니다. 그런데 규격을 펴 보면 `local`은 **없는 것이 아니라, 결과를 정하지 않겠다고 명시된 이름**입니다.

> If the command name matches the name of a utility listed in the following table, the results are unspecified.

이 표에 `local`이 `declare`·`typeset`·`integer`·`source`·`shopt` 등과 함께 들어 있습니다. Issue 7·Issue 8 양쪽 다 같습니다.
— [The Open Group Base Specifications Issue 8, Shell Command Language, 2.9.1.4 Command Search and Execution](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-06)
— [The Open Group Base Specifications Issue 7 (POSIX.1-2017), Shell Command Language, 2.9.1 Command Search and Execution](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html) (확인: 2026-09-06)

유틸리티 색인에도 `local` 항목은 없습니다 — `ln`·`locale`·`localedef`·`logger`로 이어집니다.
— [The Open Group Base Specifications Issue 8, Utilities 색인](https://pubs.opengroup.org/onlinepubs/9799919799/idx/utilities.html) (확인: 2026-09-06)

**"세 구현에서 다 된다"와 "규격이 보장한다"는 다른 이야기입니다.** 규격은 이 이름을 알고 있으면서도 결과를 미정의로 남겼고, 세 구현의 동작이 겹치는 것은 구현끼리의 우연입니다. 이것이 §8의 실패 모드로 이어집니다.

### (c) 필수와 옵션 — 그리고 시스템에게 직접 물어보는 법

규격의 모든 기능이 필수인 것도 아닙니다. 준수는 **필수 부분 + 지원한다고 선언한 옵션**으로 이뤄집니다.

- **POSIX Conformance**: 필수 함수·헤더와 필수 유틸리티를 모두 갖춰야 하고, `_POSIX_VERSION`을 해당 판의 값으로 보고해야 합니다.
- **XSI 옵션**: POSIX 준수 위에 얹는 확장 묶음입니다. XSI를 주장하려면 `_XOPEN_UNIX`를 정의하고 `_XOPEN_VERSION`을 보고해야 합니다. 규격 본문에서 `[XSI]` 표시가 붙은 부분이 여기 해당합니다.
- **옵션의 지원 여부는 심볼릭 상수로 드러납니다.** 값이 양수면 항상 지원, `-1`이거나 정의돼 있지 않으면 미지원, `0`이면 런타임에 `sysconf()`·`getconf`로 물어봐야 하는 경우입니다.

— [The Open Group Base Specifications Issue 8, Base Definitions, 2. Conformance](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap02.html) (확인: 2026-09-06)

**이 규칙 덕분에 "이 시스템이 뭘 지원하는가"를 추측하지 않고 물어볼 수 있습니다.** `getconf`가 그 창구입니다.

```
$ for o in _POSIX_VERSION _POSIX_THREADS _POSIX_SPAWN _POSIX_ASYNCHRONOUS_IO _POSIX_PRIORITY_SCHEDULING; do printf '%-30s ' "$o"; getconf "$o" 2>&1; done
_POSIX_VERSION                 200112
_POSIX_THREADS                 200112
_POSIX_SPAWN                   200112
_POSIX_ASYNCHRONOUS_IO         undefined
_POSIX_PRIORITY_SCHEDULING     undefined
```

같은 시스템에서 어떤 옵션은 판번호를 돌려주고(지원), 어떤 옵션은 `undefined`를 돌려줍니다(미지원). **POSIX 준수 시스템이라고 해서 규격의 모든 기능을 갖춘 것이 아니라는 사실이 이 한 줄에 그대로 나옵니다.**

## 5. 어느 판을 따르는지는 시스템이 보고합니다

§4(c)의 첫 줄을 따로 떼어 봅니다. `_POSIX_VERSION`은 **그 시스템이 어느 판을 준수한다고 주장하는지**를 담고 있습니다.

```
$ getconf _POSIX_VERSION
200112

$ getconf _POSIX2_VERSION
200112

$ getconf _XOPEN_VERSION
600
```

이 숫자가 어느 판인지는 규격이 직접 못 박습니다.

| 판 | `_POSIX_VERSION` | `_XOPEN_VERSION` | 근거 |
| --- | --- | --- | --- |
| Issue 6 (IEEE Std 1003.1-2001) | `200112L` | `600` | [Issue 6 `<unistd.h>`](https://pubs.opengroup.org/onlinepubs/009695399/basedefs/unistd.h.html) (확인: 2026-09-06) |
| Issue 8 (POSIX.1-2024) | `202405L` | `800` | [Issue 8 `<unistd.h>`](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/unistd.h.html) (확인: 2026-09-06) |

> For implementations conforming to IEEE Std 1003.1-2001, the value shall be 200112L.

> For implementations conforming to POSIX.1-2024, the value shall be 202405L.

즉 이 시스템이 준수한다고 보고하는 것은 **2001년 판(Issue 6)** 이고, 2024년 판이 아닙니다.

여기서 일반화할 것은 맥에 대한 사실이 아니라 **"POSIX에 있다"가 곧 "이 시스템에 있다"는 뜻이 아니라는 것**입니다. 규격은 판이 올라가면서 내용이 늘어나는데, 시스템이 따르는 판은 그보다 뒤처져 있을 수 있습니다.

`$'...'`(달러-작은따옴표 인용)가 정확히 그런 예입니다. **Issue 7에는 없고 Issue 8에서 들어왔습니다.** Issue 7의 Quoting 절은 백슬래시·작은따옴표·큰따옴표 셋뿐이고, Issue 8에는 `2.2.4 Dollar-Single-Quotes`가 추가돼 있습니다.

> A sequence of characters starting with a `<dollar-sign>` immediately followed by a single-quote ($') shall preserve the literal value of all characters up to an unescaped terminating single-quote ('), with the exception of certain `<backslash>`-escape sequences, as follows:

— [The Open Group Base Specifications Issue 8, Shell Command Language, 2.2.4 Dollar-Single-Quotes](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-06)
— Issue 7의 2.2 Quoting에는 이 항목이 없습니다. [The Open Group Base Specifications Issue 7, Shell Command Language, 2.2 Quoting](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html) (확인: 2026-09-06)

그래서 `$'...'`를 "POSIX 문법"이라고 부르는 것은 맞지만, **Issue 6·7 기준으로 만들어진 구현에는 없습니다.** 그 결과가 §8에 있습니다.

## 6. 인증은 규격 준수의 척도가 아니라 상표입니다

여기가 가장 직관에 어긋나는 지점입니다.

The Open Group은 규격을 발행할 뿐 아니라 **UNIX라는 등록 상표의 인증 제도**를 운영합니다. 시험을 통과하고 등록해야 제품을 "UNIX"라고 부를 수 있습니다.

- 등록부에서 확인한 애플 항목: **macOS 15.0 Sequoia**와 **macOS 26.0 Tahoe**가 Apple silicon·Intel 양쪽 모두 **UNIX 03**을 포함한 다섯 개 표준에 등록돼 있습니다.
  — [The Open Group, Open Brand Register — Apple Inc.](https://www.opengroup.org/openbrand/register/apple.htm) (확인: 2026-09-06)
- 2026-09-06 시점의 등록부 전체 목록에는 **Apple(macOS)·IBM(z/OS, AIX)·HPE(HP-UX)·SCO(UnixWare, OpenServer)만** 있습니다. **리눅스 배포판은 없습니다.**
  — [The Open Group, The Register of UNIX Certified Products](https://www.opengroup.org/openbrand/register/) (확인: 2026-09-06)

그래서 정확한 문장은 이렇게 됩니다.

- **맥은 인증받은 UNIX입니다.**
- **리눅스는 인증받은 UNIX가 아닙니다.** POSIX가 정한 것을 대체로 따르지만, 시험으로 증명해 등록한 상태가 아닙니다.

리눅스에서 잘 돌던 스크립트가 맥에서 깨지는 일이 잦다는 사실과 겹쳐 놓으면 구도가 뒤집혀 보입니다. 이유는 간단합니다 — **인증은 "규격에 있는 것을 갖췄다"는 증명이지, "규격 밖의 GNU 확장을 갖췄다"는 증명이 아닙니다.** 리눅스 스크립트가 맥에서 깨지는 원인은 대개 규격이 아니라 GNU 확장 쪽에 있습니다.

## 7. 규격이 정하지 않고 남겨 둔 것

§4에서 본 "정하지 않았다"가 실제로 어디에 걸리는지 셋만 봅니다. 전부 **정해져 있을 것 같은데 아닌** 것들입니다.

### `/bin/sh`라는 경로는 규격에 없습니다

`sh` 유틸리티 페이지가 직접 경고합니다.

> Applications should note that the standard PATH to the shell cannot be assumed to be either /bin/sh or /usr/bin/sh, and should be determined by interrogation of the PATH returned by getconf PATH.

— [The Open Group Base Specifications Issue 8, `sh`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html) (확인: 2026-09-06)

규격이 정하는 것은 **`sh`라는 이름의 유틸리티가 표준 PATH 어딘가에 있다**는 것까지입니다.

```
$ getconf PATH
/usr/bin:/bin:/usr/sbin:/sbin

$ env PATH="$(getconf PATH)" command -v sh
/bin/sh
```

이 시스템에서는 결과적으로 `/bin/sh`가 맞았습니다. 하지만 그것은 **이 시스템의 사실**이지 규격의 보장이 아닙니다.

### `#!`(shebang)는 규범이 아닙니다

`#!`로 해석자를 지정하는 방식은 POSIX가 표준화한 메커니즘이 **아닙니다**. `sh` 페이지는 이 방식을 APPLICATION USAGE 절에서 설치 시 관례로 언급할 뿐인데, §3에서 봤듯 그 절은 **정보성**입니다.
— [The Open Group Base Specifications Issue 8, `sh`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html) (확인: 2026-09-06)

실무에서 `#!`가 안 통하는 시스템을 만날 일은 거의 없습니다. 다만 **"POSIX 스크립트"라는 말이 첫 줄까지 규격화돼 있다는 뜻은 아니라는 것**은 알고 있어야 합니다.

### 셸 시작 파일은 `ENV` 하나뿐입니다

규격이 셸 시작 파일에 대해 정하는 것은 이것뿐입니다.

> This variable, when and only when an interactive shell is invoked, shall be subjected to parameter expansion by the shell, and the resulting value shall be used as a pathname of a file containing shell commands to execute in the current environment.

— [The Open Group Base Specifications Issue 8, `sh`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html) (확인: 2026-09-06)

`~/.profile`·`~/.bashrc`·`~/.zshrc` 같은 이름은 **규격에 없습니다.** 전부 구현체가 각자 정한 관례입니다. 규격이 정한 `ENV` 쪽은 `shall`과 "when and only when"이 붙어 있으므로 그대로 관측됩니다.

```
$ SB=$(mktemp -d)
$ echo 'echo "  [read] ENVFILE"' > "$SB/envfile"

$ env -i HOME="$SB" TERM=dumb ENV="$SB/envfile" /bin/dash -i -c ':'
/bin/dash: 0: can't access tty; job control turned off
  [read] ENVFILE

$ env -i HOME="$SB" ENV="$SB/envfile" /bin/dash -c ':'
$
```

두 번째 명령은 아무것도 출력하지 않았습니다 — 비대화형이므로 `ENV`를 읽지 않은 것입니다.

## 8. 실패 모드 — "POSIX 준수"를 잘못 읽었을 때

§4·§5를 잘못 읽으면 무엇이 벌어지는지 정리합니다. **여기서 다루는 것은 셸 스크립트 문법의 실패가 아니라, 규격을 읽는 방식의 실패입니다.**

| 잘못된 읽기 | 실제로 벌어지는 일 | 어디서 드러나는가 |
| --- | --- | --- |
| "규격에 없다 = 어디서도 안 된다" | `local`처럼 **여러 구현에서 다 되는데 보장은 없는** 것을 이식성 있다고 판단합니다(§4(b)) | 다른 `sh` 구현으로 옮길 때 |
| "POSIX에 있다 = 이 시스템에 있다" | 시스템이 따르는 판이 더 낮으면 없습니다(§5) | 최신 문법을 오래된 구현에서 돌릴 때 |
| "POSIX 준수 = 같은 동작" | 준수는 **하한선**이고, 그 위는 구현마다 다릅니다(§4(a)) | 환경을 옮긴 뒤 값만 달라질 때 |
| "인증받았다 = 규격을 더 잘 지킨다" | 인증은 상표 사용 허가입니다(§6) | 맥 ↔ 리눅스 이식 판단 |
| "APPLICATION USAGE·Rationale에 있으니 규격이다" | 그 절들은 정보성입니다(§3) | `#!`처럼 관례를 규범으로 착각할 때 |

두 번째 줄이 실제로 어떻게 나타나는지만 봅니다. §5에서 확인한 `$'...'`를 네 셸에 넣은 결과입니다.

```
$ SB=$(mktemp -d)
$ cat > "$SB/q.sh" <<'EOF'
printf '%s\n' $'a\tb'
EOF

$ for sh in /bin/sh /bin/bash /bin/dash /bin/zsh; do printf '%-10s ' "$sh"; "$sh" "$SB/q.sh"; done
/bin/sh    a	b
/bin/bash  a	b
/bin/dash  $a\tb
/bin/zsh   a	b
```

**dash는 오류 없이 `$a\tb`라는 문자열을 그대로 뱉었습니다.** 종료 코드는 0이고, 파이프라인은 계속 돌고, 값만 틀립니다.

이것이 규격 읽기의 실패가 만드는 최악의 형태입니다. **요란하게 죽는 것보다, 오류 없이 값만 달라지는 쪽이 훨씬 오래 살아남습니다.**

## 9. 경계 — POSIX를 기준으로 삼지 말아야 할 때

POSIX 이식성은 공짜가 아닙니다. 아래 상황에서는 기준으로 삼는 것이 오히려 손해입니다.

- **실행 환경이 하나로 고정돼 있을 때.** 컨테이너 이미지를 못 박아 두고 그 안에서만 도는 스크립트라면, 규격 최소 집합에 맞추느라 `printf` 곡예를 하는 것보다 `#!/bin/bash`를 명시하고 bash 기능을 쓰는 편이 읽기 쉽고 안전합니다. **이식성은 "여러 환경에서 돌 때"만 값이 있습니다.**
- **배열·연관 배열·정규식 매칭이 필요한 로직일 때.** 규격의 셸 언어에는 이 셋이 없습니다. 문자열 조작으로 흉내 내기 시작했다면 셸의 경계를 넘은 신호입니다 — Python으로 옮기는 편이 낫습니다.
- **"POSIX 준수"를 품질 근거로 쓸 때.** §5에서 봤듯 준수 판번호는 시스템마다 다르고, §4·§7에서 봤듯 규격이 정하지 않고 남겨 둔 영역이 넓습니다.
- **GNU 유틸리티 옵션에 기대고 있을 때.** `sed -i`, `date -d`, `grep -P`, `readlink -f`는 모두 규격 밖입니다. 이건 셸이 아니라 유틸리티 쪽 문제라 셸을 dash로 맞춰도 해결되지 않습니다.

반대 방향의 경계도 분명히 해 둡니다 — **규격을 정독하는 것이 셸 스크립트 실력의 지름길은 아닙니다.** 규격은 구현자를 위한 문서입니다. 스크립트를 짜는 쪽에 필요한 것은 "규격에 뭐가 있나"보다 **"내가 쓰는 이 문법이 어느 층에 있나"**(§4(b))이고, 그건 규격 검색과 여러 구현에서의 실행을 함께 해 보는 것이 가장 빠릅니다.

## 10. 확인하지 못한 것

- **리눅스에서의 `getconf` 값.** 이 문서의 실행 기록은 전부 macOS 15.7.4에서 나왔습니다. 리눅스 배포판이 `_POSIX_VERSION`으로 무엇을 보고하는지는 **미실행**입니다. (이 머신에 docker CLI는 있으나 데몬이 떠 있지 않아 컨테이너로도 확인하지 못했습니다.)
- **`getconf`의 `undefined` 출력과 규격의 대응.** §4(c)에서 `_POSIX_ASYNCHRONOUS_IO`가 `undefined`를 돌려주는 것은 실측입니다. 이것이 규격이 말하는 "상수가 정의되지 않음(미지원)"과 정확히 같은 상태인지는 macOS `getconf` 구현으로 대조하지 않았습니다. **확인 필요.**
- **UNIX 03 상표와 Issue 6의 정확한 대응.** 이 시스템이 `200112`/`600`을 보고한다는 것(실측)과 macOS가 UNIX 03에 등록돼 있다는 것(등록부 확인)은 각각 확인했습니다. 다만 "UNIX 03 = Issue 6"이라고 못 박은 The Open Group 문장은 찾지 못했습니다. **확인 필요.**
- **역사적으로 인증받았던 리눅스 제품.** 2026-09-06 시점 등록부에 리눅스가 없다는 것만 확인했습니다. 과거에 등록됐다가 빠진 것이 있는지는 확인하지 못했습니다.
- **POSIX의 성립 역사.** 왜·언제 만들어졌는지는 The Open Group 발행본의 Rationale 권에서 근거 문장을 찾지 못해 쓰지 않았습니다.

---

*작성일: 2026-09-06*
