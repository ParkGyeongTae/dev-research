---
sidebar_position: 2
---

# sh란 무엇인가 — 이식성의 기준선

`#!/bin/sh`라고 쓰면 무엇이 실행될까요. **정해져 있지 않습니다.**
`sh`는 프로그램 이름이 아니라 **규격 이름**이고, 그 규격을 만족하는 서로 다른 프로그램이 배포판마다 다르게 걸려 있습니다.
로컬에서 잘 돌던 스크립트가 컨테이너에서 깨지는 사고의 상당수가 여기서 나옵니다.

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | 값 |
| --- | --- |
| OS | macOS (Darwin 24.6.0), arm64 |
| `/bin/sh` | bash 3.2.57 (sh 모드) — 아래 §2에서 확인 |
| `/bin/bash` | GNU bash 3.2.57(1)-release |
| `/bin/dash` | macOS 번들 (버전 옵션 없음) |
| `/bin/zsh` | zsh 5.9 |
| 실행 날짜 | 2026-09-06 |

**여기서 확인한 것은 macOS 기준입니다.** Linux 배포판에서는 §2의 결과가 달라집니다 — 그게 이 문서의 요점입니다.

---

## 1. sh는 규격입니다

`sh`의 정의는 POSIX에 있습니다.

> The shell is a command language interpreter. This chapter describes the syntax of that command language as it is used by the `sh` utility and the `system()` and `popen()` functions defined in the System Interfaces volume of POSIX.1-2024.
>
> — [The Open Group Base Specifications Issue 8, IEEE Std 1003.1-2024, Chapter 2: Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-06)

즉 **`sh`는 "이 규격대로 동작하는 명령 해석기"라는 뜻**이고, 그 자리를 채우는 실제 프로그램은 시스템이 고릅니다.
bash도, dash도, ksh도, zsh도 `sh`로 불릴 수 있습니다. **그리고 각자 규격 위에 얹은 확장이 다릅니다.**

---

## 2. `#!/bin/sh`가 실제로 무엇을 실행하는가

### macOS — 선택 가능한 링크입니다

macOS의 `man sh`는 이렇게 적고 있습니다.

```console
$ man 1 sh
DESCRIPTION
     sh is a POSIX-compliant command interpreter (shell).  It is implemented by re-execing as either
     bash(1), dash(1), or zsh(1) as determined by the symbolic link located at
     /private/var/select/sh.  If /private/var/select/sh does not exist or does not point to a valid
     shell, sh will use one of the supported shells.
```

**`/bin/sh`가 무엇인지는 링크 하나로 정해집니다.** 이 머신의 현재 상태입니다.

```console
$ ls -l /private/var/select/sh
lrwxr-xr-x  1 root  wheel  9  2  1  2026 /private/var/select/sh -> /bin/bash
```

그래서 확인해 보면 bash가 나옵니다.

```console
$ /bin/sh -c 'echo "BASH_VERSION=$BASH_VERSION  ZSH_VERSION=$ZSH_VERSION"'
BASH_VERSION=3.2.57(1)-release  ZSH_VERSION=
```

### Debian·Ubuntu — dash입니다

Debian 위키 기준으로 `/bin/sh`는 dash를 가리키며, DebianSqueeze부터 그렇게 바뀌었습니다. 이유도 적혀 있습니다.

