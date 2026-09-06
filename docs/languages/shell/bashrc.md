---
sidebar_position: 4
---

# `.bashrc`란 무엇인가 — 셸의 종류가 읽는 파일을 결정합니다

`.bashrc`에 대한 가장 흔한 오해는 이것입니다. **"셸을 켜면 읽히는 파일."**

아닙니다. bash가 `~/.bashrc`를 읽는 조건은 **"대화형이면서 로그인 셸이 아닐 때"** 하나뿐입니다.
그래서 SSH로 접속하거나 `bash --login`으로 띄우면 `.bashrc`는 **읽히지 않습니다.**

여기서 잡아야 할 개념은 파일 이름이 아니라 **bash가 셸을 세 종류로 나눈다**는 것입니다 — 로그인이냐 아니냐, 대화형이냐 아니냐. 이 두 축이 읽는 파일을 결정하고, 그 조합을 모르면 "터미널에서는 되는데 SSH에서는 안 된다" 같은 증상의 원인을 짚을 수 없습니다.
이 문서는 세 갈래를 **각각 돌려서** 확인합니다.

## 실행 환경

```
$ sw_vers
ProductName:		macOS
ProductVersion:		15.7.4
BuildVersion:		24G517

$ /bin/bash --version | head -1
GNU bash, version 3.2.57(1)-release (arm64-apple-darwin24)
```

맥에 기본 설치된 bash는 3.2입니다. 시작 파일 규칙은 **bash 5.3에서도 같습니다** — 두 판의 매뉴얼을 대조해 확인했습니다(§2).

실험은 실제 홈 디렉터리를 건드리지 않기 위해 `HOME`을 임시 디렉터리로 바꿔서 했습니다.

```
$ SB=$(mktemp -d)
$ for f in .bash_profile .bash_login .profile .bashrc; do
>   printf 'echo "  [read] %s"\n' "$f" > "$SB/$f"
> done
```

`env -i`로 환경 변수를 전부 비운 뒤 실행하므로, 이 맥의 개인 설정이 결과에 섞이지 않습니다.

---

## 1. 무엇인가 — 규격이 아니라 bash의 관례입니다

`.bashrc`라는 이름은 어떤 표준에도 없습니다. POSIX가 대화형 셸의 시작 파일에 대해 정하는 것은 `ENV` 환경 변수 하나뿐입니다.

> This variable, when and only when an interactive shell is invoked, shall be subjected to parameter expansion by the shell, and the resulting value shall be used as a pathname of a file containing shell commands to execute in the current environment.

— [The Open Group Base Specifications Issue 8 / IEEE Std 1003.1-2024, `sh`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html) (확인: 2026-09-06)

`~/.bashrc`·`~/.bash_profile`은 **bash가 자기 재량으로 정한 파일 이름**입니다. 그래서 "셸 설정 파일"이라는 일반론으로 다룰 수 없고, **bash 매뉴얼이 유일한 기준**입니다. 다른 셸의 설명을 가져와 적용하면 틀립니다.

## 2. 규칙 — 매뉴얼이 정한 것

bash 3.2 man page(이 맥, `man bash`)의 INVOCATION 절이 규칙 전부를 담고 있습니다.

> When **bash** is invoked as an interactive login shell, or as a non-interactive shell with the **--login** option, it first reads and executes commands from the file `/etc/profile`, if that file exists. After reading that file, it looks for `~/.bash_profile`, `~/.bash_login`, and `~/.profile`, in that order, and reads and executes commands from **the first one that exists and is readable**.

> When an interactive shell that is not a login shell is started, **bash** reads and executes commands from `~/.bashrc`, if that file exists.

> When **bash** is started non-interactively, to run a shell script, for example, it looks for the variable **BASH_ENV** in the environment (…)

— 로컬 `man bash` (GNU Bash-3.2, 2006-09-28 판), macOS 15.7.4에서 확인 (2026-09-06)

