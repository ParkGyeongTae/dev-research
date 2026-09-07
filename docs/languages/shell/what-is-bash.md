---
sidebar_position: 3
---

# Bash란 무엇인가 — 규격 위에 얹힌 확장, 그리고 이름에 따라 바뀌는 동작

> **원문** — [Chet Ramey, BASH(1) manual page](https://tiswww.case.edu/php/chet/bash/bash.html) · [bash NEWS](https://tiswww.case.edu/php/chet/bash/NEWS) · [GNU 배포처 `ftp.gnu.org/gnu/bash/`](https://ftp.gnu.org/gnu/bash/)
>
> **확인 날짜** — 2026-09-07. bash 자체에는 판번호가 있으나(3.2.57 / 5.2.37 / 5.3), 메인테이너의 매뉴얼·NEWS 페이지는 판번호 대신 날짜로 관리되므로 확인 날짜를 함께 적습니다.
>
> **검증 상태** — NEWS의 4.0 항목과 배포처 목록을 읽고 정리했습니다. 동작은 **이 맥의 bash 3.2.57과 Debian 컨테이너의 bash 5.2.37 양쪽에서 직접 돌려** 대조했습니다. 이전 판에서 "확인 필요"로 남겨 두었던 `pipefail` 동작과 Homebrew 설치 경로를 이번에 확인했습니다.

Bash를 이해하는 데 필요한 개념은 둘입니다.
**하나는 Bash가 POSIX `sh` 규격 위에 확장을 얹은 구현이라는 것**이고, **다른 하나는 같은 바이너리가 어떤 이름으로 불렸는지에 따라 다르게 동작한다는 것**입니다.
맥에서 개발하는 사람은 여기에 세 번째가 붙습니다 — **맥의 `/bin/bash`는 2006년 계열이라 흔히 쓰는 문법의 상당수가 아예 없습니다.**

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | macOS | Debian (컨테이너) |
| --- | --- | --- |
| OS | macOS 15.7.4 (Darwin 24.6.0), arm64 | Debian 13.6 (trixie), aarch64 |
| 이미지 | — | `debian:trixie-slim@sha256:d7e12182…` |
| bash | GNU bash, version 3.2.57(1)-release | GNU bash, version 5.2.37(1)-release |
| 비교 대상 | `/bin/dash`(dash-16), `/bin/zsh` 5.9, `/bin/sh`(=bash 3.2.57) | — |
| 실행 날짜 | 2026-09-07 | 2026-09-07 |

**bash 5.3은 어느 쪽에도 없습니다.** 5.3에 대한 서술은 전부 공식 자료를 읽은 것이고, 그때마다 표시했습니다. 4.0 이후 문법의 실제 동작은 **Debian 컨테이너의 5.2.37로 대조**했습니다.

---

## 1. 무엇인가 — 규격의 구현체 하나

Bash는 GNU 프로젝트의 셸이고, 이름은 **B**ourne-**A**gain **SH**ell에서 왔습니다. POSIX `sh` 규격을 만족하면서 그 위에 확장을 얹은 구조입니다.
— POSIX 규격 본문은 [The Open Group Base Specifications Issue 8, IEEE Std 1003.1-2024, Chapter 2 Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-07)

여기서 중요한 건 **확장이 있다는 사실 자체보다, 그 확장이 규격에 없다는 것**입니다. 규격에 있는 문법은 어느 `sh` 구현으로 가도 같은 뜻이지만, 확장은 Bash 밖으로 나가는 순간 보장이 사라집니다. 그래서 Bash로 짠 스크립트에 `#!/bin/sh`를 붙이면 dash 같은 다른 구현에서 깨집니다.

Bash는 대화형 셸이자 스크립트 언어입니다. 이 문서는 **스크립트 언어로서의 Bash**를 다룹니다.

---

## 2. 이 맥의 bash는 2006년 판입니다

GNU 공식 배포처를 직접 조회한 값입니다. HTTP `Last-Modified` 헤더를 그대로 옮겼습니다.

```console
$ for v in 3.2 4.0 5.3; do printf 'bash-%-4s ' "$v"; curl -sI "https://ftp.gnu.org/gnu/bash/bash-$v.tar.gz" | awk -F': ' '/[Ll]ast-[Mm]odified/{print $2}'; done
bash-3.2  Wed, 11 Oct 2006 16:11:40 GMT
bash-4.0  Fri, 20 Feb 2009 20:09:52 GMT
bash-5.3  Wed, 30 Jul 2025 14:07:20 GMT
```

— [GNU 배포처 `ftp.gnu.org/gnu/bash/`](https://ftp.gnu.org/gnu/bash/) (확인: 2026-09-07)

이 머신에 깔린 것은 3.2 계열입니다.

```console
$ /bin/bash --version
GNU bash, version 3.2.57(1)-release (arm64-apple-darwin24)
```

**최신 계열(5.3)과 약 19년 차이가 납니다.** 그래서 "Bash에는 이런 문법이 있다"는 설명이 이 머신에서는 절반쯤만 맞습니다.

### 3.2에 없는 것

bash 4.0에서 들어온 것 중 실무에서 자주 쓰이는 항목입니다. 메인테이너가 관리하는 NEWS 파일 기준입니다.

> The shell provides associative array variables, with the appropriate support to create, delete, assign values to, and expand them.
>
> **번역** — 셸이 연관 배열 변수를 제공하며, 그것을 만들고·지우고·값을 대입하고·확장하는 데 필요한 지원이 함께 들어갑니다.

> There is a new `mapfile' builtin to populate an array with lines from a given file. The name `readarray' is a synonym.
>
> **번역** — 주어진 파일의 줄들로 배열을 채우는 새 빌트인 `mapfile`이 있습니다. 이름 `readarray`는 같은 것을 가리키는 별칭입니다.
>
> — [bash NEWS](https://tiswww.case.edu/php/chet/bash/NEWS) (확인: 2026-09-07)

즉 **연관 배열(`declare -A`)과 `mapfile`/`readarray`는 4.0부터**입니다. 3.2에서 어떻게 되는지 실제로 확인했습니다.

```console
$ for s in /bin/sh /bin/bash /bin/dash /bin/zsh; do
    printf '%-6s -> ' "$(basename $s)"; $s -c 'declare -A m; m[k]=v; echo "지원: ${m[k]}"' 2>&1 | head -1
  done
sh     -> /bin/sh: line 0: declare: -A: invalid option
bash   -> /bin/bash: line 0: declare: -A: invalid option
dash   -> /bin/dash: 1: declare: not found
zsh    -> 지원: v
```

**맥의 bash에서는 연관 배열이 안 됩니다.** 눈여겨볼 것은 같은 맥의 **zsh는 된다**는 점입니다.

그리고 같은 코드가 리눅스의 bash 5.2에서는 그냥 돕니다.

```console
$ docker run --rm debian:trixie-slim bash -c 'bash --version|head -1; declare -A m; m[k]=v; echo "연관배열: ${m[k]}"; v=abc; echo "대문자: ${v^^}"'
GNU bash, version 5.2.37(1)-release (aarch64-unknown-linux-gnu)
연관배열: v
대문자: ABC
```

**같은 문법이 맥에서는 오류, 배포 대상에서는 정상입니다.** 이 비대칭이 §2 나머지의 전부입니다.

여기서 나오는 오류 메시지가 사람을 헤매게 만듭니다. `declare: -A: invalid option`은 **문법이 틀렸다는 말이 아니라 이 bash가 그 옵션을 모른다는 말**입니다. 인터넷 예제나 리눅스 서버 스크립트를 맥으로 가져왔을 때 이 메시지를 보고 문법을 고치려 들면 시간을 버립니다. 먼저 `bash --version`을 봐야 합니다.

### 왜 3.2에 머물러 있는가

확인 가능한 사실은 라이선스가 그 지점에서 바뀌었다는 것입니다. 각 릴리스 tarball의 `COPYING`을 직접 열어 확인했습니다.

```console
$ curl -s https://ftp.gnu.org/gnu/bash/bash-3.2.tar.gz | tar -xzO bash-3.2/COPYING | grep -m1 -E 'Version [0-9]+,'
		       Version 2, June 1991
$ curl -s https://ftp.gnu.org/gnu/bash/bash-4.0.tar.gz | tar -xzO bash-4.0/COPYING | grep -m1 -E 'Version [0-9]+,'
                       Version 3, 29 June 2007
```

**bash 3.2는 GPL 버전 2, 4.0부터는 GPL 버전 3입니다.** 그리고 macOS가 배포하는 것은 GPLv2 계열의 마지막 줄기입니다.

> 여기까지가 확인된 사실입니다. **"Apple이 GPLv3을 피하려고 3.2에 머물렀다"는 설명은 널리 통용되지만 Apple의 공식 진술로 확인하지 못했습니다 — 추측:** 두 사실(라이선스 전환 시점과 Apple이 멈춘 지점)이 일치한다는 것까지가 이 문서가 말할 수 있는 범위입니다.

실무적으로는 동기보다 결과가 중요합니다. **맥에서 개발하고 리눅스에 배포하면 로컬 3.2와 배포 대상 5.x라는 비대칭이 생깁니다.** 방향에 따라 증상이 다릅니다 — 4.0+ 문법을 쓰면 로컬에서만 안 되고, 반대로 `#!/bin/sh`로 배포해서 dash로 떨어지면 로컬에서만 됩니다(§3).

최신 bash가 필요하면 Homebrew 등으로 따로 설치해야 합니다. **이 머신에는 설치돼 있지 않습니다.**

```console
$ brew --prefix
/opt/homebrew
$ ls -l /opt/homebrew/bin/bash
ls: /opt/homebrew/bin/bash: No such file or directory
```

즉 이 맥에서 `bash`를 부르면 어떤 경로로 부르든 3.2.57입니다. 설치했을 때 실제로 어디에 놓이는지는 확인하지 못했습니다(맨 아래 절).

---

## 3. 같은 바이너리가 이름에 따라 다르게 동작합니다

이것이 Bash를 이해할 때 두 번째로 중요한 개념입니다. Bash는 **자기가 어떤 이름으로 호출됐는지 보고 모드를 바꿉니다.**

```console
$ cat who.sh
echo "\$0=$0  BASH_VERSION=$BASH_VERSION  posix옵션=$(set -o | grep -w posix)"

$ /bin/sh who.sh
$0=who.sh  BASH_VERSION=3.2.57(1)-release  posix옵션=posix          	on

$ /bin/bash who.sh
$0=who.sh  BASH_VERSION=3.2.57(1)-release  posix옵션=posix          	off
```

`BASH_VERSION`이 양쪽 다 `3.2.57`입니다. **같은 실행 파일인데 `posix` 옵션이 다릅니다.**

이름표만 바뀌는 게 아니라 관찰 가능한 동작이 바뀝니다.

```console
$ /bin/sh   -c 'echo "a\tb"' | od -c | head -1
0000000    a  \t   b  \n
$ /bin/bash -c 'echo "a\tb"' | od -c | head -1
0000000    a   \   t   b  \n
```

**`sh`로 부르면 `\t`가 탭이 되고, `bash`로 부르면 문자 그대로 남습니다.**

그래서 "이 스크립트는 bash로 돌아간다"는 말은 부정확합니다 — **어떤 이름으로 불렸는지까지 봐야** 합니다. 그리고 이 성질 때문에 맥에서는 셔뱅 오류가 잘 안 걸립니다. `#!/bin/sh`를 붙이고 `[[ ]]` 같은 Bash 확장을 써도 **맥의 `/bin/sh`는 결국 bash라서 통과합니다.** 실제 dash가 `sh`인 컨테이너에 올라가서야 처음 터집니다.

```console
$ /bin/sh -c '[[ "abc" == a* ]] && echo 통과'
통과
$ docker run --rm debian:trixie-slim sh -c '[[ a == a ]] && echo 통과'
sh: 1: [[: not found
```

이 맥에는 `/bin/dash`가 설치돼 있으므로, `dash script.sh`로 한 번 돌려 보면 배포 전에 걸러집니다.

또 하나 따라오는 결론이 있습니다. `#!/bin/sh`로 배포되는 스크립트에는 **Bash 확장을 쓸 수 없습니다.** 쓰려면 셔뱅을 `#!/bin/bash`로 명시해야 하고, 그러면 **대상 이미지에 bash가 설치돼 있어야** 합니다 — 슬림 이미지에는 없는 경우가 흔합니다.

---

## 4. Bash가 규격 위에 더한 것

POSIX `sh`에 없고 Bash에 있는 것 중 자주 쓰이는 항목입니다. 아래는 로컬 3.2.57에서 확인한 것입니다.

```console
$ /bin/bash -c '[[ "abc" == a* ]] && echo "지원"'
지원
$ /bin/dash -c '[[ "abc" == a* ]] && echo "지원"'
/bin/dash: 1: [[: not found
```

| 기능 | 3.2에서 | 5.2에서 |
| --- | --- | --- |
| `[[ ... ]]` 조건식, 패턴 매칭 | 있음 (위 실행 기록) | 있음 |
| 인덱스 배열 `arr=(...)`, `${arr[@]}` | 있음 | 있음 |
| `$(( ))` 산술 확장 | 있음 (POSIX에도 있음) | 있음 |
| 프로세스 치환 `<(...)` | 있음 | 있음 |
| **연관 배열 `declare -A`** | **없음** (§2 실행 기록) | **있음** (§2 실행 기록) |
| **`${var^^}` 대소문자 변환** | **없음** — 4.0부터 | **있음** (§2 실행 기록) |
| **`mapfile` / `readarray`** | **없음** — 4.0부터 | 있음 — NEWS 기준, 이 문서에서 미실행 |

배열 인덱스는 **0부터** 시작합니다.

```console
$ /bin/bash -c 'arr=(첫째 둘째 셋째); echo "arr[1]=${arr[1]}  개수=${#arr[@]}"'
arr[1]=둘째  개수=3
$ /bin/zsh  -c 'arr=(첫째 둘째 셋째); echo "arr[1]=${arr[1]}  개수=${#arr[@]}"'
arr[1]=첫째  개수=3
```

오류가 아니라 **값이 한 칸 밀립니다.**

### 변수 확장은 기본적으로 단어 분리를 거칩니다

Bash에서 따옴표 없는 변수는 값을 그대로 내놓는 게 아니라 **공백 기준으로 쪼개진 뒤** 명령에 전달됩니다. 이게 Bash 문법에서 가장 자주 사고를 만드는 규칙입니다.

```console
$ cat split.sh
files="a.csv b.csv c.csv"
count=0
for f in $files; do count=$((count + 1)); done
echo "루프 반복 횟수: $count"

path="/data/my report.csv"
[ -n "$path" ] && set -- $path
echo "인자 개수: $#"

$ for s in /bin/sh /bin/bash /bin/dash /bin/zsh; do
    printf '%-11s -> ' "$(basename $s)"; $s split.sh | tr '\n' ' '; echo
  done
sh          -> 루프 반복 횟수: 3 인자 개수: 2
bash        -> 루프 반복 횟수: 3 인자 개수: 2
dash        -> 루프 반복 횟수: 3 인자 개수: 2
zsh         -> 루프 반복 횟수: 1 인자 개수: 1
```

bash 쪽 두 결과가 같은 규칙의 양면입니다. 위쪽은 **원하는 동작**입니다 — 공백으로 구분한 목록을 순회하려고 일부러 쓰는 관용구입니다. 아래쪽은 **사고**입니다 — 경로 하나가 인자 두 개가 됐습니다. 파일명에 공백이 있기 때문입니다.

즉 단어 분리 자체가 문제가 아니라, **같은 규칙이 목록에는 필요하고 경로에는 해롭다**는 게 문제입니다. 그래서 파일 경로를 다룰 때는 항상 `"$path"`로 감싸고, 목록이 필요하면 배열을 씁니다.

zsh만 반복 1회, 인자 1개입니다 — 셸에 따라 이 규칙 자체가 다릅니다.

### 파이프 중간의 실패는 기본적으로 무시됩니다

파이프라인의 종료 코드는 **마지막 명령의 것**입니다. 그래서 `set -e`만 걸어 두면 중간 명령이 실패해도 넘어갑니다. 이전 판에서 "확인 필요"로 남겨 두었던 부분이라 이번에 실제로 돌렸습니다.

```console
$ cat pf.sh
set -e
false | cat
echo "  set -e 만: 여기까지 옵니다 (파이프 종료코드=$?)"
set -o pipefail
false | cat
echo "  pipefail 후: 이 줄은 나오지 않습니다"

$ /bin/bash pf.sh; echo "  최종 종료코드=$?"
  set -e 만: 여기까지 옵니다 (파이프 종료코드=0)
  최종 종료코드=1
```

**같은 `false | cat`이 두 번 나오는데, 첫 번째는 종료 코드 0으로 지나가고 두 번째는 스크립트를 멈춥니다.** 차이는 그 사이의 `set -o pipefail` 한 줄뿐입니다. 세 번째 `echo`가 출력되지 않은 것이 그 증거입니다.

`psql ... | gzip > out.gz`에서 `psql`이 실패해도 `gzip`이 성공하면 스크립트가 0으로 끝나는 것이 첫 번째 경우입니다. 그래서 `set -e`·`set -u`(미정의 변수 오류)와 함께 `set -o pipefail`을 거는 것이 관행입니다(의견).

---

## 5. 실무에서 어디에 쓰이는가

데이터 엔지니어 기준으로 Bash가 실제로 놓이는 자리입니다.

- **컨테이너 진입점과 빌드 단계** — Dockerfile의 `RUN`, `ENTRYPOINT`. 다만 `SHELL` 지시어를 주지 않으면 `/bin/sh`로 실행되므로(§3) Bash 문법을 그대로 쓰면 안 됩니다.
- **CI 스텝** — 대부분의 CI가 Bash 또는 sh로 스텝을 돌립니다.
- **오케스트레이션 작업의 껍데기** — Airflow의 `BashOperator`, 크론 잡, `spark-submit` 래퍼.
- **운영 점검 스크립트** — 로그 훑기, 디스크 확인, 백필 트리거.

**언제 Bash를 쓰고 언제 Python으로 가는가**는 규모의 문제입니다(의견). 외부 명령을 이어 붙이고 종료 코드를 보는 일이 본론이면 Bash가 짧고 명확합니다.

반대로 언어의 한계가 빨리 드러나는 자리도 §2·§4에서 그대로 따라 나옵니다. 배열은 있지만 중첩이 안 되고 3.2에는 연관 배열조차 없어 **자료구조가 필요한 로직**은 금방 막힙니다. 산술은 정수뿐이라 **소수 계산**에는 `bc`·`awk` 같은 외부 명령이 필요합니다. `&`와 `wait`는 있지만 **실패 처리·재시도·부분 실패 집계**를 짜기 시작하면 예외도 단위 테스트 수단도 없다는 사실이 곧바로 걸립니다.

---

## 확인하지 못한 것

- **bash 5.3의 실제 동작.** 이 문서가 돌려 본 것은 3.2.57과 5.2.37입니다. 5.3은 배포처의 게시일만 확인했고 설치해 돌리지 않았습니다. **미실행.**
- **`mapfile`/`readarray`.** 4.0부터라는 것은 NEWS로 확인했으나 5.2 컨테이너에서 실제로 돌려 보지 않았습니다. **미실행.**
- **Homebrew로 설치했을 때의 bash 경로.** 이 머신에 `/opt/homebrew/bin/bash`가 없다는 것은 확인했지만(§2), 설치하면 정확히 어디에 놓이고 `/bin/bash`와 어떻게 공존하는지는 실제로 설치해 확인하지 않았습니다. **확인 필요.**
- **Apple이 3.2에 머문 이유.** 라이선스 전환 시점과 일치한다는 것까지만 확인했고, Apple의 공식 진술은 찾지 못했습니다(§2). **추측** 표기를 유지합니다.
- **4.x·5.0~5.1에서의 동작.** 3.2와 5.2 두 지점만 대조했습니다. 그 사이 판에서 §4 표의 항목이 어떻게 달랐는지는 확인하지 않았습니다.
- **리눅스 쪽 실측은 커널 하나에서만 얻었습니다.** Docker Desktop이 띄운 aarch64 linuxkit 커널의 `debian:trixie-slim`입니다.

---

*작성일: 2026-09-07*
