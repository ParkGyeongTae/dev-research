---
sidebar_position: 1
---

# POSIX란 무엇인가 — 이 맥이 따르는 것은 2001년 판입니다

"POSIX 호환"이라는 말은 흔하지만, 그 말이 **무엇을 보장하고 무엇을 보장하지 않는지**는 잘 이야기되지 않습니다.
이 문서는 세 가지 착각을 실측으로 깹니다.

1. POSIX는 "리눅스·유닉스가 대충 공유하는 관행"이 아니라 **판번호와 인증 제도를 가진 규격**입니다.
2. 그런데 **인증을 받은 것은 맥이고, 리눅스 배포판은 등록부에 없습니다.**
3. 이 맥이 보고하는 준수 판번호는 최신판(Issue 8, 2024)이 아니라 **Issue 6(2001)**입니다.

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

리눅스에서는 돌려보지 못했습니다. 리눅스에 대한 서술은 모두 문서 인용이고, 그렇다고 표시했습니다(§8).

---

## 1. 무엇인가 — 이름 넷이 같은 물건입니다

가장 먼저 걸리는 지점이 이름입니다. 아래 넷은 **같은 문서를 가리키는 다른 이름**입니다.

| 부르는 이름 | 누가 쓰는 이름인가 |
| --- | --- |
| POSIX.1-2024 | 규격 본문이 자기를 부르는 이름 |
| IEEE Std 1003.1-2024 | IEEE 쪽 표준 번호 |
| The Open Group Base Specifications Issue 8 | The Open Group 쪽 발행 이름 |
| SUS(Single UNIX Specification) | 인증 제도 쪽에서 부르는 이름 |

The Open Group의 발행 페이지 제목이 그대로 이 사실을 보여 줍니다 — "The Open Group Base Specifications Issue 8 / IEEE Std 1003.1-2024 Edition".

규격이 스스로 밝히는 목적은 이렇습니다.

> POSIX.1-2024 defines a standard operating system interface and environment, including a command interpreter (or "shell"), and common utility programs to support applications portability at the source code level. It is intended to be used by both application developers and system implementors.

— [The Open Group Base Specifications Issue 8, Base Definitions, 1. Introduction](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-06)

여기서 놓치기 쉬운 단어가 **"at the source code level"**입니다. POSIX가 보장하려는 것은 **소스를 옮겨서 다시 빌드하면 돌아간다**이지, 바이너리 호환이 아닙니다.

## 2. 무엇을 정의하는가 — 네 권입니다

POSIX.1-2024는 네 권으로 나뉩니다.

| 권 | 다루는 것 |
| --- | --- |
| Base Definitions | 용어·개념·헤더·유틸리티 표기 관례 |
| System Interfaces | C 함수 수준의 시스템 인터페이스 (`open`, `fork`, `sysconf` …) |
| Shell and Utilities | **셸 언어와 명령줄 유틸리티** (`sh`, `awk`, `sed`, `grep` …) |
| Rationale (Informative) | 왜 이렇게 정했는지 — 규범이 아님 |

— [The Open Group Base Specifications Issue 8](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-06)

셸 스크립트를 짜는 사람이 실제로 부딪히는 곳은 세 번째 권입니다. **셸 문법도, `awk`·`sed`의 동작도 이 규격 안에 있습니다** — "POSIX는 시스템 콜 규격"이라는 인상은 절반만 맞습니다.

## 3. 이 맥은 어느 판을 따르는가 — 실측

규격은 준수 판번호를 시스템이 스스로 보고하도록 정해 두었습니다. `getconf`로 읽습니다.

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

**결론: 이 맥(macOS 15.7.4)이 준수한다고 보고하는 것은 2001년 판입니다.** 2024년 판이 아닙니다.