세 문단이 각각 앞서 말한 세 갈래에 대응합니다. 그리고 **bash 5.3 매뉴얼에서도 같은 규칙입니다.** 현행 매뉴얼(2025-04-07 판)의 같은 절을 대조했고, 파일 이름·순서·조건이 모두 동일했습니다.
— [Chet Ramey, BASH(1) manual page (2025 April 7)](https://tiswww.case.edu/php/chet/bash/bash.html) (확인: 2026-09-06)

즉 **이 규칙은 20년 가까이 바뀌지 않았습니다.** 겪는 문제를 버전 차이로 설명할 수 없다는 뜻입니다.

## 3. 실측 — 어느 파일이 실제로 읽히는가

각 파일에 자기 이름을 찍는 `echo` 한 줄만 넣고 세 갈래를 돌렸습니다.

### (a) 대화형 로그인 셸

```
$ env -i HOME="$SB" TERM=dumb /bin/bash -l -i -c 'echo "  -- 본문 실행"'
bash: no job control in this shell
  [read] .bash_profile
  -- 본문 실행
```

**`.bashrc`가 읽히지 않았습니다.** `.bash_profile`만 읽혔습니다.

### (b) 대화형 비로그인 셸

```
$ env -i HOME="$SB" TERM=dumb /bin/bash -i -c 'echo "  -- 본문 실행"'
bash: no job control in this shell
  [read] .bashrc
  -- 본문 실행
```

이번엔 반대입니다. `.bashrc`만 읽히고 `.bash_profile`은 읽히지 않았습니다. **둘은 겹치지 않습니다.**

### (c) 비대화형 (스크립트 실행)

```
$ env -i HOME="$SB" /bin/bash -c 'echo "  -- 본문 실행"'
  -- 본문 실행
```

**아무 파일도 읽히지 않았습니다.**

이 결과가 실무에서 가장 자주 사람을 붙잡습니다. cron·CI·`ssh host '명령'`은 전부 이 갈래이고, 그래서 `.bashrc`에 `export PATH=...`를 넣어 두고 대화형 터미널에서만 검증하면 **cron에서 `command not found`가 납니다.** 파일이 잘못된 게 아니라 애초에 읽히지 않은 것입니다.

`BASH_ENV`를 주면 그때만 읽습니다.

```
$ env -i HOME="$SB" BASH_ENV="$SB/.bashrc" /bin/bash -c 'echo "  -- 본문 실행"'
  [read] .bashrc
  -- 본문 실행
```

다만 이걸 해결책으로 쓰는 것은 권하지 않습니다(의견). `BASH_ENV`를 걸면 **모든 비대화형 bash가 그 파일을 읽게 되어** 스크립트 실행이 느려지고 예상 못 한 부작용이 생깁니다. 고치는 방향은 **파일을 옮기는 것이 아니라 의존을 없애는 것**입니다 — 스크립트 안에서 절대 경로를 쓰거나, PATH를 스크립트 자신이 설정하게 합니다.

### 정리

| 셸의 종류 | 읽는 파일 | 대표적인 상황 |
| --- | --- | --- |
| 대화형 · 로그인 | `/etc/profile` → `~/.bash_profile` \| `~/.bash_login` \| `~/.profile` 중 **첫 하나** | `ssh host`, `bash -l`, 콘솔 로그인 |
| 대화형 · 비로그인 | `~/.bashrc` | 터미널 창 추가로 열기, `bash` 입력 |
| 비대화형 | **없음** (`BASH_ENV`가 있으면 그것만) | 스크립트 실행, cron, `ssh host '명령'` |

## 4. 로그인 쪽 파일은 셋 중 하나만 읽힙니다

매뉴얼의 "the first one that exists and is readable"를 실측으로 확인했습니다. 앞의 파일을 하나씩 치우면서 로그인 셸을 띄웠습니다.

```
$ env -i HOME="$SB" TERM=dumb /bin/bash -l -i -c ':' 2>&1 | grep read
  [read] .bash_profile

$ mv "$SB/.bash_profile" "$SB/x1"
$ env -i HOME="$SB" TERM=dumb /bin/bash -l -i -c ':' 2>&1 | grep read
  [read] .bash_login

$ mv "$SB/.bash_login" "$SB/x2"
$ env -i HOME="$SB" TERM=dumb /bin/bash -l -i -c ':' 2>&1 | grep read
  [read] .profile
```

**셋이 다 있어도 하나만 읽습니다.** 합쳐서 읽지 않습니다.

여기서 조용한 사고가 하나 나옵니다. `~/.profile`에 설정을 넣어 두고 잘 쓰다가, 어떤 설치 스크립트가 `~/.bash_profile`을 만들어 버리면 **`~/.profile`이 그 순간부터 통째로 무시됩니다.** 오류는 나지 않습니다. 파일도 그대로 있습니다. 읽히지만 않습니다.

## 5. 두 세계를 잇는 한 줄

§3(a)와 §3(b)가 겹치지 않는다는 사실이 실제로 어떤 모양으로 나타나는지 봅니다. `.bashrc`에 alias를 넣고 로그인 셸로 들어간 경우입니다.

```
$ printf 'alias ll="ls -l"\necho "  [read] .bashrc"\n' > "$SB/.bashrc"
$ printf 'echo "  [read] .bash_profile"\n' > "$SB/.bash_profile"

$ env -i HOME="$SB" TERM=dumb /bin/bash -l -i -c 'alias ll'
bash: no job control in this shell
  [read] .bash_profile
bash: alias: ll: not found
```

증상은 **"SSH로 들어가면 내 alias가 없다"**, "터미널에서는 되는데 원격에서는 안 된다"로 나타납니다.

`.bash_profile` 끝에 한 줄을 더하면 해결됩니다.

```
$ printf 'echo "  [read] .bash_profile"\n[ -r ~/.bashrc ] && . ~/.bashrc\n' > "$SB/.bash_profile"

$ env -i HOME="$SB" TERM=dumb /bin/bash -l -i -c 'alias ll'
bash: no job control in this shell
  [read] .bash_profile
  [read] .bashrc
alias ll='ls -l'
```

많은 사람의 `.bash_profile` 맨 끝에 `. ~/.bashrc` 한 줄이 붙어 있는 이유가 이것입니다 — bash가 갈라 놓은 두 세계를 손으로 다시 이어 붙이는 것입니다.

## 6. `sh`라는 이름으로 불릴 때는 규칙이 다릅니다

bash는 자기 이름이 `sh`이면 다르게 행동합니다.

> If **bash** is invoked with the name **sh**, it tries to mimic the startup behavior of historical versions of **sh** as closely as possible (…) When invoked as an interactive shell with the name **sh**, **bash** looks for the variable **ENV** (…) Since a shell invoked as **sh** does not attempt to read and execute commands from any other startup files, the **--rcfile** option has no effect. (…) When invoked as **sh**, **bash** enters posix mode after the startup files are read.

— 로컬 `man bash` (GNU Bash-3.2), 2026-09-06 확인

실측입니다.

```
$ ln -s /bin/bash "$SB/sh"
$ env -i HOME="$SB" TERM=dumb "$SB/sh" -i -c 'echo "  -- 본문 실행"'
sh: no job control in this shell
  -- 본문 실행
```

`.bashrc`가 있는데도 읽지 않았습니다. `ENV`를 주면 그때만 읽습니다 — §1에서 본 POSIX 규정 그대로입니다.

```
$ env -i HOME="$SB" TERM=dumb ENV="$SB/.profile" "$SB/sh" -i -c ':'
sh: no job control in this shell
  [read] .profile
```

**이 맥에서 `/bin/sh`가 바로 그 상황입니다.**

```
$ ls -l /private/var/select/sh
lrwxr-xr-x  1 root  wheel  9  2  1  2026 /private/var/select/sh -> /bin/bash

$ /bin/sh -c 'echo "BASH_VERSION=[$BASH_VERSION]"'
BASH_VERSION=[3.2.57(1)-release]
```

`/bin/sh`는 bash 3.2가 `sh` 이름으로 도는 것이고, 따라서 **`#!/bin/sh` 스크립트는 `.bashrc`와 아무 상관이 없습니다.** 셸의 종류(§3)에 이름이라는 축이 하나 더 붙는 셈입니다.

## 7. 이 맥의 전역 파일

개인 파일보다 먼저 도는 것이 있습니다. 내용을 그대로 확인했습니다.

```
$ cat /etc/profile
# System-wide .profile for sh(1)

if [ -x /usr/libexec/path_helper ]; then
	eval `/usr/libexec/path_helper -s`
fi

if [ "${BASH-no}" != "no" ]; then
	[ -r /etc/bashrc ] && . /etc/bashrc
fi
```

```
$ cat /etc/bashrc
# System-wide .bashrc file for interactive bash(1) shells.
if [ -z "$PS1" ]; then
   return
fi

PS1='\h:\W \u\$ '
# Make bash check its window size after a process completes
shopt -s checkwinsize

[ -r "/etc/bashrc_$TERM_PROGRAM" ] && . "/etc/bashrc_$TERM_PROGRAM"
```

두 가지를 짚어 둡니다.

- **`/etc/bashrc`는 bash가 자동으로 읽는 파일이 아닙니다.** 이름이 `bashrc`라서 §3(b)에 걸릴 것 같지만, 실제로는 `/etc/profile`이 명시적으로 `source` 하기 때문에 읽히는 것입니다. 즉 **로그인 셸 경로에서만** 걸립니다.
- 맨 앞의 `if [ -z "$PS1" ]; then return; fi`가 **비대화형이면 즉시 반환**하는 관용구입니다. 개인 `.bashrc`에서도 흔히 쓰이는 패턴이고, 다음 절이 그 이유를 설명합니다.

`/etc/bash.bashrc`는 이 맥에 **없습니다**(리눅스 배포판 쪽 관례입니다).

## 8. `.bashrc`에서 표준 출력에 찍지 않습니다

앞 절의 `if [ -z "$PS1" ]; then return; fi` 관용구가 왜 있는지 봅니다.

`.bashrc`에 `echo`·배너·`fortune` 같은 **표준 출력에 무언가를 찍는 코드**가 있으면, 그 출력이 원격 명령의 데이터 스트림에 섞여 `scp`·`sftp`·`rsync`가 실패할 수 있습니다. bash 매뉴얼이 원격 실행 시 `.bashrc`를 읽는 경로를 따로 정의해 두고 있기 때문입니다.

> Bash attempts to determine when it is being run by the remote shell daemon, usually **rshd**. If **bash** determines it is being run by **rshd**, it reads and executes commands from `~/.bashrc`, if that file exists and is readable. It will not do this if invoked as **sh**.

— 로컬 `man bash` (GNU Bash-3.2), 2026-09-06 확인

**이 시나리오는 재현하지 못했습니다**(§10). SSH 서버가 필요한 실험이라 이 머신에서 돌리지 못했습니다. 위 문장은 매뉴얼에서 읽은 것이고, 실제로 `sshd` 경유에서 어떻게 동작하는지는 빌드 옵션과 배포판에 따라 갈립니다. **확인 필요.**

다만 대응은 조건과 무관하게 유효합니다 — **`.bashrc`에서 표준 출력에 아무것도 찍지 않는 것**입니다. 꼭 찍어야 하면 `$PS1` 검사로 대화형일 때만으로 한정합니다. 맥의 `/etc/bashrc`가 그렇게 하고 있습니다.

## 9. 그래서 무엇을 어디에 두는가

실측(§3)에서 바로 따라 나오는 결론입니다. 이건 사실이 아니라 **판단**입니다.

| 넣을 것 | 어디에 | 왜 |
| --- | --- | --- |
| `PATH`, `EDITOR`, 언어·툴 환경 변수 | `~/.bash_profile` | 로그인 시 한 번 설정되고 자식 프로세스에 상속됩니다 |
| alias, 셸 함수, 프롬프트, 자동완성 | `~/.bashrc` | 상속되지 않으므로 셸마다 다시 정의돼야 합니다 |
| `~/.bash_profile` 맨 끝 | `[ -r ~/.bashrc ] && . ~/.bashrc` | §5. 로그인 셸에서도 대화형 설정이 살아 있게 만듭니다 |

핵심 구분은 **상속되는가**입니다. 환경 변수는 `export` 하면 자식이 물려받으므로 로그인 때 한 번이면 충분합니다. alias·함수는 물려받지 않으므로 셸이 뜰 때마다 다시 정의돼야 합니다.

### 이 문서가 적용되지 않는 자리

- **맥의 기본 로그인 셸은 zsh입니다.**

  ```
  $ dscl . -read /Users/$USER UserShell
  UserShell: /bin/zsh
  ```

  터미널을 열어 나오는 셸이 bash가 아니라면 `.bashrc`는 아무 영향도 주지 않습니다 — 파일을 아무리 고쳐도 변화가 없는 것이 정상입니다.
- **`#!/bin/sh` 스크립트.** §6에서 봤듯 `sh` 이름으로 도는 bash는 `.bashrc`를 읽지 않습니다.
- **컨테이너 안.** `docker run` 기본 실행도 `RUN` 명령도 §3(c)의 비대화형입니다. 이미지 안에서 PATH를 잡고 싶으면 Dockerfile의 `ENV`를 쓰는 것이 맞습니다.
- **파일의 *내용*은 버전을 탑니다.** 시작 파일 규칙은 3.2와 5.3이 같지만(§2), `.bashrc`에 연관 배열(`declare -A`)이나 `${var^^}` 같은 4.0 이후 문법을 넣으면 맥의 `/bin/bash`에서 문법 오류가 납니다.

## 10. 확인하지 못한 것

- **`sshd` 경유 비대화형 실행에서 `.bashrc`가 읽히는지.** §8. SSH 서버 실험을 하지 못했습니다. **미실행.**
- **리눅스 배포판의 기본 `~/.bashrc`·`/etc/bash.bashrc` 내용.** 이 문서의 전역 파일 확인(§7)은 macOS 15.7.4 것뿐입니다. Debian 계열의 `skel` 파일은 원문을 받아보지 못했습니다(요청한 두 URL이 각각 503·404). **확인 필요.**
- **bash 4.x·5.0~5.2 매뉴얼.** 3.2와 5.3 두 지점만 대조했습니다. 그 사이 판에서 규칙이 잠깐 달랐던 적이 있는지는 확인하지 않았습니다. **추측: 동일했을 것입니다** — 두 끝점이 같고 이 영역은 호환성 민감도가 높습니다.

---

*작성일: 2026-09-06*
