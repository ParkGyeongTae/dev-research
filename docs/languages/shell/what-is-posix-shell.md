---
sidebar_position: 2
---

# sh란 무엇인가 — 이식성의 기준선

> **원문** — [The Open Group Base Specifications Issue 8, IEEE Std 1003.1-2024, Chapter 2: Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)
>
> **확인 날짜** — 2026-09-07. 규격은 판번호가 있습니다(Issue 8 = POSIX.1-2024). 함께 인용한 Debian 위키·`sh(1)` man page는 판번호가 없어 확인 날짜로 대신합니다.
>
> **검증 상태** — 규격의 해당 장을 읽고 정리했습니다. 셸 동작은 **macOS 한 대와 Docker 컨테이너 세 개(Debian·Ubuntu·Alpine)에서 직접 돌린 결과**이며, 실행 기록이 붙은 절은 전부 이번에 재현했습니다.

`#!/bin/sh`라고 쓰면 무엇이 실행될까요. **정해져 있지 않습니다.**
`sh`는 프로그램 이름이 아니라 **규격 이름**이고, 그 규격을 만족하는 서로 다른 프로그램이 시스템마다 다르게 걸려 있습니다.
이 한 가지를 잡으면 "로컬에서 잘 돌던 스크립트가 컨테이너에서 깨지는" 사고의 상당수가 설명됩니다.

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | macOS | Debian | Ubuntu | Alpine |
| --- | --- | --- | --- | --- |
| 판 | 15.7.4 (Darwin 24.6.0), arm64 | 13.6 (trixie) | 24.04.4 LTS | 3.24.1 |
| 이미지 | — | `debian:trixie-slim@sha256:d7e12182…` | `ubuntu:24.04@sha256:33ceb719…` | `alpine:3@sha256:28bd5fe8…` |
| `/bin/sh`의 실체 | bash 3.2.57 (sh 모드) | dash 0.5.12-12 | dash | BusyBox v1.37.0 ash |
| 그 밖에 설치된 셸 | `/bin/bash` 3.2.57, `/bin/dash`(dash-16), `/bin/zsh` 5.9 | bash 5.2.37 | — | — |
| 실행 날짜 | 2026-09-07 | 2026-09-07 | 2026-09-07 | 2026-09-07 |

컨테이너는 Docker 29.3.1(Docker Desktop, aarch64)에서 띄웠습니다. 리눅스 쪽 결과는 **이 커널 하나** 위에서 얻은 것입니다.

---

## 1. sh는 프로그램이 아니라 규격입니다

`sh`의 정의는 POSIX에 있습니다.

> The shell is a command language interpreter. This chapter describes the syntax of that command language as it is used by the `sh` utility and the `system()` and `popen()` functions defined in the System Interfaces volume of POSIX.1-2024.
>
> **번역** — 셸은 명령 언어 해석기입니다. 이 장은 `sh` 유틸리티, 그리고 System Interfaces 권에 정의된 `system()`·`popen()` 함수가 사용하는 그 명령 언어의 문법을 기술합니다.
>
> — [The Open Group Base Specifications Issue 8, IEEE Std 1003.1-2024, Chapter 2: Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-07)

인용문이 정의하는 것은 **명령 언어의 문법**이지 특정 프로그램이 아닙니다. 즉 **`sh`는 "이 규격대로 동작하는 명령 해석기"라는 자리 이름**이고, 그 자리를 채우는 실제 프로그램은 시스템이 고릅니다.

bash도, dash도, BusyBox ash도, ksh도, zsh도 `sh`로 불릴 수 있습니다. **그리고 각자 규격 위에 얹은 확장이 다릅니다.** 이 두 문장 사이의 간격이 이 문서 나머지 전부입니다 — 규격이 보장하는 것은 겹치는 부분뿐인데, 개발하는 사람은 자기 시스템에 걸린 구현체 하나만 봅니다.

---

## 2. `#!/bin/sh`가 실제로 무엇을 실행하는가

### macOS — 링크 하나로 정해집니다

macOS의 `man sh`는 이렇게 적고 있습니다.

```console
$ man 1 sh
DESCRIPTION
     sh is a POSIX-compliant command interpreter (shell).  It is implemented by re-execing as either
     bash(1), dash(1), or zsh(1) as determined by the symbolic link located at
     /private/var/select/sh.  If /private/var/select/sh does not exist or does not point to a valid
     shell, sh will use one of the supported shells.
```

