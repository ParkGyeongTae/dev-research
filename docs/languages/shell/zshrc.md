---
sidebar_position: 7
---

# `.zshrc`란 무엇인가 — 다섯 개의 시작 파일 중 대화형에만 걸리는 것

> **원문** — 로컬 `man zshall` (zsh 5.9, 2022-05-14 판) · macOS 번들 `/etc/zprofile`·`/etc/zshrc`
>
> **확인 날짜** — 2026-09-07. 매뉴얼에는 판번호가 있고(zsh 5.9), 애플이 넣은 전역 시작 파일에는 판번호가 없어 파일 내용을 그대로 옮기고 확인 날짜로 대신합니다.
>
> **검증 상태** — 매뉴얼의 STARTUP/SHUTDOWN FILES 절과 `/etc/zshenv` 관련 경고를 읽고 정리했습니다. 매뉴얼 전문을 통독하지는 않았습니다. 다섯 파일의 로딩 순서·`PATH` 동작은 **격리된 `HOME`/`ZDOTDIR`에서 직접 돌린 결과**이며, 이전 판에서 "Docker 미동작으로 미실행"이던 **리눅스 대조를 이번에 컨테이너로 채웠습니다**(§6).

맥의 기본 로그인 셸이 zsh이 되면서, 예전에 `.bash_profile`에 넣던 것을 그대로 `.zshrc`로 옮긴 경우가 많습니다.
그런데 zsh의 시작 파일은 **다섯 개**이고, 각각 읽히는 조건이 다릅니다.

여기서 잡아야 할 개념은 **각 파일이 "언제" 읽히는가**입니다. `.zshrc`의 조건은 **대화형 여부**이고 로그인 여부가 아닙니다. 이 한 가지에서 실무의 두 문제가 갈라져 나옵니다.

- **`.zshrc`는 대화형 셸에서만 읽힙니다.** 스크립트·cron·CI에서는 읽히지 않습니다(§5).
- **그렇다고 `.zshenv`로 옮기면 이번엔 맥이 `PATH` 순서를 뒤집습니다.** `/etc/zprofile`의 `path_helper`가 로그인 셸에서 끼어들기 때문입니다(§6).

다섯 파일을 각각 돌려서 확인합니다.

## 실행 환경

```
$ sw_vers
ProductName:		macOS
ProductVersion:		15.7.4
BuildVersion:		24G517

$ /bin/zsh --version
zsh 5.9 (arm64-apple-darwin24.0)

$ dscl . -read /Users/$USER UserShell
UserShell: /bin/zsh
```

실험은 실제 홈 디렉터리를 건드리지 않도록 `HOME`과 `ZDOTDIR`을 임시 디렉터리로 바꿔서 했습니다. `env -i`로 환경 변수를 비우므로 이 맥의 개인 설정이 결과에 섞이지 않습니다.

```
$ SB=$(mktemp -d)
$ for f in .zshenv .zprofile .zshrc .zlogin .zlogout; do
>   printf 'echo "  [read] %s"\n' "$f" > "$SB/$f"
> done
```

---

## 1. 무엇인가 — 다섯 파일이 정해진 순서로 돕니다

`.zshrc`는 zsh이 정한 다섯 개의 시작 파일 중 하나입니다. 매뉴얼이 순서를 못 박고 있습니다.

> Commands are first read from `/etc/zshenv`; this cannot be overridden. (…) Commands are then read from `$ZDOTDIR/.zshenv`. If the shell is a login shell, commands are read from `/etc/zprofile` and then `$ZDOTDIR/.zprofile`. Then, if the shell is interactive, commands are read from `/etc/zshrc` and then `$ZDOTDIR/.zshrc`. Finally, if the shell is a login shell, `/etc/zlogin` and `$ZDOTDIR/.zlogin` are read.

> When a login shell exits, the files `$ZDOTDIR/.zlogout` and then `/etc/zlogout` are read.

