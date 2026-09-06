---
sidebar_position: 7
---

# `.zshrc`란 무엇인가 — PATH를 여기 넣으면 스크립트가 못 찾습니다

맥의 기본 로그인 셸이 zsh이 되면서, 예전에 `.bash_profile`에 넣던 것을 그대로 `.zshrc`로 옮긴 경우가 많습니다.
그런데 zsh의 시작 파일은 **다섯 개**이고, 각각 읽히는 조건이 다릅니다. 그래서 두 가지가 자주 어긋납니다.

- **`.zshrc`는 대화형 셸에서만 읽힙니다.** 스크립트·cron·CI에서는 읽히지 않습니다.
- **그렇다고 `.zshenv`로 옮기면 이번엔 맥이 `PATH` 순서를 뒤집습니다.** `/etc/zprofile`의 `path_helper`가 로그인 셸에서 끼어들기 때문입니다. **이건 이 문서에서 실제로 재현했습니다(§6).**

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

— 로컬 `man zshall` (zsh 5.9, 2022-05-14 판), macOS 15.7.4에서 확인 (2026-09-06)

정리하면 이렇습니다.

| 순서 | 파일 | 읽히는 조건 |
| --- | --- | --- |
| 1 | `/etc/zshenv` → `$ZDOTDIR/.zshenv` | **항상** |
| 2 | `/etc/zprofile` → `$ZDOTDIR/.zprofile` | 로그인 셸일 때 |
| 3 | `/etc/zshrc` → `$ZDOTDIR/.zshrc` | **대화형일 때** |
| 4 | `/etc/zlogin` → `$ZDOTDIR/.zlogin` | 로그인 셸일 때 |
| 5 | `$ZDOTDIR/.zlogout` → `/etc/zlogout` | 로그인 셸이 **끝날 때** |

`.zshrc`의 조건이 **로그인 여부가 아니라 대화형 여부**라는 것이 요점입니다.

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

`.zlogout`이 **본문 뒤에** 찍힌 것을 보십시오. 종료 시점에 도는 파일입니다.

### (b) 대화형 비로그인 셸

```
$ env -i HOME="$SB" ZDOTDIR="$SB" TERM=dumb /bin/zsh -i -c 'echo "  -- 본문 실행"'
  [read] .zshenv
  [read] .zshrc
  -- 본문 실행
```

### (c) 비대화형

```
$ env -i HOME="$SB" ZDOTDIR="$SB" /bin/zsh -c 'echo "  -- 본문 실행"'
  [read] .zshenv
  -- 본문 실행
```

**`.zshrc`가 읽히지 않았습니다.** `.zshenv`만 읽혔습니다.

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

하나도 읽히지 않았습니다. 개인 설정이 원인인지 확인할 때 쓰는 스위치입니다.

## 3. bash와 갈라지는 지점

같은 "rc 파일"이라는 이름 때문에 `.bashrc`의 감각을 그대로 가져오면 틀립니다.

| | bash | zsh |
| --- | --- | --- |
| 대화형 **로그인** 셸이 rc 파일을 읽는가 | **읽지 않습니다** | **읽습니다** |
| 항상 읽히는 개인 파일이 있는가 | 없습니다 | **`.zshenv`가 있습니다** |
| 시작 파일 개수 | 최대 2개(profile 계열 하나 + rc) | 5개 |

bash에서는 `.bash_profile` 끝에 `. ~/.bashrc`를 넣는 관용구가 거의 필수입니다. **zsh에서는 그 줄이 필요 없습니다** — 로그인 셸도 `.zshrc`를 읽기 때문입니다. bash 습관대로 `.zprofile`에서 `.zshrc`를 `source` 하면 **`.zshrc`가 두 번 실행됩니다.**

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

`/etc/zshrc`는 더 깁니다. 실무에서 알아 둘 만한 부분만 옮깁니다.

```
$ grep -n 'HISTFILE\|HISTSIZE\|SAVEHIST\|disable log\|COMBINING' /etc/zshrc
8:    setopt COMBINING_CHARS
12:disable log
15:HISTFILE=${ZDOTDIR:-$HOME}/.zsh_history
16:HISTSIZE=2000
17:SAVEHIST=1000
```

**`HISTSIZE`·`SAVEHIST`가 애플의 `/etc/zshrc`에서 정해집니다.** 제품 기본값이 아니라 이 맥의 시스템 설정입니다 — 히스토리가 1000줄에서 잘린다면 원인이 여기 있습니다. 개인 `.zshrc`가 나중에 돌므로 거기서 덮어쓰면 됩니다.

`/etc/zlogin`·`/etc/zlogout`은 이 맥에 없습니다.