이게 실무에 주는 의미는 분명합니다. **"POSIX에 있으니 맥에서도 되겠지"가 성립하지 않습니다.** Issue 7(2008)이나 Issue 8(2024)에서 추가된 것은 이 시스템의 준수 대상 밖입니다. 실제로 Issue 8에서 규격에 들어온 `$'...'` 문법을 dash가 해석하지 못하는 것을 §6에서 확인합니다.

## 4. 인증은 상표입니다 — 맥은 UNIX, 리눅스는 아닙니다

여기가 가장 직관에 어긋나는 지점입니다.

The Open Group은 규격을 발행할 뿐 아니라 **UNIX라는 등록 상표의 인증 제도**를 운영합니다. 시험 통과 + 등록을 거쳐야 제품을 "UNIX"라고 부를 수 있습니다.

- 등록부에서 확인한 애플 항목: **macOS 15.0 Sequoia**와 **macOS 26.0 Tahoe**가 Apple silicon·Intel 양쪽 모두 **UNIX 03**을 포함한 다섯 개 표준에 등록돼 있습니다.
  — [The Open Group, Open Brand Register — Apple Inc.](https://www.opengroup.org/openbrand/register/apple.htm) (확인: 2026-09-06)
- 2026-09-06 시점의 등록부 전체 목록에는 **Apple(macOS)·IBM(z/OS, AIX)·HPE(HP-UX)·SCO(UnixWare, OpenServer)만** 있습니다. **리눅스 배포판은 없습니다.**
  — [The Open Group, The Register of UNIX Certified Products](https://www.opengroup.org/openbrand/register/) (확인: 2026-09-06)

그래서 정확한 문장은 이렇게 됩니다.

- **맥은 인증받은 UNIX입니다.**
- **리눅스는 인증받은 UNIX가 아닙니다.** POSIX가 정한 것을 대체로 따르지만, 그것을 시험으로 증명해 등록한 상태가 아닙니다.

리눅스에서 잘 돌던 스크립트가 맥에서 깨지는 일이 잦다는 사실과 겹쳐 놓으면 이 구도가 뒤집혀 보입니다. 이유는 간단합니다 — **인증은 "규격에 있는 것을 갖췄다"는 증명이지, "규격 밖의 GNU 확장을 갖췄다"는 증명이 아닙니다.** 리눅스 스크립트가 맥에서 깨지는 원인은 대개 규격이 아니라 GNU 확장 쪽에 있습니다.

## 5. 규격이 정하지 않은 것 — `#!`와 `/bin/sh`

셸 스크립트를 쓰는 사람이 가장 자주 "POSIX가 정해 놨겠지"라고 오해하는 두 가지입니다. **둘 다 아닙니다.**

### `/bin/sh`라는 경로는 규격에 없습니다

`sh` 유틸리티 페이지가 직접 경고합니다.

> Applications should note that the standard PATH to the shell cannot be assumed to be either /bin/sh or /usr/bin/sh, and should be determined by interrogation of the PATH returned by getconf PATH.

— [The Open Group Base Specifications Issue 8, `sh`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html) (확인: 2026-09-06)

규격이 정하는 것은 **`sh`라는 이름의 유틸리티가 표준 PATH 어딘가에 있다**는 것까지입니다. 이 맥에서 실제로 확인해 보면:

```
$ getconf PATH
/usr/bin:/bin:/usr/sbin:/sbin

$ env PATH="$(getconf PATH)" command -v sh
/bin/sh
```

이 맥에서는 결과적으로 `/bin/sh`가 맞았습니다. 하지만 그것은 **이 시스템의 사실**이지 규격의 보장이 아닙니다.

### `#!`(shebang)는 규격 밖입니다

`#!`로 해석자를 지정하는 방식은 POSIX가 표준화한 메커니즘이 **아닙니다**. `sh` 페이지는 이 방식을 APPLICATION USAGE(정보성 절)에서 설치 시 관례로 언급할 뿐, 규범으로 정하지 않습니다.
— [The Open Group Base Specifications Issue 8, `sh`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html) (확인: 2026-09-06)

실무에서 `#!`가 안 통하는 시스템을 만날 일은 거의 없습니다. 다만 **"POSIX 스크립트"라는 말이 첫 줄까지 규격화돼 있다는 뜻은 아니라는 것**은 알고 있어야 합니다.

### 대화형 셸의 시작 파일은 `ENV` 하나뿐입니다

규격이 셸 시작 파일에 대해 정하는 것은 이것뿐입니다.

> This variable, when and only when an interactive shell is invoked, shall be subjected to parameter expansion by the shell, and the resulting value shall be used as a pathname of a file containing shell commands to execute in the current environment.

— [The Open Group Base Specifications Issue 8, `sh`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html) (확인: 2026-09-06)

`~/.profile`·`~/.bashrc`·`~/.zshrc` 같은 이름은 **규격에 없습니다.** 전부 구현체가 각자 정한 관례입니다. 실제로 이 맥에서 `sh`(=bash 3.2)를 대화형으로 띄우면 `ENV`가 가리키는 파일만 읽습니다.

```
$ SB=$(mktemp -d)
$ ln -s /bin/bash "$SB/sh"
$ echo 'echo "  [read] ENVFILE"' > "$SB/envfile"

$ env -i HOME="$SB" TERM=dumb ENV="$SB/envfile" "$SB/sh" -i -c ':'
sh: no job control in this shell
  [read] ENVFILE
```

`/bin/dash`에서도 같습니다. 대화형일 때만 읽습니다.

```
$ env -i HOME="$SB" TERM=dumb ENV="$SB/envfile" /bin/dash -i -c ':'
/bin/dash: 0: can't access tty; job control turned off
  [read] ENVFILE

$ env -i HOME="$SB" ENV="$SB/envfile" /bin/dash -c ':'
$
```

두 번째 명령은 아무것도 출력하지 않았습니다 — 비대화형이므로 `ENV`를 읽지 않은 것입니다.

규격의 "when and only when an interactive shell is invoked"가 그대로 관측됩니다.

## 6. 실패 모드 — 규격 밖을 밟았을 때

여기가 이 문서의 핵심입니다. 같은 한 줄을 네 셸에 넣어 돌린 실측 결과입니다.

### (a) `echo -e` — 셸마다 다른 값이 나옵니다

```
$ for sh in /bin/sh /bin/bash /bin/dash /bin/zsh; do printf '%-10s ' "$sh"; "$sh" -c 'echo -e "a\tb"'; done
/bin/sh    -e a	b
/bin/bash  a	b
/bin/dash  -e a	b
/bin/zsh   a	b
```

`/bin/sh`와 `/bin/dash`는 **`-e`를 옵션이 아니라 출력할 문자열로 취급**했습니다. 오류는 나지 않았습니다. 출력만 조용히 달라졌습니다.

> 참고로 이 맥의 `/bin/sh`는 dash가 아닙니다. `/private/var/select/sh -> /bin/bash`이므로 bash 3.2가 `sh` 이름으로 도는 것입니다. 같은 bash 바이너리가 이름에 따라 `echo -e`를 다르게 처리한 결과입니다.

`printf`로 바꾸면 넷 다 같습니다.

```
$ for sh in /bin/sh /bin/bash /bin/dash /bin/zsh; do printf '%-10s ' "$sh"; "$sh" -c 'printf "a\tb\n"'; done
/bin/sh    a	b
/bin/bash  a	b
/bin/dash  a	b
/bin/zsh   a	b
```

### (b) `test`의 `==` — 규격은 `=`만 정합니다

```
$ for sh in /bin/sh /bin/bash /bin/dash /bin/zsh; do printf '%-10s ' "$sh"; "$sh" -c '[ "a" == "a" ] && echo "== 동작" || echo "== 실패"' 2>&1 | head -1; done
/bin/sh    == 동작
/bin/bash  == 동작
/bin/dash  /bin/dash: 1: [: a: unexpected operator
/bin/zsh   zsh:1: = not found
```

셋 다 다른 결과입니다. zsh의 오류 메시지가 `=`를 파일명 확장으로 해석하려다 난 것이라 원인 추적도 어렵습니다.

### (c) `$'...'` — 규격에 **나중에** 들어온 문법

`$'...'`는 Issue 8의 Shell Command Language에 포함돼 있습니다. 그래서 "POSIX 문법"이라고 부를 수는 있지만, Issue 6을 기준으로 만들어진 구현에는 없습니다.

```
$ cat > "$SB/q.sh" <<'EOF'
printf '%s\n' $'a\tb'
EOF

$ for sh in /bin/sh /bin/bash /bin/dash /bin/zsh; do printf '%-10s ' "$sh"; "$sh" "$SB/q.sh"; done
/bin/sh    a	b
/bin/bash  a	b
/bin/dash  $a\tb
/bin/zsh   a	b
```

**dash는 오류 없이 `$a\tb`라는 문자열을 그대로 뱉었습니다.** 이 종류가 가장 위험합니다 — 종료 코드는 0이고, 파이프라인은 계속 돌고, 값만 틀립니다.

### (d) 규격에 없는데 다 되는 것 — 이식성 착각의 출처

```
$ for sh in /bin/bash /bin/dash /bin/zsh; do printf '%-10s ' "$sh"; "$sh" -c 'f() { local v=1; echo "local ok: $v"; }; f'; done
/bin/bash  local ok: 1
/bin/dash  local ok: 1
/bin/zsh   local ok: 1
```

`local`은 셋 다 됩니다. 그래서 "이건 이식성 있다"고 굳어집니다. 하지만 **`local`은 POSIX.1-2024 Shell and Utilities에 없습니다** — 세 구현이 각자 넣은 확장이 우연히 겹친 것입니다. 규격을 근거로 삼을 수 없는 문법입니다.

배열도 마찬가지 구조인데, 결과가 더 나쁩니다.

```
$ for sh in /bin/bash /bin/dash /bin/zsh; do printf '%-10s ' "$sh"; "$sh" -c 'a=(x y); echo "${a[1]}"' 2>&1 | head -1; done
/bin/bash  y
/bin/dash  /bin/dash: 1: Syntax error: "(" unexpected
/bin/zsh   x
```

dash는 문법 오류로 죽습니다(그나마 낫습니다). bash와 zsh는 **같은 문법이 오류 없이 다른 값**을 냅니다 — 인덱스 시작이 다르기 때문입니다.

### 실패 모드 요약

| 증상 | 원인 | 어디서 드러나는가 |
| --- | --- | --- |
| 출력에 `-e`가 그대로 찍힘 | `echo -e`는 규격 밖 | 로그·리포트 문자열 |
| `[: unexpected operator` | `test`의 `==`는 규격 밖 | dash가 `/bin/sh`인 컨테이너 |
| 변수 값에 `\t`가 문자 그대로 남음 | `$'...'` 미지원 (**오류 없음**) | 구분자 처리, CSV/TSV 생성 |
| 배열 원소가 한 칸씩 어긋남 | 인덱스 시작이 구현마다 다름 (**오류 없음**) | zsh에서 짠 뒤 bash로 옮길 때 |

아래 둘 — **오류 없이 값만 틀리는 것** — 이 파이프라인에서 훨씬 오래 살아남습니다.

## 7. 경계 — POSIX를 기준으로 삼지 말아야 할 때

POSIX 이식성은 공짜가 아닙니다. 아래 상황에서는 기준으로 삼는 것이 오히려 손해입니다.

- **실행 환경이 하나로 고정돼 있을 때.** 컨테이너 이미지를 못 박아 두고 그 안에서만 도는 스크립트라면, 규격 최소 집합에 맞추느라 `printf` 곡예를 하는 것보다 `#!/bin/bash`를 명시하고 bash 기능을 쓰는 편이 읽기 쉽고 안전합니다. **이식성은 "여러 환경에서 돌 때"만 값이 있습니다.**
- **배열·연관 배열·정규식 매칭이 필요한 로직일 때.** POSIX 셸에는 이 셋이 다 없습니다. 그것을 문자열 조작으로 흉내 내기 시작했다면, 그건 셸의 경계를 넘은 신호입니다 — Python으로 옮기는 편이 낫습니다.
- **"POSIX 준수"를 품질 근거로 쓸 때.** §3에서 봤듯 준수 판번호는 시스템마다 다르고, §5에서 봤듯 규격이 정하지 않고 남겨 둔 영역이 넓습니다. 준수는 **하한선의 보장**이지 동일 동작의 보장이 아닙니다.
- **GNU 유틸리티 옵션에 기대고 있을 때.** `sed -i`, `date -d`, `grep -P`, `readlink -f`는 모두 규격 밖입니다. 이건 셸이 아니라 유틸리티 쪽 문제라 셸을 dash로 맞춰도 해결되지 않습니다.

그리고 반대 방향의 경계도 분명히 해 둡니다 — **POSIX 규격을 읽는 것이 셸 스크립트 실력의 지름길은 아닙니다.** 규격은 구현자를 위한 문서입니다. 스크립트를 짜는 쪽에서 실제로 필요한 것은 "규격에 뭐가 있나"보다 **"내가 쓰는 이 문법이 규격 안인가 밖인가"**이고, 그건 위 §6처럼 여러 셸에 같은 줄을 넣어 돌려 보는 것이 가장 빠릅니다.

## 8. 확인하지 못한 것

- **리눅스에서의 `getconf` 값.** 이 문서의 실행 기록은 전부 macOS 15.7.4에서 나왔습니다. 리눅스 배포판이 `_POSIX_VERSION`으로 무엇을 보고하는지는 **미실행**입니다. (이 머신에 docker CLI는 있으나 데몬이 떠 있지 않아 컨테이너로도 확인하지 못했습니다.)
- **`local`이 Issue 8에 정말 없는지 전문 대조.** Shell and Utilities 권의 특수 내장 명령 목록을 끝까지 훑어 확인한 것이 아니라, 규격에 포함됐다는 근거를 찾지 못한 상태입니다. **확인 필요.**
- **UNIX 03 상표와 Issue 6의 정확한 대응.** 이 맥이 `200112`/`600`을 보고한다는 것(실측)과 macOS가 UNIX 03에 등록돼 있다는 것(등록부 확인)은 각각 확인했습니다. 다만 "UNIX 03 = Issue 6"이라고 못 박은 The Open Group 문장은 찾지 못했습니다. **확인 필요.**
- **역사적으로 인증받았던 리눅스 제품.** 2026-09-06 시점 등록부에 리눅스가 없다는 것만 확인했습니다. 과거에 등록됐다가 빠진 것이 있는지는 확인하지 못했습니다.

## 출처

- [The Open Group Base Specifications Issue 8 / IEEE Std 1003.1-2024 — Base Definitions, 1. Introduction](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-06)
- [같은 규격 — `<unistd.h>`](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/unistd.h.html) (확인: 2026-09-06)
- [같은 규격 — `sh` 유틸리티](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html) (확인: 2026-09-06)
- [The Open Group Base Specifications Issue 6 / IEEE Std 1003.1-2004 — `<unistd.h>`](https://pubs.opengroup.org/onlinepubs/009695399/basedefs/unistd.h.html) (확인: 2026-09-06)
- [The Open Group, Open Brand Register — Apple Inc.](https://www.opengroup.org/openbrand/register/apple.htm) (확인: 2026-09-06)
- [The Open Group, The Register of UNIX Certified Products](https://www.opengroup.org/openbrand/register/) (확인: 2026-09-06)
- macOS `sh(1)` man page (macOS 15.7, 2019-02-08 판) — 로컬 실행
- 위 실행 기록 전부 — macOS 15.7.4 (24G517), 2026-09-06 실행

---

*작성일: 2026-09-06*