> If `ZDOTDIR` is unset, `HOME` is used instead.
>
> **번역** — 명령은 먼저 `/etc/zshenv`에서 읽습니다. 이것은 무효화할 수 없습니다. (…) 그다음 `$ZDOTDIR/.zshenv`에서 읽습니다. 셸이 로그인 셸이면 `/etc/zprofile`, 이어서 `$ZDOTDIR/.zprofile`에서 읽습니다. 그다음, 셸이 대화형이면 `/etc/zshrc`, 이어서 `$ZDOTDIR/.zshrc`에서 읽습니다. 마지막으로, 셸이 로그인 셸이면 `/etc/zlogin`과 `$ZDOTDIR/.zlogin`을 읽습니다.
>
> **번역** — 로그인 셸이 끝날 때는 `$ZDOTDIR/.zlogout`, 이어서 `/etc/zlogout`을 읽습니다.
>
> **번역** — `ZDOTDIR`이 설정돼 있지 않으면 `HOME`을 대신 씁니다.
>
> — 로컬 `man zshall` (zsh 5.9, 2022-05-14 판), macOS 15.7.4에서 확인 (2026-09-07)

정리하면 이렇습니다.

| 순서 | 파일 | 읽히는 조건 |
| --- | --- | --- |
| 1 | `/etc/zshenv` → `$ZDOTDIR/.zshenv` | **항상** |
| 2 | `/etc/zprofile` → `$ZDOTDIR/.zprofile` | 로그인 셸일 때 |
| 3 | `/etc/zshrc` → `$ZDOTDIR/.zshrc` | **대화형일 때** |
| 4 | `/etc/zlogin` → `$ZDOTDIR/.zlogin` | 로그인 셸일 때 |
| 5 | `$ZDOTDIR/.zlogout` → `/etc/zlogout` | 로그인 셸이 **끝날 때** |

각 파일이 무엇을 담아야 하는지는 이 표에서 그대로 따라 나옵니다. 조건이 좁을수록 그 파일의 용도도 좁습니다.

## 2. 실측 — 어느 조건에 무엇이 읽히는가

### (a) 대화형 로그인 셸 — 다섯 개가 다 돕니다

```
$ env -i HOME="$SB" ZDOTDIR="$SB" TERM=dumb /bin/zsh -l -i -c 'echo "  -- 본문 실행"'
  [read] .zshenv
  [read] .zprofile
  [read] .zshrc
  [read] .zlogin
  -- 본문 실행
  [read] .zlogout
```

읽히는 순서가 §1의 표와 정확히 같습니다. `.zlogout`이 **본문 뒤에** 찍힌 것을 보십시오 — 종료 시점에 도는 파일입니다.

### (b) 대화형 비로그인 셸

```
$ env -i HOME="$SB" ZDOTDIR="$SB" TERM=dumb /bin/zsh -i -c 'echo "  -- 본문 실행"'
  [read] .zshenv
  [read] .zshrc
  -- 본문 실행
```

로그인 조건이 붙은 셋(`.zprofile`·`.zlogin`·`.zlogout`)이 빠졌습니다.

### (c) 비대화형

```
$ env -i HOME="$SB" ZDOTDIR="$SB" /bin/zsh -c 'echo "  -- 본문 실행"'
  [read] .zshenv
  -- 본문 실행
```

**`.zshrc`가 읽히지 않았습니다.** `.zshenv`만 읽혔습니다. §5가 여기서 나옵니다.

### (d) 스크립트 실행 — (c)와 같습니다

```
$ printf '#!/bin/zsh\necho "  -- 스크립트 본문"\n' > "$SB/t.zsh"; chmod +x "$SB/t.zsh"
$ env -i HOME="$SB" ZDOTDIR="$SB" "$SB/t.zsh"
  [read] .zshenv
  -- 스크립트 본문
```

### (e) `ZDOTDIR`을 안 주면 `HOME`을 씁니다

```
$ env -i HOME="$SB" "$SB/t.zsh"
  [read] .zshenv
  -- 스크립트 본문
```

`ZDOTDIR`을 지웠는데도 같은 파일이 읽혔습니다. 매뉴얼의 "If `ZDOTDIR` is unset, `HOME` is used instead"가 그대로 관측됩니다.

### (f) `--no-rcs`로 전부 끕니다

```
$ env -i HOME="$SB" ZDOTDIR="$SB" TERM=dumb /bin/zsh --no-rcs -l -i -c 'echo "  -- 본문 실행"'
  -- 본문 실행
```

하나도 읽히지 않았습니다. 문제의 원인이 개인 설정인지 아닌지를 가를 때 쓰는 스위치입니다.