```
$ ls /etc/zlogin /etc/zlogout
ls: /etc/zlogin: No such file or directory
ls: /etc/zlogout: No such file or directory
```

## 5. 실패 모드 (1) — `.zshrc`에만 `PATH`를 넣었을 때

가장 흔한 사고입니다. 도구 하나를 만들고 `PATH`를 `.zshrc`에서 잡았습니다.

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
/var/folders/yb/_p84xd093415s9d51hv5kd7w0000gn/T/tmp.5rfZQtSpK3/job.zsh:2: command not found: mytool
```

`.zshenv`로 옮기면 양쪽 다 됩니다.

```
$ mv "$SB/.zshrc" "$SB/.zshenv"
$ env -i HOME="$SB" ZDOTDIR="$SB" TERM=dumb PATH=/usr/bin:/bin /bin/zsh -i -c 'mytool'
hi from mytool
$ env -i HOME="$SB" ZDOTDIR="$SB" PATH=/usr/bin:/bin "$SB/job.zsh"
hi from mytool
```

**증상은 "터미널에서는 되는데 cron/CI/에디터 태스크에서는 `command not found`"입니다.** 원인은 도구 설치가 아니라 시작 파일 선택에 있습니다.

## 6. 실패 모드 (2) — `.zshenv`로 옮겼더니 `PATH` 순서가 뒤집힘

그런데 `.zshenv`로 옮기면 맥에서 새 문제가 생깁니다. **위와 완전히 같은 `.zshenv`로, 로그인 여부만 바꿔서** 돌린 결과입니다.

비로그인 셸:

```
$ env -i HOME="$SB" ZDOTDIR="$SB" TERM=dumb PATH=/usr/bin:/bin /bin/zsh -i -c 'echo $PATH'
/var/folders/yb/_p84xd093415s9d51hv5kd7w0000gn/T/tmp.5rfZQtSpK3/mybin:/usr/bin:/bin
```

로그인 셸:

```
$ env -i HOME="$SB" ZDOTDIR="$SB" TERM=dumb PATH=/usr/bin:/bin /bin/zsh -l -i -c 'echo $PATH'
/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/var/folders/yb/_p84xd093415s9d51hv5kd7w0000gn/T/tmp.5rfZQtSpK3/mybin
```

**맨 앞에 있던 `mybin`이 맨 뒤로 갔습니다.**

원인은 §4에서 본 `/etc/zprofile`입니다. `.zshenv`(1순위) 다음에 `/etc/zprofile`(2순위)이 돌면서 `path_helper`가 `PATH`를 다시 조립합니다.

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

**증상은 "버전이 다른 도구가 잡힌다"입니다.** `command not found`가 아니라 `/usr/bin`의 옛날 것이 먼저 잡히는 쪽이라 알아채기 어렵습니다.

정리하면 맥에서 `PATH`는 이런 구도에 놓입니다. (의견 포함)

| 어디에 쓰는가 | 스크립트에서 보이는가 | 로그인 시 `path_helper`에 밀리는가 |
| --- | --- | --- |
| `.zshrc` | **안 보임** | 안 밀림 (`path_helper`보다 나중) |
| `.zshenv` | 보임 | **밀림** |
| `.zprofile` | 안 보임 | 안 밀림 (`/etc/zprofile` 다음) |

셋 다 무언가를 포기합니다. 실무에서 쓸 만한 절충은 **`.zshenv`에 쓰되 대입이 아니라 "앞에 붙이기"로 쓰고, 순서에 민감한 도구는 절대 경로로 부르는 것**이라고 봅니다. 순서를 확실히 잡아야 한다면 `.zprofile`(로그인 셸 기준, `path_helper` 이후)에 쓰는 방법도 있지만, 그러면 §5의 스크립트 문제로 되돌아갑니다.

## 7. 실패 모드 (3) — `.zshenv`에 무거운 것을 넣었을 때

`.zshenv`는 **모든** zsh 호출에서 읽힙니다. 스크립트 한 줄을 돌릴 때도 읽힙니다. 매뉴얼이 이 점을 직접 경고합니다.

> As `/etc/zshenv` is run for all instances of zsh, it is important that it be kept as small as possible. In particular, it is a good idea to put code that does not need to be run for every single shell behind a test of the form `if [[ -o rcs ]]; then ...` so that it will not be executed when zsh is invoked with the `-f' option.

— 로컬 `man zshall` (zsh 5.9), 2026-09-06 확인

