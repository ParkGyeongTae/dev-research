---
sidebar_position: 5
---

# dash란 무엇인가 — 리눅스에서 `#!/bin/sh`를 실제로 읽는 것

> **원문** — [Debian Policy Manual §10.4 Scripts](https://www.debian.org/doc/debian-policy/ch-files.html) · [packages.debian.org, dash (trixie/stable)](https://packages.debian.org/en/stable/dash) · [manpages.debian.org, sh(1) — dash — trixie](https://manpages.debian.org/trixie/dash/sh.1.en.html)
>
> **확인 날짜** — 2026-09-07. Debian Policy와 패키지 페이지에는 판번호가 있고(Policy는 문서 자체 버전, 패키지는 `0.5.12-12`), Debian 위키에는 판번호가 없어 확인 날짜로 대신합니다.
>
> **검증 상태** — 위 원문들의 해당 절을 읽고 정리했습니다. **이전 판에서 "Docker 데몬 미동작으로 미재현"으로 남겨 두었던 리눅스 항목을 이번에 컨테이너로 전부 재현했고**, `/bin/sh`의 정체·`pipefail`·실패 모드·BusyBox ash 대조가 모두 실측으로 바뀌었습니다. 성능 수치도 이번에 다시 쟀습니다.

맥에서 짠 `#!/bin/sh` 스크립트가 컨테이너에서 터진다면, 대개 그것을 읽은 것이 dash입니다.
**dash는 "작고 빠른 셸"이라기보다, 이식성이 실제로 검사당하는 지점**입니다 — Debian 계열에서 `#!/bin/sh`의 해석자이기 때문입니다.

이 문서가 잡으려는 개념은 넷입니다. dash가 **무엇의 구현인지**, **무엇이 없는지**, **없는 것을 건드렸을 때 어떤 모양으로 실패하는지**, 그리고 **왜 dash로 검사하는 것이 Alpine으로 검사하는 것보다 엄격한지**입니다.
세 번째가 중심입니다 — dash의 실패는 요란하게 죽는 쪽보다 **조용히 잘못된 값을 내거나, 실패하고도 0을 반환하는 쪽**이 많습니다(§4).

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | macOS | Debian (컨테이너) | Alpine (컨테이너) |
| --- | --- | --- | --- |
| OS | macOS 15.7.4 (Darwin 24.6.0), 빌드 24G517 | Debian 13.6 (trixie) | Alpine 3.24.1 |
| 이미지 | — | `debian:trixie-slim@sha256:d7e12182…` | `alpine:3@sha256:28bd5fe8…` |
| CPU / 메모리 | Apple M4 Pro, 14코어 / 24 GiB | 같은 머신, aarch64 | 같은 머신, aarch64 |
| dash | Apple 패키지 `dash-16` — 상위 버전 번호 미확인 | `0.5.12-12` | 해당 없음 |
| `/bin/sh` | bash 3.2.57로 re-exec | dash 0.5.12-12 | BusyBox v1.37.0 ash |
| 그 밖 | `/bin/bash` 3.2.57, `/bin/zsh` 5.9 | bash 5.2.37 | — |
| 실행 날짜 | 2026-09-07 | 2026-09-07 | 2026-09-07 |

컨테이너는 Docker 29.3.1(Docker Desktop, aarch64 linuxkit 커널)에서 띄웠습니다.

---

## 1. 무엇인가

Debian 패키지 설명이 한 줄로 정의합니다.

> The Debian Almquist Shell (dash) is a POSIX-compliant shell derived from ash.
>
> **번역** — Debian Almquist Shell(dash)은 ash에서 파생된 POSIX 준수 셸입니다.
>
> — [packages.debian.org, dash (trixie/stable)](https://packages.debian.org/en/stable/dash) (확인: 2026-09-07)

이름 그대로 **Almquist shell(ash)에서 갈라져 나온 Debian 계열의 구현체**입니다. 상위 소스는 kernel.org에 있고 Herbert Xu가 관리합니다.

| 항목 | 값 | 확인 방법 |
| --- | --- | --- |
| 상위 저장소 | `git://git.kernel.org/pub/scm/utils/dash/dash.git` | [kernel.googlesource.com 미러](https://kernel.googlesource.com/pub/scm/utils/dash/dash/) 조회 (2026-09-07) |
| Debian stable(trixie) 패키지 | `0.5.12-12` | 컨테이너에서 `dpkg -l dash`로 **직접 확인** |

```console
$ docker run --rm debian:trixie-slim sh -c 'dpkg -l dash | tail -1'
ii  dash           0.5.12-12    arm64        POSIX-compliant shell
```

**상위 최신판과 배포판이 싣는 판이 다릅니다.** 이 간격이 §5의 `pipefail` 문제를 만듭니다.

여기서 개념을 하나 못 박아 둘 필요가 있습니다. **dash는 "POSIX 규격 그 자체"가 아니라 규격을 만족하는 구현체 하나입니다.** 그래서 "dash에서 돌면 POSIX"라는 추론은 성립하지 않습니다 — §3에서 보듯 dash는 **규격에 없는 것도 일부 갖고 있습니다.**

---

## 2. 어디가 dash인가

### Debian·Ubuntu — `/bin/sh`가 dash입니다

Debian 위키의 서술입니다.

> Beginning with DebianSqueeze, Debian uses Dash (the Debian Almquist shell) as the target of the /bin/sh symlink.
>
> Dash lacks many of the features one would expect in an interactive shell, which allows it to be faster and more memory efficient than Bash.
>
> **번역** — Debian Squeeze부터, Debian은 `/bin/sh` 심볼릭 링크의 대상으로 Dash(Debian Almquist shell)를 씁니다.
>
> Dash에는 대화형 셸에서 기대할 만한 기능이 여럿 빠져 있는데, 그 덕분에 Bash보다 빠르고 메모리를 덜 씁니다.
>
> — [wiki.debian.org/Shell](https://wiki.debian.org/Shell) (확인: 2026-09-07)

같은 문서는 선택권이 사라졌다는 것도 밝힙니다.

> From DebianSqueeze to DebianBullseye, it was possible to select Bash as the target of the /bin/sh symlink by running `dpkg-reconfigure dash`. However, as of DebianBookworm, this is no longer supported.
>
> **번역** — Debian Squeeze부터 Bullseye까지는 `dpkg-reconfigure dash`를 돌려 `/bin/sh` 심볼릭 링크의 대상으로 Bash를 고를 수 있었습니다. 그러나 Debian Bookworm부터는 더 이상 지원되지 않습니다.

즉 **Bookworm 이후로는 `/bin/sh`를 bash로 되돌리는 지원 경로가 없습니다.** "그냥 bash로 바꿔서 쓰면 되지"가 통하지 않는다는 뜻입니다. 링크 자체는 이번에 직접 확인했습니다.

```console
$ docker run --rm debian:trixie-slim sh -c 'cat /etc/debian_version; ls -l /bin/sh'
13.6
lrwxrwxrwx 1 root root 4 Feb  4  2025 /bin/sh -> dash

$ docker run --rm ubuntu:24.04 sh -c 'grep VERSION= /etc/os-release; ls -l /bin/sh'
VERSION="24.04.4 LTS (Noble Numbat)"
lrwxrwxrwx 1 root root 4 Mar 31  2024 /bin/sh -> dash
```

### Alpine — dash가 아닙니다

"슬림 컨테이너 = dash"가 흔한 오해입니다. Alpine의 `/bin/sh`는 **BusyBox 바이너리 자체**입니다.

```console
$ docker run --rm alpine:3 sh -c 'cat /etc/alpine-release; ls -l /bin/sh; busybox | head -1'
3.24.1
lrwxrwxrwx    1 root     root            12 Jun 13 16:39 /bin/sh -> /bin/busybox

BusyBox v1.37.0 (2026-01-10 15:38:28 UTC) multi-call binary.
```

dash와 같은 ash 계보이되 **같은 구현이 아니고, 동작도 상당히 다릅니다.** §4 끝에서 그 차이를 대조합니다.

### macOS — dash는 설치돼 있지만 `sh`가 아닙니다

이 맥에는 `/bin/dash`가 존재합니다. 그런데 `/bin/sh`는 dash가 아닙니다. `sh(1)` man page가 구조를 설명합니다.

```console
$ man 1 sh | col -b | grep -A4 'determined by the symbolic'
     by re-execing as either bash(1), dash(1), or zsh(1) as determined by the
     symbolic link located at /private/var/select/sh.  If
     /private/var/select/sh does not exist or does not point to a valid shell,
     sh will use one of the supported shells.
```

현재 링크는 bash를 가리킵니다.

```console
$ ls -l /private/var/select/sh
lrwxr-xr-x  1 root  wheel  9  2  1  2026 /private/var/select/sh -> /bin/bash

$ /bin/sh -c 'echo "BASH_VERSION=$BASH_VERSION"'
BASH_VERSION=3.2.57(1)-release
```

**그래서 맥에서 `#!/bin/sh` 스크립트를 아무리 돌려봐도 dash 호환성 검사가 되지 않습니다.** 검사하려면 `/bin/dash`를 직접 불러야 합니다. 이게 이 문서에서 가장 실용적인 한 줄입니다.

### 정리

| 환경 | `#!/bin/sh`를 읽는 것 | 확인 |
| --- | --- | --- |
| Debian 13.6 (trixie) | dash 0.5.12-12 | **직접 확인** |
| Ubuntu 24.04 | dash | **직접 확인** |
| Alpine 3.24.1 | BusyBox v1.37.0 ash — dash가 **아닙니다** | **직접 확인** |
| macOS (이 머신) | bash 3.2.57 (re-exec) | **직접 확인** |

---

## 3. dash는 "순수 POSIX 셸"이 아닙니다

§1에서 예고한 지점입니다. **Debian의 `/bin/sh`는 POSIX에 다섯 가지를 더한 것**이고, 그건 Debian Policy가 명시적으로 요구하는 사항입니다.

Policy §10.4는 스크립트가 `/bin/sh`에 대해 무엇을 가정해도 되는지 규정합니다 — "the POSIX.1-2017 Shell Command Language **plus the following additional features not mandated by POSIX.1-2017**".

| 요구되는 확장 | 내용 |
| --- | --- |
| `echo -n` | 빌트인으로 구현됐다면 개행을 내지 않아야 함 |
| `test -a` / `-o` | 이항 논리 연산자로 지원해야 함 |
| `local` | 함수 스코프 변수. 다중 선언·동시 대입 포함 |
| `kill`의 XSI 확장 | 시그널 이름 또는 번호(0, 1, 2, 3, 6, 9, 14, 15) |
| `trap`의 XSI 확장 | 숫자 시그널 및 SIGPIPE(13) |

> If a shell script requires non-POSIX.1-2017 features from the shell interpreter other than those listed above, the appropriate shell must be specified in the first line of the script (e.g., `#!/bin/bash`) and the package must depend on the package providing the shell.
>
> **번역** — 셸 스크립트가 위에 나열된 것 외의 비-POSIX.1-2017 기능을 셸 해석기에 요구한다면, 스크립트 첫 줄에 적절한 셸을 명시해야 하고(예: `#!/bin/bash`) 패키지는 그 셸을 제공하는 패키지에 의존해야 합니다.
>
> — [Debian Policy Manual §10.4](https://www.debian.org/doc/debian-policy/ch-files.html) (확인: 2026-09-07)

로컬 dash와 Debian 컨테이너 양쪽에서 확인했습니다.

```console
$ /bin/dash -c 'f() { local x=1; echo "local ok=$x"; }; f'
local ok=1

$ /bin/dash -c '[ 1 -eq 1 -a 2 -eq 2 ] && echo "test -a ok"'
test -a ok
```

**그래서 `local`이 dash에서 돈다고 해서 그 스크립트가 POSIX인 것은 아닙니다.** 규격은 `local`을 유틸리티로 정의하지 않고, **결과가 미정의(unspecified)인 이름 목록에 올려 둡니다.**

> If the command name matches the name of a utility listed in the following table, the results are unspecified.
>
> **번역** — 명령 이름이 아래 표에 나열된 유틸리티의 이름과 일치하면, 그 결과는 규정되지 않습니다.

이 표에 `local`이 `declare`·`typeset` 등과 함께 들어 있습니다. Issue 7·Issue 8 양쪽 다 같습니다.
— [The Open Group Base Specifications Issue 7 (POSIX.1-2017), Shell Command Language, 2.9.1 Command Search and Execution](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html) (확인: 2026-09-07)
— [The Open Group Base Specifications Issue 8 (POSIX.1-2024), Shell Command Language, 2.9.1.4 Command Search and Execution](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-07)

즉 dash에서 도는 것은 Debian Policy가 요구했기 때문이지 규격의 보장이 아닙니다. **Debian 밖의 다른 `sh` 구현에서는 보장되지 않습니다.**

Policy가 `echo -n`을 요구한다는 점은 맥에서 반대 방향으로 물립니다.

```console
$ /bin/dash -c 'echo -n x' | od -c | head -1
0000000    x
$ /bin/sh   -c 'echo -n x' | od -c | head -1
0000000    -   n       x  \n
```

**dash에서는 `-n`이 동작하는데, 맥의 `/bin/sh`에서는 `-n`이 그대로 출력됩니다.** "리눅스에서 되던 게 맥에서 깨지는" 방향입니다. 흔히 경고하는 방향의 반대라 놓치기 쉽습니다.

---

## 4. 무엇이 없는가, 그리고 어떻게 실패하는가

같은 표현식을 네 셸에 넣고 첫 줄만 잘라 비교했습니다. **직접 실행한 결과입니다.**

| 표현식 | dash | `/bin/sh`(=bash) | bash 3.2 | zsh 5.9 |
| --- | --- | --- | --- | --- |
| `local x=1` | `ok1` | `ok1` | `ok1` | `ok1` |
| `test -a` | `ok` | `ok` | `ok` | `ok` |
| `arr=(a b); ${arr[1]}` | `Syntax error` | `b` | `b` | `a` |
| `[[ a == a ]]` | `[[: not found` | `ok` | `ok` | `ok` |
| `echo {1..3}` | `{1..3}` | `1 2 3` | `1 2 3` | `1 2 3` |
| `cat <(echo ok)` | `Syntax error` | `syntax error` | `ok` | `ok` |
| `$'a\tb'` | `$a\tb` | 탭 | 탭 | 탭 |
| `[ x == x ]` | `unexpected operator` | `ok` | `ok` | `= not found` |
| `${v:0:2}` | `Bad substitution` | `ab` | `ab` | `ab` |
| `let i=1+1` | `let: not found` | `2` | `2` | `2` |
| `source ./g` | `source: not found` | `sourced` | `sourced` | `sourced` |
| `function f { }` | `Syntax error` | `ok` | `ok` | `ok` |
| `cat <<< ok` | `Syntax error` | `ok` | `ok` | `ok` |
| `$RANDOM` | 빈 값 | 값 있음 | 값 있음 | 값 있음 |
| `$SECONDS` | 빈 값 | `0` | `0` | `0` |
| `trap ... ERR` | `bad trap` | `trapped` | `trapped` | `trapped` |
| `$((2**3))` | `arithmetic error` | `8` | `8` | `8` |
| `${PIPESTATUS[0]}` | `Bad substitution` | `0` | `0` | 빈 값 |

먼저 헷갈리기 쉬운 것 하나. **`$(( ))` 산술 자체는 POSIX에 있고 dash도 지원합니다** — 없는 것은 `**` 거듭제곱 연산자와 `$RANDOM`·`$SECONDS` 같은 변수입니다.

그리고 이 표를 읽는 진짜 방법은 "무엇이 없는가"가 아니라 **"없을 때 어떤 모양으로 실패하는가"**입니다. 세 가지로 갈립니다.

### (a) 오류 없이 다른 값 — 가장 조용합니다

`echo {1..3}`이 `{1..3}`을, `$'a\tb'`가 `$a\tb`를 냅니다. **오류가 아닙니다.** dash에는 그 문법이 없으니 **리터럴 문자열로 그대로 흘러갑니다.**

```console
$ /bin/dash -c 'echo {1..3}'
{1..3}
$ /bin/dash -c "printf '%s\n' \$'a\tb'"
$a\tb
```

`for d in {1..30}`으로 날짜 파티션을 도는 스크립트라면, dash에서는 **`{1..30}`이라는 이름의 파티션 하나**를 처리하려 듭니다. 파일 경로나 날짜 범위를 만드는 데 썼다면 잘못된 대상에 작업이 나갑니다.

같은 부류가 `echo`의 이스케이프 해석입니다. **여기서 `sh`라 불리는 구현 넷이 3 대 1로 갈립니다.**

```console
$ /bin/dash -c 'echo "a\tb"' | od -c | head -1                             # macOS dash
0000000    a  \t   b  \n
$ /bin/sh -c 'echo "a\tb"' | od -c | head -1                               # macOS sh (=bash 3.2)
0000000    a  \t   b  \n
$ docker run --rm debian:trixie-slim sh -c 'echo "a\tb"' | od -c | head -1  # Debian sh (=dash)
0000000    a  \t   b  \n
$ docker run --rm alpine:3 sh -c 'echo "a\tb"' | od -c | head -1            # Alpine sh (=BusyBox ash)
0000000    a   \   t   b  \n
$ /bin/bash -c 'echo "a\tb"' | od -c | head -1                             # macOS bash 이름으로
0000000    a   \   t   b  \n
```

TSV를 `echo`로 만들면 **Debian 이미지에서는 탭 구분 파일이, Alpine 이미지에서는 `\t` 두 글자가 든 파일이** 나옵니다. 베이스 이미지를 바꾸는 것만으로 데이터가 달라집니다. `printf`는 넷 다 같았습니다.

```console
$ /bin/dash -c 'printf "a\tb\n"' | od -c | head -1
0000000    a  \t   b  \n
$ docker run --rm debian:trixie-slim sh -c 'printf "a\tb\n"' | od -c | head -1
0000000    a  \t   b  \n
$ docker run --rm alpine:3 sh -c 'printf "a\tb\n"' | od -c | head -1
0000000    a  \t   b  \n
```

**규칙: 이식성이 필요한 자리에서 `echo`를 쓰지 말고 `printf`를 씁니다.**

### (b) 실패했는데 종료 코드가 0 — 자동화가 성공으로 기록합니다

`[[ ]]`는 dash에서 **파싱 오류가 아니라 "명령을 못 찾음"** 입니다. 그래서 스크립트가 멈추지 않습니다.

```console
$ cat runtime.sh
echo "1행: 여기는 실행됩니다"
echo "2행: 중요한 작업 수행"
[[ a == a ]] && echo "3행: bashism"
echo "4행: [[ ]] 이후"

$ /bin/dash runtime.sh; echo "  종료코드=$?"
1행: 여기는 실행됩니다
2행: 중요한 작업 수행
runtime.sh: 3: [[: not found
4행: [[ ]] 이후
  종료코드=0
```

**3행의 분기가 통째로 사라졌는데 스크립트는 0으로 끝납니다.** Airflow의 `BashOperator`나 CI 스텝은 이걸 **성공으로 기록합니다.** 로그에 `[[: not found` 한 줄이 남지만, 성공한 태스크의 로그를 여는 사람은 없습니다.

### (c) 앞부분은 실행된 뒤 중간에서 죽음

배열 문법은 파싱 오류입니다. 그런데 dash는 파일 전체를 미리 파싱하지 않고 **읽어 가며 실행합니다.**

```console
$ cat parse.sh
echo "1행: 여기는 실행됩니다"
echo "2행: 중요한 작업 수행"
arr=(a b c)
echo "4행: 배열 이후"

$ /bin/dash parse.sh; echo "  종료코드=$?"
1행: 여기는 실행됩니다
2행: 중요한 작업 수행
parse.sh: 3: Syntax error: "(" unexpected
  종료코드=2
```

**"문법 오류니까 아무것도 실행되지 않았겠지"가 틀립니다.** 1·2행의 부수 효과(파일 생성, 테이블 적재, API 호출)는 이미 일어났고 4행은 안 일어났습니다. 재실행하려면 어디까지 진행됐는지 직접 따져야 합니다.

### (d) dash로 검사하는 것과 Alpine으로 검사하는 것은 다릅니다

**같은 두 파일을 Alpine의 `/bin/sh`(BusyBox ash)에 넣으면 결과가 갈립니다.**

```console
$ docker run --rm -v "$PWD":/lab -w /lab alpine:3 sh -c 'sh runtime.sh; echo "  종료코드=$?"'
1행: 여기는 실행됩니다
2행: 중요한 작업 수행
3행: bashism
4행: [[ ]] 이후
  종료코드=0
```

**dash가 잡아낸 `[[ ]]`를 Alpine은 그냥 실행합니다.** (b)의 시나리오에서 dash는 최소한 로그 한 줄이라도 남겼는데, Alpine에서는 아무 흔적도 없습니다 — 검사 대상이 아니라 검사기가 무력해진 것입니다.

배열은 양쪽 다 잡습니다.

```console
$ docker run --rm -v "$PWD":/lab -w /lab alpine:3 sh -c 'sh parse.sh; echo "  종료코드=$?"'
1행: 여기는 실행됩니다
2행: 중요한 작업 수행
  종료코드=2
parse.sh: line 3: syntax error: unexpected "("
```

(오류 줄이 종료 코드 뒤에 찍힌 것은 표준 출력과 표준 오류가 컨테이너 밖으로 나오면서 섞인 순서입니다. 실행 순서가 아니라 **출력 버퍼링의 결과**이고, 종료 코드 2는 3행에서 죽었다는 뜻입니다.)

두 `/bin/sh`의 차이를 표현식 단위로 재 보면 이렇습니다.

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
| `arr=(a b)` | `Syntax error` | `syntax error` |
| `echo {1..3}` | `{1..3}` | `{1..3}` |
| `cat <<< ok` | `Syntax error` | `syntax error` |
| `${PIPESTATUS[0]}` | `Bad substitution` | `syntax error: bad substitution` |
| `local x=1` (함수 안) | `local ok=1` | `local ok=1` |
| `set -o pipefail` | `ok` | `ok` |

따라 나오는 것이 셋입니다.

1. **dash가 더 엄격한 검사기입니다.** dash를 통과하면 Alpine도 대체로 통과하지만, 반대는 성립하지 않습니다. 이식성 검사는 dash로 합니다.
2. **"Alpine에서 돌았으니 POSIX"는 틀린 추론입니다.** 굵은 항목은 전부 규격 밖인데 통과합니다.
3. **관대한 쪽이 항상 안전한 것은 아닙니다.** 마지막에서 다섯 번째 줄(`echo "a\tb"`)이 방향을 뒤집습니다 — Debian에서 만든 TSV가 Alpine에서 깨집니다.

### 표에서 따라 나오는 것

표를 (a)(b)(c) 기준으로 다시 보면 dash가 안 맞는 자리도 정해집니다.

- **자료구조가 필요한 로직** — 배열이 없습니다(연관 배열은 물론). 목록을 다루려면 문자열과 `IFS`로 흉내 내야 하고, 공백 든 파일명에서 깨집니다.
- **문자열 조작이 많은 스크립트** — `${v:0:2}`, `${v^^}`, `${v/a/b}`가 없습니다. `cut`·`sed`를 부르게 되고, 그러면 §6의 속도 이점이 외부 프로세스 비용에 묻힙니다.
- **파이프 중간의 실패를 잡아야 하는 처리** — 다음 절입니다.

---

## 5. 버전에 따라 답이 갈리는 것 — `pipefail`

`set -o pipefail`은 "dash에 없다"고 널리 이야기되지만, **지금은 판에 따라 다릅니다.** 데이터 파이프라인에서는 이게 결정적이라 따로 둡니다.

이 맥의 dash에는 없습니다.

```console
$ /bin/dash -c 'set -o pipefail && echo ok'
/bin/dash: 1: set: Illegal option -o pipefail
```

**Debian trixie의 dash 0.5.12-12에는 있습니다.** 이전 판에서는 man page로만 확인했던 것을 이번에 실제로 돌려 확인했습니다.

```console
$ docker run --rm debian:trixie-slim sh -c '
    set -o pipefail; (exit 3) | true; echo "pipefail 종료코드=$?"
    set +o pipefail; (exit 3) | true; echo "미적용 종료코드=$?"'
pipefail 종료코드=3
미적용 종료코드=0
```

**같은 파이프라인이 옵션 하나로 3과 0으로 갈립니다.** man page의 서술과 일치합니다.

> **pipefail** Derive the exit status of a pipeline from the exit statuses of all of the commands in the pipeline, not just the last command, as described in the Pipelines section.
>
> **번역** — 파이프라인의 종료 상태를 마지막 명령만이 아니라 파이프라인 안 모든 명령의 종료 상태로부터 이끌어 냅니다. Pipelines 절에 기술된 대로입니다.
>
> — [manpages.debian.org, sh(1) — dash — trixie](https://manpages.debian.org/trixie/dash/sh.1.en.html) (확인: 2026-09-07)

들어온 시점도 특정됩니다.

> Upstream patch:
>     - Implement pipefail option (Closes: #1071238)
>
> — [dash 0.5.12-7 changelog, Fri, 17 May 2024](https://metadata.ftp-master.debian.org/changelogs/main/d/dash/dash_0.5.12-12_changelog) (확인: 2026-09-07)

규격 쪽에서도 확정된 사항입니다. Austin Group(POSIX 유지보수 기구) 이슈 0000789 "Add set -o pipefail"은 **Closed / Accepted As Marked**이고 대상 판은 **Issue 8 = IEEE Std 1003.1-2024**입니다.
— [austingroupbugs.net/view.php?id=789](https://www.austingroupbugs.net/view.php?id=789) (확인: 2026-09-07)

Alpine의 BusyBox ash에도 있습니다(§4 대조표).

정리하면 이렇습니다. §1에서 본 "상위 판과 배포판이 싣는 판이 다르다"가 여기서 실제 결과로 나타납니다.

| 대상 | `set -o pipefail` | 확인 |
| --- | --- | --- |
| POSIX Issue 8 (2024) | 규격에 포함 | Austin Group 이슈로 확인 |
| Debian trixie dash 0.5.12-12 | **있음** | **직접 확인** |
| Alpine BusyBox v1.37.0 ash | **있음** | **직접 확인** |
| macOS `/bin/dash` (dash-16) | **없음** | **직접 확인** |

**여기서 방향이 뒤집힙니다.** 흔한 조언은 "맥에서 되는 게 리눅스에서 안 될 수 있다"인데, `pipefail`은 **리눅스에서 되고 맥의 dash에서 안 됩니다.** 맥의 `/bin/dash`를 이식성 검사기로 쓰면 이 항목은 **실제보다 비관적으로** 나옵니다.

**`${PIPESTATUS[@]}`는 어느 판에도 없습니다.** trixie man page에도 없고 Alpine ash에도 없습니다(§4 대조표). 파이프 중간의 실패를 개별로 집어내야 한다면 dash로는 방법이 없고, 스크립트를 bash로 올리거나 파이프를 풀어 임시 파일로 끊어야 합니다. `psql ... | gzip > out.gz` 형태에서 앞 단계 실패를 알아야 한다면 dash는 맞지 않습니다.

---

## 6. 왜 dash를 쓰는가 — "빠르다"의 실제 크기

Debian 위키가 드는 이유는 속도와 메모리입니다(§2 인용). 그 말이 맞는지 재 봤습니다.

**측정 조건**: macOS 15.7.4 / Apple M4 Pro 14코어 / 24 GiB, 직렬 단일 프로세스, 외부 명령 없음, `/usr/bin/time -p`의 `real`, 각 3회. 측정 날짜 2026-09-07.

**(A) 기동 비용 — 셸을 1,000번 새로 띄우고 즉시 종료**

```console
$ /usr/bin/time -p /bin/dash -c 'i=0; while [ $i -lt 1000 ]; do <셸> -c ":"; i=$((i+1)); done'
```

| 셸 | 1회차 | 2회차 | 3회차 |
| --- | --- | --- | --- |
| `/bin/dash` | 1.10s | 1.10s | 1.10s |
| `/bin/bash` | 1.41s | 1.40s | 1.40s |
| `/bin/zsh` | 2.09s | 2.08s | 2.08s |
| `/bin/sh` (=bash) | 2.21s | 2.21s | 2.21s |

**(B) 순수 인터프리터 루프 — 산술 100,000회, 외부 명령 없음**

```console
$ /usr/bin/time -p <셸> -c 'i=0; while [ $i -lt 100000 ]; do i=$((i+1)); done'
```

| 셸 | 1회차 | 2회차 | 3회차 |
| --- | --- | --- | --- |
| `/bin/dash` | 0.10s | 0.10s | 0.10s |
| `/bin/bash` | 0.22s | 0.21s | 0.21s |
| `/bin/zsh` | 0.11s | 0.12s | 0.12s |

읽을 점 셋입니다.

1. **기동은 bash 대비 약 1.3배, 루프는 약 2배 빠릅니다.** 흔히 도는 "훨씬 빠르다"는 이 정도 규모입니다. 이 조건에서 잰 값이고, 외부 명령(`grep`, `awk`)을 한 번이라도 부르면 그 프로세스 비용이 셸 차이를 덮습니다.
2. **루프에서 zsh(0.11~0.12s)가 dash(0.10s)와 사실상 같습니다.** "바이너리가 작아서 빠르다"는 설명이 여기서 깨집니다 — zsh 바이너리는 dash의 약 5배입니다.
3. **`/bin/sh`가 `/bin/bash`보다 느립니다(2.21s vs 1.40s).** 같은 bash 3.2.57인데도 그렇습니다. 원인을 분리해 봤습니다.

```console
$ /bin/bash -c :          → real=1.39s
$ /bin/bash --posix -c :  → real=1.39s
$ /bin/sh -c :            → real=2.21s
```

**`posix` 모드 자체는 비용이 없습니다.** 차이는 `/bin/sh`라는 별도 바이너리가 bash로 **re-exec** 하는 데서 옵니다 — man page가 "by re-execing"이라고 쓴 그 동작입니다(§2). 맥에서 `sh` 루프를 많이 도는 빌드 스크립트라면 `bash`를 직접 부르는 편이 빠릅니다.

크기와 의존성도 확인했습니다.

```console
$ ls -l /bin/dash /bin/bash /bin/zsh   (바이트)
   274272 /bin/dash
  1310224 /bin/bash
  1361200 /bin/zsh

$ otool -L /bin/dash
	/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1351.0.0)
$ otool -L /bin/bash
	/usr/lib/libncurses.5.4.dylib (compatibility version 5.4.0, current version 5.4.0)
	/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1351.0.0)
```

**dash는 libSystem 하나에만 의존합니다.** bash는 libncurses를 더 답니다. 부팅 초기나 복구 환경처럼 라이브러리가 덜 올라온 시점에 `/bin/sh`가 dash인 것은 이 의존성 차이가 이유입니다.

그리고 이 배수가 언제 의미를 갖는지도 여기서 정해집니다. 1.3~2배를 위해 배열을 포기할 값어치가 있는지는 스크립트가 무엇을 하느냐에 달렸지만, **패키지 관리자 훅이나 부팅 스크립트처럼 수천 번 짧게 도는 자리**에서는 그 배수가 총 시간에 그대로 반영됩니다.

### 그래서 실제 판단은 dash가 아니라 셔뱅입니다

**dash를 "고르는" 상황은 사실 드뭅니다.** 대개는 고르는 게 아니라 `#!/bin/sh`를 썼기 때문에 배포 환경에서 dash가 배정되는 것입니다. 그래서 실질적인 결정은 "dash를 쓸까"가 아니라 **"셔뱅을 `#!/bin/sh`로 둘까 `#!/bin/bash`로 바꿀까"** 입니다.

대화형 셸로 dash를 고를 이유도 없습니다. vi/emacs 편집 모드는 있지만(`/bin/dash -V`, `-E` 모두 종료 코드 0으로 수용됨 — 직접 확인) 보완·프롬프트 확장·이력 관리가 bash·zsh 수준이 아닙니다.

---

## 확인하지 못한 것

- **macOS `/bin/dash`의 상위 버전.** 바이너리에는 Apple 패키지 문자열(`@(#)PROGRAM:dash  PROJECT:dash-16`)만 있고 `--version`은 없습니다(`Illegal option --`). dash-16이 상위 0.5.x 중 어느 판인지 확인하지 못했습니다. 그래서 이 문서의 macOS dash 결과는 **"이 맥의 dash-16 기준"**이지 "dash 일반"이 아닙니다. §5의 `pipefail` 부재도 dash-16의 사실이지 dash 전체의 사실이 아닙니다.
- **상위 dash의 최신 태그.** 이전 판에서는 kernel.org 미러 조회로 `v0.5.13.5`를 적었으나 이번에 재확인하지 않았습니다. 이 문서가 실측으로 뒷받침하는 것은 Debian trixie가 싣는 `0.5.12-12`뿐입니다. **확인 필요.**
- **리눅스 결과는 커널 하나에서만 얻었습니다.** Docker Desktop이 띄운 aarch64 linuxkit 커널입니다. x86_64, 실제 배포판 커널, 다른 컨테이너 런타임에서는 재현하지 않았습니다.
- **`dpkg-reconfigure dash`가 Bookworm 이후 막혔다는 것**은 Debian 위키 서술로만 확인했고, 컨테이너에서 실제로 실행해 거절되는지는 시험하지 않았습니다. **미실행.**
- **BusyBox ash가 왜 그렇게 관대한지.** 빌드 설정(`CONFIG_ASH_BASH_COMPAT` 계열)으로 켜고 끌 수 있는 것으로 보이나, Alpine 3.24.1 이미지가 어떤 설정으로 빌드됐는지 원문을 찾지 못했습니다. **추측:** bash 호환 옵션이 켜진 빌드입니다. 확인 필요.
- **상위 프로젝트 홈페이지**(`gondor.apana.org.au/~herbert/dash/`)는 이전 확인 때 접속이 거부되어(ECONNREFUSED) 확인하지 못했고, 이번에도 재시도하지 않았습니다.
- **dash의 메모리 사용량.** Debian 위키가 "more memory efficient"라고 하지만 측정하지 않았습니다. 이 문서의 수치는 시간과 바이너리 크기뿐입니다.
- **성능 측정은 macOS에서만 했습니다.** Debian 컨테이너의 dash 0.5.12-12와 Alpine의 BusyBox ash는 속도를 재지 않았습니다. §6의 배수를 리눅스에 그대로 옮기면 안 됩니다.

---

*작성일: 2026-09-07*
