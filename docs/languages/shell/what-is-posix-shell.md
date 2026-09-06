---
sidebar_position: 2
---

# sh란 무엇인가 — 이식성의 기준선

`#!/bin/sh`라고 쓰면 무엇이 실행될까요. **정해져 있지 않습니다.**
`sh`는 프로그램 이름이 아니라 **규격 이름**이고, 그 규격을 만족하는 서로 다른 프로그램이 시스템마다 다르게 걸려 있습니다.
이 한 가지를 잡으면 "로컬에서 잘 돌던 스크립트가 컨테이너에서 깨지는" 사고의 상당수가 설명됩니다.

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

## 1. sh는 프로그램이 아니라 규격입니다

`sh`의 정의는 POSIX에 있습니다.

> The shell is a command language interpreter. This chapter describes the syntax of that command language as it is used by the `sh` utility and the `system()` and `popen()` functions defined in the System Interfaces volume of POSIX.1-2024.
>
> — [The Open Group Base Specifications Issue 8, IEEE Std 1003.1-2024, Chapter 2: Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-06)

인용문이 정의하는 것은 **명령 언어의 문법**이지 특정 프로그램이 아닙니다. 즉 **`sh`는 "이 규격대로 동작하는 명령 해석기"라는 자리 이름**이고, 그 자리를 채우는 실제 프로그램은 시스템이 고릅니다.

bash도, dash도, ksh도, zsh도 `sh`로 불릴 수 있습니다. **그리고 각자 규격 위에 얹은 확장이 다릅니다.** 이 두 문장 사이의 간격이 이 문서 나머지 전부입니다 — 규격이 보장하는 것은 겹치는 부분뿐인데, 개발하는 사람은 자기 시스템에 걸린 구현체 하나만 봅니다.

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

여기서 나오는 실무적 결론이 하나 있습니다. **로컬 맥에서 `sh script.sh`로 테스트하면 bash가 검사해 주므로 이식성 검사가 되지 않습니다.** 이 맥에는 `/bin/dash`가 설치돼 있으므로, 진짜로 확인하려면 `dash script.sh`를 돌려야 합니다.

---

## 3. "sh 모드"는 이름표가 아니라 동작입니다

앞 절이 "무엇이 실행되는가"였다면, 여기는 "실행된 것이 어떻게 동작하는가"입니다. **같은 bash 바이너리라도 `sh`라는 이름으로 불리면 다르게 동작합니다.**

```console
$ cat /tmp/who.sh
echo "\$0=$0  BASH_VERSION=$BASH_VERSION  posix옵션=$(set -o | grep -w posix)"

$ /bin/sh /tmp/who.sh
$0=/tmp/who.sh  BASH_VERSION=3.2.57(1)-release  posix옵션=posix          	on

$ /bin/bash /tmp/who.sh
$0=/tmp/who.sh  BASH_VERSION=3.2.57(1)-release  posix옵션=posix          	off
```

**같은 3.2.57인데 `posix` 옵션이 하나는 on, 하나는 off입니다.**

이게 관찰 가능한 값의 차이로 나타나는 예가 `echo`입니다.

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

이 차이가 데이터에 그대로 실린다는 점이 중요합니다. `echo`로 TSV를 만들면 어느 셸이 읽었느냐에 따라 **탭 구분 파일**이 나오기도 하고 **`\t` 두 글자가 든 파일**이 나오기도 합니다. 오류가 아니라 값이 달라지는 형태라, 그 출력을 파싱하는 다음 단계가 조용히 어긋나고 한참 뒤에 발견됩니다.

`printf`는 넷 다 같습니다.

```console
$ for s in /bin/sh /bin/bash /bin/dash /bin/zsh; do $s -c 'printf "a\tb\n"' | od -c | head -1; done
0000000    a  \t   b  \n
0000000    a  \t   b  \n
0000000    a  \t   b  \n
0000000    a  \t   b  \n
```

그래서 **이식성이 필요한 스크립트에서는 `echo` 대신 `printf`를 씁니다**(의견). `echo`의 백슬래시·`-n` 처리는 POSIX에서도 구현에 맡겨진 부분이기 때문입니다.

---

## 4. 무엇이 "bashism"인가

§1에서 규격이 보장하는 것은 겹치는 부분뿐이라고 했습니다. 그 바깥이 bashism입니다. `#!/bin/sh`를 써놓고 여기 손대면, macOS에서는 통과하고 dash에서는 죽습니다.

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

자주 쓰이면서 POSIX `sh`에 없는 것들과 대안입니다.

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

### 규격 안에 있어도 셸마다 다른 것 하나

bashism만 조심하면 되는 게 아닙니다. **따옴표 없는 변수 확장**은 POSIX 문법이지만 셸마다 결과가 갈립니다.

`for f in $files`처럼 따옴표 없이 쓰면 bash·dash·`/bin/sh`는 공백 기준으로 쪼개고(단어 분리), **zsh는 기본적으로 쪼개지 않습니다.** 그래서 목록 순회가 zsh에서는 한 번만 돕니다. 반대로 파일명에 공백이 있으면 bash 계열에서 한 파일이 두 인자가 됩니다.

즉 규격 문법을 썼다고 안전한 게 아니라, **규격이 "어떻게 하라"고 정해 둔 부분만** 안전합니다.

---

## 5. 실무에서 어디에 걸리는가

데이터 엔지니어가 `sh`를 마주치는 자리는 대개 **본인이 고른 게 아닙니다.**

- **Dockerfile의 `RUN`** — `SHELL` 지시어를 주지 않으면 `/bin/sh -c`로 실행됩니다. 베이스 이미지가 Alpine이면 busybox ash, Debian 계열이면 dash입니다.
- **CI 스텝** — 러너가 어떤 셸로 스텝을 실행하는지는 플랫폼·설정에 따라 다릅니다.
- **`ENTRYPOINT`·`CMD`의 shell form**, cron, `system()` 호출, 각종 도구의 `--exec` 옵션.
- **컨테이너에 bash가 아예 없는 경우** — 슬림 이미지에는 흔합니다.

그래서 셔뱅과 실제 사용 문법이 어긋난 채로 커밋되기 쉽습니다. macOS에서 개발하면 §2 때문에 끝까지 안 걸리기 때문입니다. `#!/bin/bash`를 쓸 거면 명시하고, 진짜 이식성이 필요하면 `dash script.sh`로 한 번 돌립니다.

### 어디까지 POSIX sh로 버틸 것인가

이식성에는 값이 붙습니다. §4의 표를 뒤집어 보면 POSIX `sh`만으로 짤 때 포기하는 것이 보입니다.

**배열도 연관 배열도 없어서** 자료구조가 필요한 로직은 위치 인자와 문자열 조작으로 흉내 내야 하고, 그 순간 읽기 어려워집니다. **대소문자 변환·정규식 매칭 같은 문자열 처리**는 외부 명령으로 빠지므로 프로세스 생성 비용이 붙습니다. **산술은 정수뿐**입니다.

그래서 스크립트가 수백 줄을 넘어가면 이식성보다 유지보수가 먼저 문제가 됩니다. 그 지점에서는 셔뱅을 `#!/bin/bash`로 바꾸거나 Python으로 옮기는 게 낫습니다(의견).

---

*작성일: 2026-09-06*