경고 대상은 `/etc/zshenv`지만 이유는 `~/.zshenv`에도 그대로 적용됩니다. 여기에 버전 매니저 초기화나 자동완성 로딩을 넣으면 **zsh을 호출하는 모든 스크립트가 그만큼 느려집니다.** 반복문 안에서 `zsh -c`를 부르는 파이프라인이라면 누적됩니다.

**이 비용은 이 문서에서 측정하지 않았습니다**(§9).

## 8. 그래서 무엇을 어디에 두는가

§2의 실측에서 따라 나오는 판단입니다. (사실이 아니라 의견입니다.)

| 넣을 것 | 어디에 | 왜 |
| --- | --- | --- |
| alias, 함수, 프롬프트, 자동완성, 키 바인딩 | `.zshrc` | 대화형에서만 의미가 있고, 상속되지 않습니다 |
| 스크립트도 알아야 하는 환경 변수 (`PATH`, `LANG`, 툴 홈) | `.zshenv` | 유일하게 항상 읽힙니다. **단 §6의 `PATH` 순서 문제를 감수해야 합니다** |
| 로그인 시 한 번만 할 일 (에이전트 기동, 접속 로그) | `.zprofile` | 대화형 셸이 여러 개 떠도 한 번만 돕니다 |
| 로그아웃 정리 | `.zlogout` | 로그인 셸 종료 시점 |
| `.zlogin` | 거의 안 씁니다 | `.zshrc` 뒤에 도는 것 말고는 `.zprofile`과 차이가 적습니다 |

## 9. 경계 — 이 문서가 안 맞는 곳

- **리눅스 서버.** 이 문서의 §4·§6은 애플이 넣은 `/etc/zprofile`과 `path_helper`에 전적으로 의존합니다. `path_helper`는 macOS 전용이므로, 리눅스에서는 §6의 `PATH` 뒤집힘이 **일어나지 않습니다.** §1~§3(파일 순서)만 공통입니다.
- **터미널 앱 설정에 따라 로그인 셸 여부가 갈립니다.** 어떤 터미널은 새 탭을 로그인 셸로, 어떤 것은 비로그인으로 띄웁니다. 그래서 "내 맥에서는 되는데"가 사람마다 다릅니다. 판별은 `[[ -o login ]] && echo login || echo non-login`으로 합니다.
- **프레임워크를 쓰고 있다면 `.zshrc`의 통제권이 나눠집니다.** Oh My Zsh 같은 것을 설치하면 `.zshrc`가 템플릿으로 교체되고, 그 안에서 다시 다른 파일들을 `source` 합니다. 이 문서의 실측은 프레임워크가 없는 상태(`env -i` + 빈 임시 홈)에서 나온 것이라 그 층은 포함하지 않습니다.
- **`.zshrc`를 튜닝해서 얻을 수 있는 것은 대화형 경험뿐입니다.** 배치 파이프라인의 재현성 문제를 `.zshrc`로 해결하려 하면 방향이 틀렸습니다 — 스크립트는 애초에 이 파일을 읽지 않습니다(§2c).

## 10. 확인하지 못한 것

- **`.zshenv`가 유발하는 실제 지연 시간.** §7. 측정하지 않았습니다. **미실행.**
- **리눅스에서의 시작 파일 동작.** 문서(매뉴얼)로만 확인했고 리눅스에서 돌려보지 못했습니다. (이 머신에 docker CLI는 있으나 데몬이 떠 있지 않습니다.) **미실행.**
- **zsh 5.9 이후 판.** 이 맥의 zsh은 5.9(매뉴얼 2022-05-14 판)입니다. 상위 프로젝트의 최신 매뉴얼에서 이 절이 바뀌었는지는 대조하지 않았습니다. **확인 필요.**
- **`GLOBAL_RCS`를 꺼서 `path_helper`를 피하는 방법.** 매뉴얼에 `unsetopt GLOBAL_RCS`로 전역 파일을 건너뛸 수 있다고 돼 있으나, 그렇게 하면 `/etc/zshrc`의 히스토리 설정 등도 함께 사라집니다. 부작용 범위를 다 확인하지 못해 §6의 대안으로 제시하지 않았습니다. **확인 필요.**

## 출처

- 로컬 `man zshall` — zsh 5.9 (2022-05-14 판), macOS 15.7.4에서 확인 (2026-09-06)
- 로컬 `/etc/zprofile`, `/etc/zshrc`, `/etc/paths` — macOS 15.7.4 (24G517), 2026-09-06 확인
- 로컬 `/usr/libexec/path_helper -s` 출력 — 2026-09-06 실행
- 위 실행 기록 전부 — macOS 15.7.4 (24G517), zsh 5.9 (arm64-apple-darwin24.0), 2026-09-06 실행

---

*작성일: 2026-09-06*