`sh`가 셋 중 하나로 **re-exec** 한다고 명시합니다. 이 머신의 현재 상태입니다.

```console
$ ls -l /private/var/select/sh
lrwxr-xr-x  1 root  wheel  9  2  1  2026 /private/var/select/sh -> /bin/bash

$ /bin/sh -c 'echo "BASH_VERSION=$BASH_VERSION"'
BASH_VERSION=3.2.57(1)-release
```

**맥의 `/bin/sh`는 bash입니다.** 이 사실 하나가 §4의 결론을 통째로 만듭니다.

### Debian·Ubuntu — dash입니다

Debian 위키가 그렇게 정해 두었다고 밝힙니다.

> Beginning with DebianSqueeze, Debian uses Dash (the Debian Almquist shell) as the target of the /bin/sh symlink.
>
> **번역** — Debian Squeeze부터, Debian은 `/bin/sh` 심볼릭 링크의 대상으로 Dash(Debian Almquist shell)를 씁니다.
>
> — [Debian Wiki — Shell](https://wiki.debian.org/Shell) (확인: 2026-09-07)

컨테이너에서 직접 확인했습니다.

```console
$ docker run --rm debian:trixie-slim sh -c 'cat /etc/debian_version; ls -l /bin/sh'
13.6
lrwxrwxrwx 1 root root 4 Feb  4  2025 /bin/sh -> dash

$ docker run --rm ubuntu:24.04 sh -c 'grep VERSION= /etc/os-release; ls -l /bin/sh'
VERSION="24.04.4 LTS (Noble Numbat)"
lrwxrwxrwx 1 root root 4 Mar 31  2024 /bin/sh -> dash
```

### Alpine — dash가 아니라 BusyBox ash입니다

여기가 가장 자주 뭉개지는 자리입니다. "슬림 리눅스 = dash"가 아닙니다.

```console
$ docker run --rm alpine:3 sh -c 'cat /etc/alpine-release; ls -l /bin/sh; busybox | head -1'
3.24.1
lrwxrwxrwx    1 root     root            12 Jun 13 16:39 /bin/sh -> /bin/busybox

BusyBox v1.37.0 (2026-01-10 15:38:28 UTC) multi-call binary.
```

`/bin/sh`가 **BusyBox 바이너리 자체**를 가리킵니다. dash와 같은 ash 계보이지만 **같은 구현이 아니고, 동작도 다릅니다** — §4에서 그 차이가 결론을 뒤집습니다.

### 정리

| 시스템 | `/bin/sh`의 실체 | 확인 |
| --- | --- | --- |
| macOS (이 머신) | bash 3.2.57 — `/private/var/select/sh` 링크로 결정 | **직접 확인** |
| Debian 13.6 (trixie) | dash 0.5.12-12 | **직접 확인** |
| Ubuntu 24.04 | dash | **직접 확인** |
| Alpine 3.24.1 | BusyBox v1.37.0 ash | **직접 확인** |

여기서 나오는 실무적 결론이 하나 있습니다. **로컬 맥에서 `sh script.sh`로 테스트하면 bash가 검사해 주므로 이식성 검사가 되지 않습니다.** 이 맥에는 `/bin/dash`가 설치돼 있으므로, 진짜로 확인하려면 `dash script.sh`를 돌려야 합니다.

---

## 3. "sh 모드"는 이름표가 아니라 동작입니다

앞 절이 "무엇이 실행되는가"였다면, 여기는 "실행된 것이 어떻게 동작하는가"입니다. **같은 bash 바이너리라도 `sh`라는 이름으로 불리면 다르게 동작합니다.**

```console
$ cat who.sh
echo "\$0=$0  BASH_VERSION=$BASH_VERSION  posix옵션=$(set -o | grep -w posix)"

$ /bin/sh who.sh
$0=who.sh  BASH_VERSION=3.2.57(1)-release  posix옵션=posix          	on

$ /bin/bash who.sh
$0=who.sh  BASH_VERSION=3.2.57(1)-release  posix옵션=posix          	off
```

**같은 3.2.57인데 `posix` 옵션이 하나는 on, 하나는 off입니다.**

이게 관찰 가능한 값의 차이로 나타나는 예가 `echo`입니다. **`sh`라는 이름의 구현 넷을 모두 세워 놓고** 같은 것을 돌렸습니다.

```console
$ /bin/sh -c 'echo "a\tb"' | od -c | head -1                              # macOS: bash 3.2 sh 모드
0000000    a  \t   b  \n
$ /bin/bash -c 'echo "a\tb"' | od -c | head -1                            # macOS: 같은 바이너리, bash 이름
0000000    a   \   t   b  \n
$ /bin/dash -c 'echo "a\tb"' | od -c | head -1                            # macOS: dash
0000000    a  \t   b  \n
$ docker run --rm debian:trixie-slim sh -c 'echo "a\tb"' | od -c | head -1 # Debian: dash
0000000    a  \t   b  \n
$ docker run --rm alpine:3 sh -c 'echo "a\tb"' | od -c | head -1           # Alpine: BusyBox ash
0000000    a   \   t   b  \n
```

두 가지가 한꺼번에 드러납니다.

- **같은 실행 파일이 이름에 따라 갈립니다** — `/bin/sh`는 탭, `/bin/bash`는 백슬래시와 `t` 두 글자.
- **`sh`라고 불리는 구현끼리도 갈립니다** — Debian의 `sh`는 탭을 내는데 **Alpine의 `sh`는 리터럴 두 글자를 냅니다.** 둘 다 리눅스이고 둘 다 `#!/bin/sh`입니다.

이 차이가 데이터에 그대로 실린다는 점이 중요합니다. `echo`로 TSV를 만들면 어느 이미지에서 돌았느냐에 따라 **탭 구분 파일**이 나오기도 하고 **`\t` 두 글자가 든 파일**이 나오기도 합니다. 오류가 아니라 값이 달라지는 형태라, 그 출력을 파싱하는 다음 단계가 조용히 어긋나고 한참 뒤에 발견됩니다.

`printf`는 다섯 다 같습니다.

```console
$ /bin/sh   -c 'printf "a\tb\n"' | od -c | head -1
0000000    a  \t   b  \n
$ /bin/dash -c 'printf "a\tb\n"' | od -c | head -1
0000000    a  \t   b  \n
$ docker run --rm debian:trixie-slim sh -c 'printf "a\tb\n"' | od -c | head -1
0000000    a  \t   b  \n
$ docker run --rm alpine:3 sh -c 'printf "a\tb\n"' | od -c | head -1
0000000    a  \t   b  \n
```

그래서 **이식성이 필요한 스크립트에서는 `echo` 대신 `printf`를 씁니다**(의견). `echo`의 백슬래시·`-n` 처리는 POSIX에서도 구현에 맡겨진 부분이기 때문입니다.

---

## 4. 무엇이 "bashism"인가 — 그리고 무엇이 그것을 잡아 주는가

§1에서 규격이 보장하는 것은 겹치는 부분뿐이라고 했습니다. 그 바깥이 bashism입니다.

```console
$ for s in /bin/sh /bin/bash /bin/dash /bin/zsh; do
    printf '%-6s -> ' "$(basename $s)"; $s -c '[[ "abc" == a* ]] && echo "지원"' 2>&1 | head -1
  done
sh     -> 지원
bash   -> 지원
dash   -> /bin/dash: 1: [[: not found
zsh    -> 지원
```

**`[[ ]]`는 POSIX에 없습니다.** 이 맥의 `/bin/sh`는 bash라서 통과하지만, `/bin/sh`가 dash인 시스템에서는 죽습니다.

오류 메시지의 모양을 봐 두는 게 좋습니다. **`[[: not found`는 문법 오류처럼 보이지 않습니다** — 셸이 `[[`를 명령 이름으로 해석해 "그런 명령이 없다"고 말한 것입니다. 배열은 `Syntax error: "(" unexpected`로, `declare`는 `declare: not found`로 나옵니다. 셋 다 "이 문법이 틀렸다"가 아니라 "이 셸이 그걸 모른다"는 뜻입니다.

### 그런데 Alpine에서는 통과합니다

같은 `[[ ]]`를 두 리눅스 이미지의 `/bin/sh`에 넣으면 결과가 갈립니다.

```console
$ docker run --rm debian:trixie-slim sh -c '[[ a == a ]] && echo ok'
sh: 1: [[: not found
$ docker run --rm alpine:3 sh -c '[[ a == a ]] && echo ok'
ok
```

**BusyBox ash는 dash가 거절하는 것을 상당수 받아 줍니다.** 같은 표현식들을 두 이미지의 `/bin/sh`에 넣고 첫 줄만 잘라 비교했습니다.

| 표현식 | Debian `/bin/sh` (dash) | Alpine `/bin/sh` (BusyBox ash) |
| --- | --- | --- |
| `[[ a == a ]]` | `[[: not found` | **`ok`** |
| `${v:0:2}` | `Bad substitution` | **`ab`** |
| `${v/a/X}` | `Bad substitution` | **`Xbcd`** |
| `$'a\tb'` | `$a\tb` (리터럴) | **탭** |
| `$((2**3))` | `arithmetic expression: expec…` | **`8`** |
| `$RANDOM` | 빈 값 | **`7383`** |
| `source ./f` | `source: not found` | **`sourced`** |
| `cat <(echo ok)` | `Syntax error: "(" unexpected` | **`ok`** |
| `function f { }` | `Syntax error: "}" unexpected` | **`ok`** |
| `trap … ERR` | `trap: ERR: bad trap` | **`trapped`** |
| `echo "a\tb"` | 탭 | **리터럴 `\t`** |
| `arr=(a b)` | `Syntax error: "(" unexpected` | `syntax error: unexpected "("` |
| `echo {1..3}` | `{1..3}` | `{1..3}` |
| `cat <<< ok` | `Syntax error: redirection un…` | `syntax error: unexpected redire…` |
| `${PIPESTATUS[0]}` | `Bad substitution` | `syntax error: bad substitution` |
| `local x=1` (함수 안) | `local ok=1` | `local ok=1` |
| `set -o pipefail` | `ok` | `ok` |

여기서 **이 문서에서 가장 실무적인 결론**이 나옵니다.

- **Alpine에서 돌았다고 POSIX인 것이 아닙니다.** 위 표의 굵은 항목은 전부 규격 밖인데 Alpine은 통과시킵니다. Alpine으로만 검증하면 bashism이 그대로 남습니다.
- **가장 엄격한 검사기는 dash입니다.** dash가 통과시키면 Alpine도 대체로 통과합니다. 반대 방향은 성립하지 않습니다.
- **그러므로 "슬림 이미지에서 테스트했다"는 안전 근거가 되지 못합니다.** 어느 슬림 이미지인지가 답을 바꿉니다.
- **그리고 마지막 두 줄이 방향을 뒤집습니다.** `echo "a\tb"`는 Alpine 쪽이 리터럴을 내므로, **Debian에서 만든 TSV가 Alpine에서 깨집니다.** 관대한 셸이 항상 안전한 쪽인 것도 아닙니다.

이 맥에서 두 방향을 다 걸러 내려면 `dash script.sh`로 한 번, 컨테이너로 한 번 돌리는 수밖에 없습니다.

### POSIX `sh`에 없는 것과 대안

| 문법 | POSIX 대안 |
| --- | --- |
| `[[ ... ]]` | `[ ... ]` (test) |
| 배열 `arr=(...)`, `${arr[@]}` | 위치 인자 `set -- ...`, `"$@"` |
| `declare` / `local` | 규격이 **결과 미정의**로 남긴 이름 — 널리 지원되지만 보장은 없음 |
| `${var^^}`, `${var,,}` | `tr` 등 외부 명령 |
| `source file` | `. file` |
| `function name() {}` | `name() {}` |
| `$'...'` (ANSI-C 인용) | `printf` |

`declare`·`local`·`typeset`은 "규격에 아예 없는 것"과는 다릅니다. 규격이 이 이름들을 표로 나열해 두고 **"the results are unspecified"**라고 못 박은 것이므로, 여러 구현에서 똑같이 동작하더라도 그건 구현끼리의 우연입니다. 위 표에서 `local`이 dash·ash 양쪽에서 도는 것이 그 예입니다.
— [The Open Group Base Specifications Issue 8, Shell Command Language, 2.9.1.4 Command Search and Execution](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-07)

### 규격 안에 있어도 셸마다 다른 것 하나

bashism만 조심하면 되는 게 아닙니다. **따옴표 없는 변수 확장**은 POSIX 문법이지만 셸마다 결과가 갈립니다.

`for f in $files`처럼 따옴표 없이 쓰면 bash·dash·`/bin/sh`는 공백 기준으로 쪼개고(단어 분리), **zsh는 기본적으로 쪼개지 않습니다.** 그래서 목록 순회가 zsh에서는 한 번만 돕니다. 반대로 파일명에 공백이 있으면 bash 계열에서 한 파일이 두 인자가 됩니다.

즉 규격 문법을 썼다고 안전한 게 아니라, **규격이 "어떻게 하라"고 정해 둔 부분만** 안전합니다.

---

## 5. 실무에서 어디에 걸리는가

데이터 엔지니어가 `sh`를 마주치는 자리는 대개 **본인이 고른 게 아닙니다.**

- **Dockerfile의 `RUN`** — `SHELL` 지시어를 주지 않으면 `/bin/sh -c`로 실행됩니다. 베이스 이미지가 Debian 계열이면 dash, Alpine이면 BusyBox ash입니다 — §4에서 봤듯 **둘의 동작이 다릅니다.**
- **CI 스텝** — 러너가 어떤 셸로 스텝을 실행하는지는 플랫폼·설정에 따라 다릅니다.
- **`ENTRYPOINT`·`CMD`의 shell form**, cron, `system()` 호출, 각종 도구의 `--exec` 옵션.
- **컨테이너에 bash가 아예 없는 경우** — 슬림 이미지에는 흔합니다. Alpine 3.24.1의 기본 이미지에는 bash가 없습니다.

그래서 셔뱅과 실제 사용 문법이 어긋난 채로 커밋되기 쉽습니다. macOS에서 개발하면 §2 때문에 끝까지 안 걸리기 때문입니다. `#!/bin/bash`를 쓸 거면 명시하고, 진짜 이식성이 필요하면 `dash script.sh`로 한 번 돌립니다.

### 어디까지 POSIX sh로 버틸 것인가

이식성에는 값이 붙습니다. §4의 표를 뒤집어 보면 POSIX `sh`만으로 짤 때 포기하는 것이 보입니다.

**배열도 연관 배열도 없어서** 자료구조가 필요한 로직은 위치 인자와 문자열 조작으로 흉내 내야 하고, 그 순간 읽기 어려워집니다. **대소문자 변환·정규식 매칭 같은 문자열 처리**는 외부 명령으로 빠지므로 프로세스 생성 비용이 붙습니다. **산술은 정수뿐이고**, `**` 거듭제곱조차 dash에는 없습니다(§4 표).

그래서 스크립트가 수백 줄을 넘어가면 이식성보다 유지보수가 먼저 문제가 됩니다. 그 지점에서는 셔뱅을 `#!/bin/bash`로 바꾸거나 Python으로 옮기는 게 낫습니다(의견). 다만 `#!/bin/bash`로 바꾸면 **대상 이미지에 bash가 깔려 있어야 한다**는 조건이 새로 붙습니다.

---

## 확인하지 못한 것

- **`/bin/sh`가 zsh인 시스템.** macOS의 `man sh`는 `/private/var/select/sh`가 zsh를 가리킬 수 있다고 적고 있지만, 이 머신의 링크는 bash를 가리키고 있고 링크를 바꿔서 시험하지 않았습니다(시스템 전역 설정이라 되돌리기가 위험합니다). **미실행.**
- **리눅스 결과는 커널 하나에서만 얻었습니다.** Docker Desktop이 띄운 aarch64 linuxkit 커널입니다. x86_64, 실제 배포판 커널, 다른 컨테이너 런타임에서는 재현하지 않았습니다.
- **§4 표의 전수 검증은 아닙니다.** 자주 쓰이는 17개 표현식만 넣어 본 것이고, 각 셸이 규격 전체를 어디까지 만족하는지는 확인하지 않았습니다. 그런 검사는 규격 준수 시험 도구(VSC 등)의 영역이고 이 문서에서 다루지 않았습니다.
- **BusyBox ash가 왜 그렇게 관대한지**는 확인하지 못했습니다. BusyBox의 빌드 설정(`CONFIG_ASH_BASH_COMPAT` 계열)으로 켜고 끌 수 있는 것으로 보이나, Alpine 이미지가 어떤 설정으로 빌드됐는지 원문을 찾지 못했습니다. **추측:** bash 호환 옵션이 켜진 빌드입니다. 확인 필요.
- **`echo`의 구현별 차이가 규격의 어느 조항에서 허용되는지** 정확한 문장을 대조하지 않았습니다. `echo` 유틸리티 페이지가 XSI 여부에 따라 갈린다는 것까지만 알고 있고, 인용할 문장을 확정하지 못했습니다. **확인 필요.**

---

*작성일: 2026-09-07*