## 3. bash와 갈라지는 지점

같은 "rc 파일"이라는 이름 때문에 `.bashrc`의 감각을 그대로 가져오면 틀립니다.

| | bash | zsh |
| --- | --- | --- |
| 대화형 **로그인** 셸이 rc 파일을 읽는가 | **읽지 않습니다** | **읽습니다** |
| 항상 읽히는 개인 파일이 있는가 | 없습니다 | **`.zshenv`가 있습니다** |
| 시작 파일 개수 | 최대 2개(profile 계열 하나 + rc) | 5개 |

첫 줄이 중요합니다. bash에서는 `.bash_profile` 끝에 `. ~/.bashrc`를 넣는 관용구가 거의 필수인데, **zsh에서는 그 줄이 필요 없습니다** — §2(a)에서 봤듯 로그인 셸도 `.zshrc`를 읽기 때문입니다. bash 습관대로 `.zprofile`에서 `.zshrc`를 `source` 하면 **`.zshrc`가 두 번 실행됩니다.**

## 4. 이 맥의 전역 파일

개인 파일보다 먼저 도는 것들입니다. 실제 내용입니다.

```
$ ls /etc/zshenv
ls: /etc/zshenv: No such file or directory

$ cat /etc/zprofile
# System-wide profile for interactive zsh(1) login shells.

# Setup user specific overrides for this in ~/.zprofile. See zshbuiltins(1)
# and zshoptions(1) for more details.

if [ -x /usr/libexec/path_helper ]; then
	eval `/usr/libexec/path_helper -s`
fi
```

이 다섯 줄이 §6 전체의 원인입니다. **애플이 로그인 셸 경로에 `path_helper`를 끼워 넣었습니다.**

`/etc/zshrc`는 더 깁니다. 실무에서 알아 둘 만한 부분만 옮깁니다.

```
$ grep -n 'HISTFILE\|HISTSIZE\|SAVEHIST\|disable log\|COMBINING' /etc/zshrc
8:    setopt COMBINING_CHARS
12:disable log
15:HISTFILE=${ZDOTDIR:-$HOME}/.zsh_history
16:HISTSIZE=2000
17:SAVEHIST=1000
```

**`HISTSIZE`·`SAVEHIST`가 애플의 `/etc/zshrc`에서 정해집니다.** zsh 제품 기본값이 아니라 이 맥의 시스템 설정입니다 — 히스토리가 1000줄에서 잘린다면 원인이 여기 있습니다. §1의 순서상 개인 `.zshrc`가 나중에 돌므로 거기서 덮어쓰면 됩니다.

`/etc/zlogin`·`/etc/zlogout`은 이 맥에 없습니다.

```
$ ls /etc/zlogin /etc/zlogout
ls: /etc/zlogin: No such file or directory
ls: /etc/zlogout: No such file or directory
```

## 5. `.zshrc`에 `PATH`를 넣으면 스크립트가 못 찾습니다

§2(c)가 실제로 어떤 모양인지 봅니다. 도구 하나를 만들고 `PATH`를 `.zshrc`에서 잡았습니다.

```
$ mkdir -p "$SB/mybin"
$ printf '#!/bin/sh\necho "hi from mytool"\n' > "$SB/mybin/mytool"; chmod +x "$SB/mybin/mytool"
$ printf '#!/bin/zsh\nmytool\n' > "$SB/job.zsh"; chmod +x "$SB/job.zsh"
$ printf 'export PATH="$HOME/mybin:$PATH"\n' > "$SB/.zshrc"
```

터미널에서는 잘 됩니다.

```
$ env -i HOME="$SB" ZDOTDIR="$SB" TERM=dumb PATH=/usr/bin:/bin /bin/zsh -i -c 'mytool'
hi from mytool
```

같은 명령을 스크립트로 돌리면 죽습니다.

```
$ env -i HOME="$SB" ZDOTDIR="$SB" PATH=/usr/bin:/bin "$SB/job.zsh"
/…/tmp.uVwmO2yHn6/job.zsh:2: command not found: mytool
```

`.zshenv`로 옮기면 양쪽 다 됩니다. §1의 표에서 `.zshenv`만 "항상"이기 때문입니다.