> Dash lacks many of the features one would expect in an interactive shell, which allows it to be faster and more memory efficient than Bash.
>
> — [Debian Wiki — Shell](https://wiki.debian.org/Shell) (확인: 2026-09-06)

같은 문서는 `/bin/sh` 스크립트가 **Debian Policy §10.4와 Single UNIX Specification**을 따라야 한다고 밝힙니다.

> 이 항목은 Debian 공식 위키에서 읽은 것이며, **이 저장소에서 Debian·Ubuntu 시스템으로 재현하지 않았습니다.** 로컬에 Docker 데몬이 떠 있지 않아 컨테이너 검증을 하지 못했습니다 — **확인 필요.**

### 정리

| 시스템 | `/bin/sh`의 실체 |
| --- | --- |
| macOS (이 머신) | bash 3.2.57 — `/private/var/select/sh` 링크로 결정. **직접 확인** |
| Debian·Ubuntu | dash. **문서로 확인, 미재현** |
| Alpine | busybox ash로 알려져 있음. **확인 필요 — 검증하지 않음** |

---

## 3. "sh 모드"는 이름표가 아닙니다 — 동작이 바뀝니다

같은 bash 바이너리라도 **`sh`라는 이름으로 불리면 다르게 동작합니다.** 실제로 확인했습니다.

```console
$ cat /tmp/who.sh
echo "\$0=$0  BASH_VERSION=$BASH_VERSION  posix옵션=$(set -o | grep -w posix)"

$ /bin/sh /tmp/who.sh
$0=/tmp/who.sh  BASH_VERSION=3.2.57(1)-release  posix옵션=posix          	on

$ /bin/bash /tmp/who.sh
$0=/tmp/who.sh  BASH_VERSION=3.2.57(1)-release  posix옵션=posix          	off
```

**같은 3.2.57인데 `posix` 옵션이 하나는 on, 하나는 off입니다.**

이게 관찰 가능한 차이로 나타나는 예가 `echo`입니다.

```console
$ /bin/sh   -c 'echo "a\tb"' | od -c | head -1
0000000    a  \t   b  \n
$ /bin/bash -c 'echo "a\tb"' | od -c | head -1
0000000    a   \   t   b  \n
$ /bin/dash -c 'echo "a\tb"' | od -c | head -1
0000000    a  \t   b  \n
$ /bin/zsh  -c 'echo "a\tb"' | od -c | head -1
0000000    a  \t   b  \n
```

**`sh`로 부르면 `\t`가 탭이 되고, `bash`로 부르면 백슬래시와 `t` 두 글자가 그대로 남습니다.** 같은 실행 파일입니다.

`printf`는 넷 다 같습니다.

```console
$ for s in /bin/sh /bin/bash /bin/dash /bin/zsh; do $s -c 'printf "a\tb\n"' | od -c | head -1; done
0000000    a  \t   b  \n
0000000    a  \t   b  \n
0000000    a  \t   b  \n
0000000    a  \t   b  \n
```

그래서 **이식성이 필요한 스크립트에서는 `echo` 대신 `printf`를 씁니다**(의견). `echo`의 백슬래시·`-n` 처리는 POSIX에서도 구현에 맡겨진 부분입니다.

---

## 4. POSIX에 없는 것 — 무엇이 "bashism"인가

`#!/bin/sh`를 써놓고 bash 확장을 쓰면, macOS에서는 통과하고 dash에서는 죽습니다. 실제로 확인했습니다.

```console
$ for s in /bin/sh /bin/bash /bin/dash /bin/zsh; do
    printf '%-6s -> ' "$(basename $s)"; $s -c '[[ "abc" == a* ]] && echo "지원"' 2>&1 | head -1
  done
sh     -> 지원
bash   -> 지원
dash   -> /bin/dash: 1: [[: not found
zsh    -> 지원
```

**`[[ ]]`는 POSIX에 없습니다.** 이 맥의 `/bin/sh`는 bash라서 통과하지만, `/bin/sh`가 dash인 시스템에서는 `[[: not found`로 죽습니다.

자주 쓰이면서 POSIX `sh`에 없는 것들:

| 문법 | POSIX 대안 |
| --- | --- |
| `[[ ... ]]` | `[ ... ]` (test) |
| 배열 `arr=(...)`, `${arr[@]}` | 위치 인자 `set -- ...`, `"$@"` |
| `declare` / `local` | 규격이 **결과 미정의**로 남긴 이름 — 널리 지원되지만 보장은 없음 |
| `${var^^}`, `${var,,}` | `tr` 등 외부 명령 |
| `source file` | `. file` |
| `function name() {}` | `name() {}` |
| `$'...'` (ANSI-C 인용) | `printf` |

`declare`·`local`·`typeset`은 "규격에 아예 없는 것"과는 다릅니다. 규격이 이 이름들을 표로 나열해 두고 **"the results are unspecified"**라고 못 박은 것이므로, 여러 구현에서 똑같이 동작하더라도 그건 구현끼리의 우연입니다.
— [The Open Group Base Specifications Issue 8, Shell Command Language, 2.9.1.4 Command Search and Execution](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-06)

---

## 5. 실무에서 어디에 걸리는가

데이터 엔지니어가 `sh`를 마주치는 자리는 대개 **본인이 고른 게 아닙니다.**

- **Dockerfile의 `RUN`** — `SHELL` 지시어를 주지 않으면 `/bin/sh -c`로 실행됩니다. 베이스 이미지가 Alpine이면 busybox ash, Debian 계열이면 dash입니다.
- **CI 스텝** — 러너가 어떤 셸로 스텝을 실행하는지는 플랫폼·설정에 따라 다릅니다.
- **`ENTRYPOINT`·`CMD`의 shell form**, cron, `system()` 호출, 각종 도구의 `--exec` 옵션.
- **컨테이너에 bash가 아예 없는 경우** — 슬림 이미지에는 흔합니다.

로컬 맥에서 `sh script.sh`로 테스트하면 **bash가 검사해 주므로 bashism이 걸러지지 않습니다.** 이게 이 문서의 실질적 결론입니다.

---

## 6. 경계 — POSIX sh만으로 버티기 어려운 곳

- **자료구조가 필요한 스크립트.** 배열도 연관 배열도 없습니다. 위치 인자와 문자열 조작으로 흉내 내면 읽기 어려워집니다.
- **문자열 처리가 많은 스크립트.** 대소문자 변환·정규식 매칭 같은 것을 외부 명령으로 빼야 하고, 프로세스 생성 비용이 붙습니다.
- **길어지는 스크립트 전반.** 수백 줄을 넘어가면 이식성보다 유지보수가 문제가 됩니다. 이 지점에서는 Python으로 옮기는 게 낫습니다(의견).
- **정확한 수치 계산.** 정수 산술만 있습니다.

---

## 7. 실패 모드

### (a) 로컬에서는 되는데 컨테이너에서 `not found`

§4의 실행 기록. `[[: not found`, `declare: not found`, `Syntax error: "(" unexpected`(배열) 형태로 나옵니다.
**증상이 문법 오류처럼 보이지 않는 것**이 함정입니다 — 셸이 `[[`를 명령 이름으로 해석해 "그런 명령이 없다"고 말합니다.

### (b) `echo`의 결과가 환경마다 다름

§3의 실행 기록. 로그에 `\t`가 그대로 찍히거나 반대로 탭이 되어, 그 출력을 파싱하는 다음 단계가 조용히 어긋납니다. 오류가 아니라 **값이 달라지는** 형태라 늦게 발견됩니다.

### (c) `#!/bin/sh`인데 bash 문법으로 짬

macOS에서 개발하면 `/bin/sh`가 bash라 끝까지 안 걸립니다. 셔뱅과 실제 사용 문법이 어긋난 채로 커밋됩니다.
**방어**: `#!/bin/bash`를 쓸 거면 명시하고, 진짜 이식성이 필요하면 dash로도 한 번 돌립니다. 이 맥에는 `/bin/dash`가 있으므로 `dash script.sh`로 바로 확인할 수 있습니다.

### (d) 따옴표 없는 변수 확장

`for f in $files`처럼 따옴표 없이 쓰면 공백 기준으로 쪼개집니다. 파일명에 공백이 있으면 한 파일이 두 인자가 됩니다.
셸에 따라 이 동작이 **다르다**는 점까지 겹칩니다 — zsh는 기본적으로 쪼개지 않습니다.

---

## 출처

- POSIX Shell Command Language — [The Open Group Base Specifications Issue 8, IEEE Std 1003.1-2024, Chapter 2](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-06)
- Debian의 `/bin/sh` — [Debian Wiki — Shell](https://wiki.debian.org/Shell) (확인: 2026-09-06)
- macOS `man 1 sh` — 로컬 시스템 매뉴얼 (확인: 2026-09-06)
- 실행 기록 — macOS Darwin 24.6.0 / arm64 / bash 3.2.57 / dash / zsh 5.9, 2026-09-06 직접 실행

---

*작성일: 2026-09-06*
