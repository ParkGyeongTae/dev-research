# Bash란 무엇인가 — 맥에 깔린 것은 2006년 판입니다

Bash를 "리눅스 기본 셸"로 알고 넘어가면 실무에서 두 번 걸립니다.
하나는 **맥의 `/bin/bash`가 2006년 계열이라 흔히 쓰는 문법의 상당수가 없다**는 것이고,
다른 하나는 **같은 바이너리가 `sh`로 불리면 다르게 동작한다**는 것입니다. 둘 다 실제로 확인합니다.

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | 값 |
| --- | --- |
| OS | macOS (Darwin 24.6.0), arm64 |
| `/bin/bash` | GNU bash, version 3.2.57(1)-release |
| 비교 대상 | `/bin/dash`, `/bin/zsh` 5.9 (모두 macOS 번들) |
| 실행 날짜 | 2026-09-06 |

**bash 5.x는 이 머신에 없어 직접 돌리지 못했습니다.** 5.x에 대한 서술은 전부 공식 자료를 읽은 것이고, 그때마다 표시했습니다.

---

## 1. 무엇인가

Bash는 GNU 프로젝트의 셸이고, 이름은 **B**ourne-**A**gain **SH**ell에서 왔습니다. POSIX `sh` 규격을 만족하면서 그 위에 확장을 얹은 구조입니다.

여기서 중요한 건 **확장이 있다는 사실 자체보다, 그 확장이 POSIX가 아니라는 것**입니다. Bash로 짠 스크립트에 `#!/bin/sh`를 붙이면 dash 같은 다른 구현에서 깨집니다.

Bash는 대화형 셸이자 스크립트 언어입니다. 이 문서는 **스크립트 언어로서의 Bash**를 다룹니다.

---

## 2. 버전 — 3.2와 4.0 사이에 단절이 있습니다

GNU 공식 배포처(`https://ftp.gnu.org/gnu/bash/`)를 직접 조회한 값입니다 (조회: 2026-09-06).

| 파일 | 게시일 |
| --- | --- |
| `bash-3.2.tar.gz` | **2006-10-11** |
| `bash-5.3.tar.gz` | **2025-07-30** |

이 머신에 깔린 것은 3.2 계열입니다.

```console
$ /bin/bash --version
GNU bash, version 3.2.57(1)-release (arm64-apple-darwin24)
```

**최신 계열(5.3)과 약 19년 차이가 납니다.**

### 3.2에 없는 것