```
$ mv "$SB/.zshrc" "$SB/.zshenv"
$ env -i HOME="$SB" ZDOTDIR="$SB" TERM=dumb PATH=/usr/bin:/bin /bin/zsh -i -c 'mytool'
hi from mytool
$ env -i HOME="$SB" ZDOTDIR="$SB" PATH=/usr/bin:/bin "$SB/job.zsh"
hi from mytool
```

**증상은 "터미널에서는 되는데 cron/CI/에디터 태스크에서는 `command not found`"입니다.** 원인은 도구 설치가 아니라 시작 파일 선택에 있습니다.

## 6. 그런데 `.zshenv`로 옮기면 `PATH` 순서가 뒤집힙니다

§4에서 본 `/etc/zprofile`이 여기서 걸립니다. **위와 완전히 같은 `.zshenv`로, 로그인 여부만 바꿔서** 돌린 결과입니다.

비로그인 셸:

```
$ env -i HOME="$SB" ZDOTDIR="$SB" TERM=dumb PATH=/usr/bin:/bin /bin/zsh -i -c 'echo $PATH'
/…/tmp.uVwmO2yHn6/mybin:/usr/bin:/bin
```

로그인 셸:

```
$ env -i HOME="$SB" ZDOTDIR="$SB" TERM=dumb PATH=/usr/bin:/bin /bin/zsh -l -i -c 'echo $PATH'
/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/…/tmp.uVwmO2yHn6/mybin
```

**맨 앞에 있던 `mybin`이 맨 뒤로 갔습니다.**

원인은 순서입니다. `.zshenv`(1순위) 다음에 `/etc/zprofile`(2순위)이 돌면서 `path_helper`가 `PATH`를 다시 조립합니다.

```
$ /usr/libexec/path_helper -s | head -1 | cut -c1-95
PATH="/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.a

$ cat /etc/paths
/usr/local/bin
/System/Cryptexes/App/usr/bin
/usr/bin
/bin
/usr/sbin
/sbin
```

`path_helper`는 `/etc/paths`(와 `/etc/paths.d/`)에 적힌 경로를 **앞에** 놓고, 기존 `PATH`에만 있던 항목을 **뒤에** 붙입니다. 그래서 사용자가 앞에 끼워 넣은 경로가 뒤로 밀립니다.

§5와 증상의 성격이 다릅니다. 여기서는 `command not found`가 아니라 **`/usr/bin`의 옛날 것이 먼저 잡힙니다.** 명령은 실행되고 결과만 다릅니다.

### 리눅스에서는 이 일이 일어나지 않습니다

§6이 zsh의 성질인지 macOS의 성질인지가 중요합니다. **완전히 같은 실험을 Debian 컨테이너에서 돌렸습니다.**

```console
$ docker run --rm -v "$SB":/zl debian:trixie-slim sh -c '
    apt-get update >/dev/null 2>&1; apt-get install -y zsh >/dev/null 2>&1
    printf "비로그인 : "; env -i HOME=/zl ZDOTDIR=/zl TERM=dumb PATH=/usr/bin:/bin zsh -i  -c "echo \$PATH" | tail -1
    printf "로그인   : "; env -i HOME=/zl ZDOTDIR=/zl TERM=dumb PATH=/usr/bin:/bin zsh -l -i -c "echo \$PATH" | tail -1'
비로그인 : /zl/mybin:/usr/bin:/bin
로그인   : /zl/mybin:/usr/bin:/bin
```

**리눅스에서는 로그인 셸에서도 `mybin`이 맨 앞에 그대로 있습니다.** 맥에서는 맨 뒤로 밀렸던 그 실험입니다.

원인은 `path_helper`가 없다는 것입니다.

```console
$ docker run --rm debian:trixie-slim sh -c 'ls -l /usr/libexec/path_helper'
ls: cannot access '/usr/libexec/path_helper': No such file or directory
```

전역 시작 파일의 위치도 다릅니다.

```console
$ docker run --rm debian:trixie-slim sh -c 'apt-get update >/dev/null 2>&1; apt-get install -y zsh >/dev/null 2>&1; zsh --version; ls -l /etc/zshenv /etc/zsh/zshenv /etc/zsh/zprofile /etc/zsh/zshrc 2>&1'
zsh 5.9 (aarch64-unknown-linux-gnu)
ls: cannot access '/etc/zshenv': No such file or directory
-rw-r--r-- 1 root root  264 Sep  7  2023 /etc/zsh/zprofile
-rw-r--r-- 1 root root  623 Sep  7  2023 /etc/zsh/zshenv
-rw-r--r-- 1 root root 3900 Jan  9  2024 /etc/zsh/zshrc
```

**같은 zsh 5.9인데 전역 파일이 `/etc/zsh/` 아래 있습니다.** 맥은 `/etc/zprofile`·`/etc/zshrc`로 `/etc` 바로 아래입니다. 파일 **순서**(§1)는 zsh의 성질이라 양쪽이 같지만, **어느 경로에서 읽는가와 그 안에 무엇이 들어 있는가**는 배포판이 정합니다.

그리고 파일 순서 자체는 리눅스에서도 그대로였습니다.

```console
$ docker run --rm -v "$SB":/zl debian:trixie-slim sh -c '… env -i HOME=/zl ZDOTDIR=/zl TERM=dumb zsh -l -i -c "echo \"  -- 본문\""'
  [read] .zshenv
  [read] .zprofile
  [read] .zshrc
  [read] .zlogin
  -- 본문
  [read] .zlogout
```

즉 **§1~§3은 zsh의 성질이고, §4·§6은 macOS의 성질입니다.** 이 구분을 놓치면 리눅스 서버에서 있지도 않은 `path_helper` 문제를 찾게 됩니다.

### 셋 다 무언가를 포기합니다

§5와 §6을 합치면 맥에서 `PATH`가 놓이는 구도가 이렇습니다. (의견 포함)

| 어디에 쓰는가 | 스크립트에서 보이는가 | 로그인 시 `path_helper`에 밀리는가 |
| --- | --- | --- |
| `.zshrc` | **안 보임** | 안 밀림 (`path_helper`보다 나중) |
| `.zshenv` | 보임 | **밀림** |
| `.zprofile` | 안 보임 | 안 밀림 (`/etc/zprofile` 다음) |

실무에서 쓸 만한 절충은 **`.zshenv`에 쓰되 대입이 아니라 "앞에 붙이기"로 쓰고, 순서에 민감한 도구는 절대 경로로 부르는 것**이라고 봅니다. 순서를 확실히 잡아야 한다면 `.zprofile`(로그인 셸 기준, `path_helper` 이후)에 쓰는 방법도 있지만, 그러면 §5의 스크립트 문제로 되돌아갑니다.

## 7. `.zshenv`는 가볍게 유지합니다

`.zshenv`가 유일하게 "항상" 읽힌다는 성질에는 대가가 붙습니다. **스크립트 한 줄을 돌릴 때도 읽힙니다.** 매뉴얼이 이 점을 직접 경고합니다.