bash 4.0에서 들어온 것 중 실무에서 자주 쓰이는 항목입니다. 메인테이너가 관리하는 NEWS 파일 기준입니다 (출처: [bash NEWS](https://tiswww.case.edu/php/chet/bash/NEWS), 확인: 2026-09-06).

> The shell provides associative array variables, with the appropriate support to create, delete, assign values to, and expand them.

> There is a new `mapfile' builtin to populate an array with lines from a given file. The name `readarray' is a synonym.

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

**맥의 bash에서는 연관 배열이 안 됩니다.** 눈여겨볼 것은 같은 맥의 **zsh는 된다**는 점입니다 — 로컬에서 zsh로 짜다가 bash 스크립트로 옮기면 여기서 걸립니다.

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

실무적으로는 동기보다 결과가 중요합니다. **맥에서 개발하면 bash 4/5 문법을 쓸 수 없거나, 쓰면 로컬에서만 깨집니다.** 최신 bash가 필요하면 Homebrew 등으로 따로 설치해야 하고, 그 경우 `/bin/bash`가 아니라 `/opt/homebrew/bin/bash`에 깔립니다.

> 위 설치 경로는 이 머신의 Homebrew 접두사에서 유추한 것이며 **실제로 설치해 확인하지 않았습니다 — 확인 필요.**

---

## 3. `sh`로 불리면 동작이 바뀝니다

Bash는 자기가 어떤 이름으로 호출됐는지 보고 모드를 바꿉니다. 실제로 확인했습니다.

```console
$ cat /tmp/who.sh
echo "\$0=$0  BASH_VERSION=$BASH_VERSION  posix옵션=$(set -o | grep -w posix)"

$ /bin/sh /tmp/who.sh
$0=/tmp/who.sh  BASH_VERSION=3.2.57(1)-release  posix옵션=posix          	on

$ /bin/bash /tmp/who.sh
$0=/tmp/who.sh  BASH_VERSION=3.2.57(1)-release  posix옵션=posix          	off
```

**같은 3.2.57인데 `posix` 옵션이 다릅니다.** 관찰 가능한 차이의 예:

```console
$ /bin/sh   -c 'echo "a\tb"' | od -c | head -1
0000000    a  \t   b  \n
$ /bin/bash -c 'echo "a\tb"' | od -c | head -1
0000000    a   \   t   b  \n
```

**`sh`로 부르면 `\t`가 탭이 되고 `bash`로 부르면 문자 그대로 남습니다.** 실행 파일은 하나입니다.
그래서 "이 스크립트는 bash로 돌아간다"는 말은 부정확합니다 — **어떤 이름으로 불렸는지까지 봐야** 합니다.

---

## 4. Bash가 가진 것 — POSIX 위의 확장

POSIX `sh`에 없고 Bash에 있는 것 중 자주 쓰이는 항목입니다. 아래는 로컬 3.2.57에서 확인한 것입니다.

```console
$ /bin/bash -c '[[ "abc" == a* ]] && echo "지원"'
지원
$ /bin/dash -c '[[ "abc" == a* ]] && echo "지원"'
/bin/dash: 1: [[: not found
```

| 기능 | 3.2에서 |
| --- | --- |
| `[[ ... ]]` 조건식, 패턴 매칭 | 있음 (위 실행 기록) |
| 인덱스 배열 `arr=(...)`, `${arr[@]}` | 있음 |
| `$(( ))` 산술 확장 | 있음 (POSIX에도 있음) |
| 프로세스 치환 `<(...)` | 있음 |
| **연관 배열 `declare -A`** | **없음** (위 실행 기록) |
| **`mapfile` / `readarray`** | **없음** — 4.0부터 |
| `${var^^}` 대소문자 변환 | **없음** — 4.0부터 |

배열 인덱스는 **0부터** 시작합니다. zsh와 다른 지점이라 §7에서 다시 다룹니다.

```console
$ /bin/bash -c 'arr=(첫째 둘째 셋째); echo "arr[1]=${arr[1]}  개수=${#arr[@]}"'
arr[1]=둘째  개수=3
```

---

## 5. 실무에서 어디에 쓰이는가

데이터 엔지니어 기준으로 Bash가 실제로 놓이는 자리입니다.

- **컨테이너 진입점과 빌드 단계** — Dockerfile의 `RUN`, `ENTRYPOINT`. 다만 `SHELL` 지시어를 주지 않으면 `/bin/sh`로 실행되므로 Bash 문법을 그대로 쓰면 안 됩니다.
- **CI 스텝** — 대부분의 CI가 Bash 또는 sh로 스텝을 돌립니다.
- **오케스트레이션 작업의 껍데기** — Airflow의 `BashOperator`, 크론 잡, `spark-submit` 래퍼.
- **운영 점검 스크립트** — 로그 훑기, 디스크 확인, 백필 트리거.

**언제 Bash를 쓰고 언제 Python으로 가는가**는 규모의 문제입니다(의견). 외부 명령을 이어 붙이고 종료 코드를 보는 일이 본론이면 Bash가 짧고 명확합니다. 반대로 자료구조·에러 처리·테스트가 필요해지는 순간부터는 Bash가 급격히 나빠집니다 — 배열은 있지만 중첩이 안 되고, 예외가 없고, 단위 테스트 수단이 빈약합니다.

---

## 6. 경계 — Bash가 안 맞는 곳

- **`#!/bin/sh`로 배포되는 스크립트.** Bash 확장을 쓸 수 없습니다. 쓸 거면 셔뱅을 `#!/bin/bash`로 명시해야 하고, 그러면 **대상 이미지에 bash가 설치돼 있어야** 합니다(슬림 이미지에는 없는 경우가 흔합니다).
- **맥에서 개발하고 리눅스에 배포하는 경우.** 로컬은 3.2, 배포 대상은 5.x인 비대칭이 생깁니다. 방향에 따라 증상이 다릅니다 — 로컬에서 안 되던 게 서버에서 되거나(4.0+ 문법), 로컬에서 되던 게 서버에서 안 됩니다(dash로 떨어질 때).
- **자료구조가 필요한 로직.** 3.2에는 연관 배열조차 없습니다.
- **정확한 소수 계산.** 정수 산술만 있습니다. `bc`·`awk` 같은 외부 명령이 필요합니다.
- **동시성 제어가 필요한 작업.** `&`와 `wait`는 있지만 실패 처리·재시도·부분 실패 집계를 짜기 시작하면 언어를 바꾸는 게 낫습니다(의견).

---

## 7. 실패 모드

### (a) 로컬 맥에서 `declare: -A: invalid option`

§2의 실행 기록. 인터넷에서 찾은 예제나 리눅스 서버에서 쓰던 스크립트를 맥으로 가져올 때 나옵니다.
**원인은 문법이 틀린 게 아니라 bash가 오래된 것**이라, 문법을 고치려 들면 시간을 버립니다. `bash --version`을 먼저 봅니다.

### (b) 셔뱅과 실제 문법의 불일치가 맥에서 안 걸림

`#!/bin/sh`를 붙이고 `[[ ]]`를 써도, 맥의 `/bin/sh`는 bash라 통과합니다(§3). 컨테이너에서 처음 터집니다.
**방어**: 이 맥에는 `/bin/dash`가 있으므로 `dash script.sh`로 한 번 돌려 보면 됩니다.

### (c) 따옴표 없는 변수 확장

```console
$ cat split.sh
files="a.csv b.csv c.csv"
count=0
for f in $files; do count=$((count + 1)); done
echo "루프 반복 횟수: $count"

path="/data/my report.csv"
[ -n "$path" ] && set -- $path
echo "인자 개수: $#"

$ /bin/bash split.sh
루프 반복 횟수: 3
인자 개수: 2
```

두 번째 결과가 문제입니다. **경로 하나가 인자 두 개가 됐습니다** — 파일명에 공백이 있기 때문입니다.
Bash에서 변수는 기본적으로 단어 분리를 거치므로, 파일 경로를 다룰 때는 항상 `"$path"`로 감싸야 합니다.
같은 스크립트를 zsh로 돌리면 다른 결과가 나옵니다(반복 1회, 인자 1개) — 같은 코드가 셸에 따라 다르게 동작한다는 뜻입니다.

### (d) 파이프 중간의 실패가 무시됨

`set -e`만 걸어두면 파이프라인 중간 명령의 실패가 넘어갑니다. 종료 코드는 마지막 명령의 것이기 때문입니다.
`set -o pipefail`이 필요하고, `set -u`(미정의 변수 오류)와 함께 쓰는 것이 관행입니다(의견).

> 위 항목은 널리 알려진 동작이지만 **이 문서에서 실행으로 재현하지 않았습니다 — 확인 필요.**

---

## 출처

- POSIX Shell Command Language — [The Open Group Base Specifications Issue 8, IEEE Std 1003.1-2024, Chapter 2](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-06)
- bash NEWS (연관 배열·mapfile 도입 시점) — [tiswww.case.edu/php/chet/bash/NEWS](https://tiswww.case.edu/php/chet/bash/NEWS) (확인: 2026-09-06)
- 릴리스 게시일·`COPYING` — [ftp.gnu.org/gnu/bash/](https://ftp.gnu.org/gnu/bash/) 직접 조회 (2026-09-06)
- 실행 기록 — macOS Darwin 24.6.0 / arm64 / bash 3.2.57 / dash / zsh 5.9, 2026-09-06 직접 실행

---

*작성일: 2026-09-06*