> As `/etc/zshenv` is run for all instances of zsh, it is important that it be kept as small as possible. In particular, it is a good idea to put code that does not need to be run for every single shell behind a test of the form `if [[ -o rcs ]]; then ...` so that it will not be executed when zsh is invoked with the `-f' option.
>
> **번역** — `/etc/zshenv`는 zsh의 모든 인스턴스에서 실행되므로, 가능한 한 작게 유지하는 것이 중요합니다. 특히, 모든 셸마다 실행될 필요가 없는 코드는 `if [[ -o rcs ]]; then ...` 형태의 검사 뒤에 두어, zsh가 `-f` 옵션과 함께 호출될 때는 실행되지 않게 하는 것이 좋습니다.
>
> — 로컬 `man zshall` (zsh 5.9), 2026-09-07 확인

경고 대상은 `/etc/zshenv`지만 이유는 `~/.zshenv`에도 그대로 적용됩니다. 여기에 버전 매니저 초기화나 자동완성 로딩을 넣으면 **zsh을 호출하는 모든 스크립트가 그만큼 느려집니다.** 반복문 안에서 `zsh -c`를 부르는 파이프라인이라면 누적됩니다.

**이 비용은 이 문서에서 측정하지 않았습니다**(§9).

## 8. 그래서 무엇을 어디에 두는가

§1의 조건표와 §2의 실측에서 따라 나오는 판단입니다. (사실이 아니라 의견입니다.)

| 넣을 것 | 어디에 | 왜 |
| --- | --- | --- |
| alias, 함수, 프롬프트, 자동완성, 키 바인딩 | `.zshrc` | 대화형에서만 의미가 있고, 상속되지 않습니다 |
| 스크립트도 알아야 하는 환경 변수 (`PATH`, `LANG`, 툴 홈) | `.zshenv` | 유일하게 항상 읽힙니다. **단 §6의 `PATH` 순서와 §7의 비용을 감수해야 합니다** |
| 로그인 시 한 번만 할 일 (에이전트 기동, 접속 로그) | `.zprofile` | 대화형 셸이 여러 개 떠도 한 번만 돕니다 |
| 로그아웃 정리 | `.zlogout` | 로그인 셸 종료 시점 |
| `.zlogin` | 거의 안 씁니다 | `.zshrc` 뒤에 도는 것 말고는 `.zprofile`과 차이가 적습니다 |

### 이 문서가 그대로 적용되지 않는 자리

- **리눅스 서버.** §4·§6은 애플이 넣은 `/etc/zprofile`과 `path_helper`에 전적으로 의존합니다. §6의 리눅스 대조에서 확인했듯 `path_helper`는 macOS 전용이라 **리눅스에서는 `PATH` 뒤집힘이 일어나지 않고**, 전역 파일도 `/etc/zsh/` 아래에 있습니다. §1~§3(파일 순서)만 공통입니다.
- **터미널 앱 설정에 따라 로그인 셸 여부가 갈립니다.** 어떤 터미널은 새 탭을 로그인 셸로, 어떤 것은 비로그인으로 띄웁니다. 그래서 §2(a)와 §2(b) 중 어느 쪽인지가 사람마다 다르고, "내 맥에서는 되는데"가 나옵니다. 판별은 `[[ -o login ]] && echo login || echo non-login`으로 합니다.
- **프레임워크를 쓰고 있다면 `.zshrc`의 통제권이 나눠집니다.** Oh My Zsh 같은 것을 설치하면 `.zshrc`가 템플릿으로 교체되고, 그 안에서 다시 다른 파일들을 `source` 합니다. 이 문서의 실측은 프레임워크가 없는 상태(`env -i` + 빈 임시 홈)에서 나온 것이라 그 층은 포함하지 않습니다.
- **배치 파이프라인의 재현성 문제.** `.zshrc`를 튜닝해서 얻을 수 있는 것은 대화형 경험뿐입니다. 스크립트는 애초에 이 파일을 읽지 않습니다(§2c).

## 확인하지 못한 것

- **`.zshenv`가 유발하는 실제 지연 시간.** §7. 측정하지 않았습니다. **미실행.**
- **리눅스 대조는 배포판 하나에서만 했습니다.** §6의 리눅스 결과는 `debian:trixie-slim`에 `apt-get install zsh`로 넣은 zsh 5.9 하나에서 나왔습니다. 다른 배포판이 `/etc/zsh/` 아래에 무엇을 넣는지, `path_helper`에 해당하는 장치를 두는지는 확인하지 않았습니다.
- **`/etc/zsh/zshenv`·`zprofile`·`zshrc`의 내용.** §6에서 파일이 존재한다는 것과 크기만 확인했고, 안에 무엇이 들어 있는지는 열어 보지 않았습니다. **확인 필요.**
- **zsh 5.9 이후 판.** 이 문서의 실행 기록은 맥의 5.9(매뉴얼 2022-05-14 판)와 Debian의 5.9에서 나왔습니다. 상위 판에서 이 절이 바뀌었는지는 대조하지 않았습니다. **확인 필요.**
- **`GLOBAL_RCS`를 꺼서 `path_helper`를 피하는 방법.** 매뉴얼에 `unsetopt GLOBAL_RCS`로 전역 파일을 건너뛸 수 있다고 돼 있으나, 그렇게 하면 `/etc/zshrc`의 히스토리 설정 등도 함께 사라집니다. 부작용 범위를 다 확인하지 못해 §6의 대안으로 제시하지 않았습니다. **확인 필요.**
- **터미널 앱이 새 탭을 로그인 셸로 띄우는지.** §8에서 "앱마다 다르다"고 적었으나 이 맥의 터미널 앱들로 확인하지 않았습니다. **미실행.**

---

*작성일: 2026-09-07*
