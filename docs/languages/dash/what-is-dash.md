---
sidebar_position: 1
---

# dash란 무엇인가 — 리눅스에서 `#!/bin/sh`를 실제로 읽는 것

맥에서 짠 `#!/bin/sh` 스크립트가 컨테이너에서 터진다면, 대개 그것을 읽은 것이 dash입니다.
**dash는 "작고 빠른 셸"이라기보다, 이식성이 실제로 검사당하는 지점**입니다 — 리눅스 배포판 대부분에서 `#!/bin/sh`의 해석자이기 때문입니다.

이 문서는 세 가지에 답합니다. dash가 무엇이고, **무엇이 없으며**, 없는 것을 건드렸을 때 **어떻게 실패하는가**.
마지막 것이 이 문서의 중심입니다 — dash의 실패는 요란하게 죽는 쪽보다 **조용히 잘못된 값을 내거나, 실패하고도 0을 반환하는 쪽**이 위험합니다(§7).

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | 값 |
| --- | --- |
| OS | macOS 15.7.4 (Darwin 24.6.0), 빌드 24G517 |
| CPU / 메모리 | Apple M4 Pro, 14코어 / 24 GiB |
| `/bin/dash` | Apple 패키지 `dash-16` — **상위 버전 번호는 확인하지 못했습니다**(§8) |
| `/bin/bash` | GNU bash 3.2.57(1)-release (arm64-apple-darwin24) |
| `/bin/zsh` | zsh 5.9 |
| `/bin/sh` | bash 3.2.57로 re-exec (`/private/var/select/sh -> /bin/bash`) |
| 실행 날짜 | 2026-09-06 |

리눅스 배포판의 동작은 **문서로만 확인했고 재현하지 못했습니다**(Docker 데몬 미동작). 해당 항목마다 표시해 두었습니다.

---

## 1. 무엇인가

Debian 패키지 설명이 한 줄로 정의합니다.

> The Debian Almquist Shell (dash) is a POSIX-compliant shell derived from ash.
>
> — [packages.debian.org, dash 0.5.12-12 (trixie/stable)](https://packages.debian.org/en/stable/dash) (확인: 2026-09-06)

이름 그대로 **Almquist shell(ash)에서 갈라져 나온 Debian 계열의 구현체**입니다. 상위 소스는 kernel.org에 있고 Herbert Xu가 관리합니다.

| 항목 | 값 | 확인 방법 |
| --- | --- | --- |
| 상위 저장소 | `git://git.kernel.org/pub/scm/utils/dash/dash.git` | [kernel.googlesource.com 미러](https://kernel.googlesource.com/pub/scm/utils/dash/dash/) 조회 (2026-09-06) |
| 최신 태그 | `v0.5.13.5` — 조회 시점 기준 약 7주 전 릴리스 | 〃 |
| Debian stable(trixie) 패키지 | `0.5.12-12`, 설치 크기 207.0 kB (amd64) | [packages.debian.org](https://packages.debian.org/en/stable/dash) |

**상위 최신판과 배포판이 싣는 판이 다릅니다.** 이 간격이 §5의 `pipefail` 문제를 만듭니다.

여기서 오해하기 쉬운 지점이 하나 있습니다. **dash는 "POSIX 규격 그 자체"가 아니라 규격을 만족하는 구현체 하나입니다.** 그리고 아래 §3에서 보듯 **규격에 없는 것도 일부 갖고 있습니다.**

---

## 2. 어디가 dash인가

### Debian·Ubuntu — `/bin/sh`가 dash입니다

Debian 위키의 서술입니다.

> Beginning with DebianSqueeze, Debian uses Dash (the Debian Almquist shell) as the target of the /bin/sh symlink.
>
> Dash lacks many of the features one would expect in an interactive shell, which allows it to be faster and more memory efficient than Bash.
>
> — [wiki.debian.org/Shell](https://wiki.debian.org/Shell) (확인: 2026-09-06)

같은 문서는 선택권이 사라졌다는 것도 밝힙니다.

> From DebianSqueeze to DebianBullseye, it was possible to select Bash as the target of the /bin/sh symlink by running `dpkg-reconfigure dash`. However, as of DebianBookworm, this is no longer supported.

즉 **Bookworm 이후로는 `/bin/sh`를 bash로 되돌리는 지원 경로가 없습니다.** "그냥 bash로 바꿔서 쓰면 되지"가 통하지 않는다는 뜻입니다. **문서로 확인, 미재현.**

### macOS — dash는 설치돼 있지만 `sh`가 아닙니다

이 맥에는 `/bin/dash`가 존재합니다. 그런데 `/bin/sh`는 dash가 아닙니다. `sh(1)` man page가 구조를 설명합니다.

```
$ man 1 sh | col -b | grep -A4 'determined by the symbolic'
     by re-execing as either bash(1), dash(1), or zsh(1) as determined by the
     symbolic link located at /private/var/select/sh.  If
     /private/var/select/sh does not exist or does not point to a valid shell,
     sh will use one of the supported shells.
```

현재 링크는 bash를 가리킵니다.

```
$ ls -l /private/var/select/sh
lrwxr-xr-x  1 root  wheel  9  2  1  2026 /private/var/select/sh -> /bin/bash

$ /bin/sh -c 'echo "[$BASH_VERSION]"'
[3.2.57(1)-release]
```

**결론: 맥에서 `#!/bin/sh` 스크립트를 아무리 돌려봐도 dash 호환성 검사가 되지 않습니다.** 검사하려면 `/bin/dash`를 직접 불러야 합니다.

### 정리

| 환경 | `#!/bin/sh`를 읽는 것 | 확인 |
| --- | --- | --- |
| Debian Bookworm 이후 · Ubuntu | dash | 문서로 확인, **미재현** |
| macOS (이 머신) | bash 3.2.57 (re-exec) | **직접 확인** |
| Alpine | BusyBox ash — dash가 **아닙니다** | **확인 필요** (§8) |

세 번째 줄이 흔한 오해입니다. "슬림 컨테이너 = dash"가 아닙니다. Alpine의 `/bin/sh`는 BusyBox의 ash이고 dash와 같은 계보이되 같은 구현이 아닙니다 — 이 문서에서는 확인하지 못했습니다.

---

## 3. dash는 "순수 POSIX 셸"이 아닙니다

가장 흔한 오해입니다. **Debian의 `/bin/sh`는 POSIX에 다섯 가지를 더한 것**이고, 그건 Debian Policy가 명시적으로 요구하는 사항입니다.

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
> — [Debian Policy Manual §10.4](https://www.debian.org/doc/debian-policy/ch-files.html) (확인: 2026-09-06)

로컬 dash에서 실제로 확인했습니다.

```
$ /bin/dash -c 'f() { local x=1; echo "local ok=$x"; }; f'
local ok=1

$ /bin/dash -c '[ 1 -eq 1 -a 2 -eq 2 ] && echo "test -a ok"'
test -a ok
```

**그래서 `local`이 dash에서 돈다고 해서 그 스크립트가 POSIX인 것은 아닙니다.** `local`은 POSIX에 없습니다. Debian 밖의 다른 `sh` 구현에서는 보장되지 않습니다.

또 하나. Policy가 `echo -n`을 요구한다는 점이 맥에서 역방향으로 물립니다.

```
$ /bin/dash -c 'echo -n x' | od -c | head -1
0000000    x
$ /bin/sh   -c 'echo -n x' | od -c | head -1
0000000    -   n       x  \n
```

**dash에서는 `-n`이 동작하는데, 맥의 `/bin/sh`에서는 `-n`이 그대로 출력됩니다.** "리눅스에서 되던 게 맥에서 깨지는" 방향입니다. 흔히 경고하는 방향의 반대라 놓치기 쉽습니다.

---

## 4. 무엇이 없는가 — 실측

같은 표현식을 네 셸에 넣고 첫 줄만 잘라 비교했습니다. **직접 실행한 결과입니다.**

| 표현식 | dash | `/bin/sh`(=bash) | bash 3.2 | zsh 5.9 |
| --- | --- | --- | --- | --- |
| `local x=1` | `ok1` | `ok1` | `ok1` | `ok1` |
| `arr=(a b); ${arr[1]}` | `Syntax error` | `b` | `b` | `a` |
| `[[ a == a ]]` | `[[: not found` | `ok` | `ok` | `ok` |
| `echo {1..3}` | `{1..3}` | `1 2 3` | `1 2 3` | `1 2 3` |
| `cat <(echo ok)` | `Syntax error` | `syntax error` | `ok` | `ok` |
| `$'a\tb'` | `$a\tb` | 탭 | 탭 | 탭 |
| `[ x == x ]` | `unexpected operator` | `ok` | `ok` | `= not found` |
| `${v:0:2}` | `Bad substitution` | `ab` | `ab` | `ab` |
| `let i=1+1` | `let: not found` | `2` | `2` | `2` |
| `source ./f` | `source: not found` | `ok` | `ok` | `ok` |
| `function f { }` | `Syntax error` | `ok` | `ok` | `ok` |
| `cat <<< ok` | `Syntax error` | — | `ok` | `ok` |
| `$RANDOM` | 빈 값 | — | `10023` | `12227` |
| `$SECONDS` | 빈 값 | — | `0` | `0` |
| `trap ... ERR` | `bad trap` | — | `trapped` | `trapped` |
| `$((2**3))` | `arithmetic error` | — | `8` | `8` |
| `${PIPESTATUS[0]}` | `Bad substitution` | — | `[0]` | `[]` |
| `test -a` | `ok` | `ok` | `ok` | `ok` |

세 줄을 따로 봐야 합니다.

- **`echo {1..3}` → `{1..3}`**: 오류가 아닙니다. **리터럴 문자열이 그대로 흘러갑니다.**
- **`$'a\tb'` → `$a\tb`**: 오류가 아닙니다. **달러 기호까지 붙은 쓰레기 값이 변수에 들어갑니다.**
- **`$((2**3))`**: `**` 거듭제곱은 POSIX 산술에 없습니다. dash는 여기서 오류를 냅니다.

앞의 두 줄이 이 문서에서 가장 중요한 부분입니다. **죽지 않고 틀린 값을 내는 경우**이고, 파일 경로나 날짜 범위를 만드는 데 쓰였다면 잘못된 대상에 작업이 나갑니다.

`$(( ))` 산술과 `$RANDOM`을 헷갈리지 마십시오. **`$(( ))` 자체는 POSIX에 있고 dash도 지원합니다** — 없는 것은 `**` 연산자와 `$RANDOM` 변수입니다.

---

## 5. 버전에 따라 답이 갈리는 것 — `pipefail`

`set -o pipefail`은 "dash에 없다"고 널리 이야기되지만, **지금은 판에 따라 다릅니다.** 데이터 파이프라인에서는 이게 결정적이라 따로 둡니다.

이 맥의 dash에는 없습니다.

```
$ /bin/dash -c 'set -o pipefail && echo ok'
/bin/dash: 1: set: Illegal option -o pipefail
```

그런데 Debian stable(trixie)의 dash 0.5.12-12 man page에는 있습니다.

> **pipefail** Derive the exit status of a pipeline from the exit statuses of all of the commands in the pipeline, not just the last command, as described in the Pipelines section.
>
> — [manpages.debian.org, sh(1) — dash — trixie](https://manpages.debian.org/trixie/dash/sh.1.en.html) (확인: 2026-09-06)

들어온 시점도 특정됩니다.

> Upstream patch:
>     - Implement pipefail option (Closes: #1071238)
>
> — [dash 0.5.12-7 changelog, Fri, 17 May 2024](https://metadata.ftp-master.debian.org/changelogs/main/d/dash/dash_0.5.12-12_changelog) (확인: 2026-09-06)

규격 쪽에서도 확정된 사항입니다. Austin Group(POSIX 유지보수 기구) 이슈 0000789 "Add set -o pipefail"은 **Closed / Accepted As Marked**이고 대상 판은 **Issue 8 = IEEE Std 1003.1-2024**입니다([austingroupbugs.net/view.php?id=789](https://www.austingroupbugs.net/view.php?id=789), 확인 2026-09-06).

정리하면 이렇습니다.

| 대상 | `set -o pipefail` | 확인 |
| --- | --- | --- |
| POSIX Issue 8 (2024) | 규격에 포함 | Austin Group 이슈로 확인 |
| dash ≥ 0.5.12-7 (Debian) | 있음 | man page로 확인, **미재현** |
| macOS `/bin/dash` (dash-16) | **없음** | **직접 확인** |

**`${PIPESTATUS[@]}`는 어느 판에도 없습니다.** trixie man page에도 없습니다. 파이프 중간의 실패를 개별로 집어내야 한다면 dash로는 방법이 없고, 스크립트를 bash로 올리거나 파이프를 풀어 임시 파일로 끊어야 합니다.

---

## 6. 왜 dash를 쓰는가 — "빠르다"의 실제 크기

Debian 위키가 드는 이유는 속도와 메모리입니다(§2 인용). 그 말이 맞는지 재 봤습니다.

**측정 조건**: macOS 15.7.4 / Apple M4 Pro 14코어 / 24 GiB, 직렬 단일 프로세스, 외부 명령 없음, `/usr/bin/time -p`의 `real`, 각 3회.

**(A) 기동 비용 — 셸을 1,000번 새로 띄우고 즉시 종료**

```
$ i=0; while [ $i -lt 1000 ]; do <셸> -c ':'; i=$((i+1)); done
```

| 셸 | 1회차 | 2회차 | 3회차 |
| --- | --- | --- | --- |
| `/bin/dash` | 1.15s | 1.13s | 1.14s |
| `/bin/bash` | 1.41s | 1.38s | 1.40s |
| `/bin/zsh` | 2.10s | 2.09s | 2.23s |
| `/bin/sh` (=bash) | 2.22s | 2.27s | 2.25s |

**(B) 순수 인터프리터 루프 — 산술 100,000회, 외부 명령 없음**

```
$ <셸> -c 'i=0; while [ $i -lt 100000 ]; do i=$((i+1)); done'
```

| 셸 | 1회차 | 2회차 | 3회차 |
| --- | --- | --- | --- |
| `/bin/dash` | 0.11s | 0.10s | 0.11s |
| `/bin/bash` | 0.23s | 0.22s | 0.23s |
| `/bin/zsh` | 0.12s | 0.12s | 0.12s |

읽을 점 셋입니다.

1. **기동은 bash 대비 약 1.2배, 루프는 약 2배 빠릅니다.** 흔히 도는 "훨씬 빠르다"는 이 정도 규모입니다. 이 조건에서 잰 값이고, 외부 명령(`grep`, `awk`)을 한 번이라도 부르면 그 프로세스 비용이 셸 차이를 덮습니다.
2. **루프에서 zsh(0.12s)가 dash(0.11s)와 사실상 같습니다.** "바이너리가 작아서 빠르다"는 설명이 여기서 깨집니다 — zsh 바이너리는 dash의 약 5배입니다.
3. **`/bin/sh`가 `/bin/bash`보다 느립니다(2.25s vs 1.40s).** 같은 bash 3.2.57인데도 그렇습니다. 원인을 분리해 봤습니다.

```
$ /bin/bash -c :          → real=1.43s
$ /bin/bash --posix -c :  → real=1.39s
$ /bin/sh -c :            → real=2.22s
```

**`posix` 모드 자체는 비용이 없습니다.** 차이는 `/bin/sh`라는 별도 바이너리가 bash로 **re-exec** 하는 데서 옵니다 — man page가 "by re-execing"이라고 쓴 그 동작입니다(§2). 맥에서 `sh` 루프를 많이 도는 빌드 스크립트라면 `bash`를 직접 부르는 편이 빠릅니다.

크기와 의존성도 확인했습니다.

```
$ ls -l /bin/dash /bin/bash /bin/zsh   (바이트)
   274272 /bin/dash
  1310224 /bin/bash
  1361200 /bin/zsh

$ otool -L /bin/dash
	/usr/lib/libSystem.B.dylib
$ otool -L /bin/bash
	/usr/lib/libncurses.5.4.dylib
	/usr/lib/libSystem.B.dylib
```

**dash는 libSystem 하나에만 의존합니다.** bash는 libncurses를 더 답니다. 부팅 초기나 복구 환경처럼 라이브러리가 덜 올라온 시점에 `/bin/sh`가 dash인 것은 이 의존성 차이가 이유입니다.

---

## 7. 실패 모드

### (a) 실패했는데 종료 코드가 0 — 가장 위험합니다

`[[ ]]`는 dash에서 **파싱 오류가 아니라 "명령을 못 찾음"** 입니다. 그래서 스크립트가 멈추지 않습니다.

```
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

### (b) 앞부분은 실행된 뒤 중간에서 죽음

배열 문법은 파싱 오류입니다. 그런데 dash는 파일 전체를 미리 파싱하지 않고 읽어 가며 실행합니다.

```
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

### (c) 오류 없이 다른 값

§4의 두 줄이 여기 해당합니다.

```
$ /bin/dash -c 'echo {1..3}'
{1..3}
$ /bin/dash -c "printf '%s\n' \$'a\tb'"
$a\tb
```

`for d in {1..30}`으로 날짜 파티션을 도는 스크립트라면, dash에서는 **`{1..30}`이라는 이름의 파티션 하나**를 처리하려 듭니다. 오류도 안 납니다.

### (d) `echo`로 만든 데이터가 환경마다 다름

```
$ /bin/dash -c 'echo "a\tb"' | od -c | head -1
0000000    a  \t   b  \n
$ /bin/bash -c 'echo "a\tb"' | od -c | head -1
0000000    a   \   t   b  \n
```

**dash의 `echo`는 백슬래시 이스케이프를 해석하고, bash의 `echo`는 해석하지 않습니다.** TSV를 `echo`로 만들면 dash에서는 탭 구분 파일이, bash에서는 `\t` 두 글자가 든 파일이 나옵니다. `printf`는 네 셸에서 모두 같았습니다.

```
$ for s in /bin/dash /bin/sh /bin/bash /bin/zsh; do $s -c 'printf "a\tb\n"' | od -c | head -1; done
0000000    a  \t   b  \n      (넷 모두 동일)
```

**규칙: 이식성이 필요한 자리에서 `echo`를 쓰지 말고 `printf`를 씁니다.**

---

## 8. 경계 — dash가 안 맞는 곳

- **파이프 중간의 실패를 잡아야 하는 처리.** `${PIPESTATUS[@]}`가 없습니다. `pipefail`도 판에 따라 없습니다(§5). `psql ... | gzip > out.gz` 형태에서 앞 단계 실패를 알아야 한다면 dash는 맞지 않습니다.
- **자료구조가 필요한 로직.** 배열이 없습니다. 연관 배열은 물론 없습니다. 목록을 다루려면 문자열과 `IFS`로 흉내 내야 하고, 공백 든 파일명에서 깨집니다.
- **대화형 사용.** vi/emacs 편집 모드는 있습니다(`/bin/dash -V`, `-E` 모두 수용됨 — 직접 확인). 그러나 보완·프롬프트 확장·이력 관리가 bash·zsh 수준이 아니므로 로그인 셸로 쓸 이유가 없습니다.
- **문자열 조작이 많은 스크립트.** `${v:0:2}`, `${v^^}`, `${v/a/b}`가 없습니다. `cut`·`sed`를 부르게 되고, 그러면 §6의 속도 이점이 외부 프로세스 비용에 묻힙니다.
- **속도가 목적인 경우.** 위 조건에서 bash 대비 1.2~2배입니다. 이 차이를 위해 배열을 포기할 값어치가 있는지는 스크립트가 무엇을 하느냐에 달렸습니다. 반대로 **패키지 관리자 훅이나 부팅 스크립트처럼 수천 번 짧게 도는 자리**에서는 그 배수가 의미를 갖습니다.

**dash를 "고르는" 상황은 사실 드뭅니다.** 대개는 고르는 게 아니라 `#!/bin/sh`를 썼기 때문에 배포 환경에서 dash가 배정되는 것입니다. 그래서 실질적인 판단은 "dash를 쓸까"가 아니라 **"셔뱅을 `#!/bin/sh`로 둘까 `#!/bin/bash`로 바꿀까"** 입니다.

---

## 확인하지 못한 것

- **macOS `/bin/dash`의 상위 버전.** 바이너리에는 Apple 패키지 문자열(`PROGRAM:dash PROJECT:dash-16`)만 있고 `--version`은 없습니다(`Illegal option --`). dash-16이 상위 0.5.x 중 어느 판인지 확인하지 못했습니다. 그래서 이 문서의 dash 실행 결과는 **"이 맥의 dash-16 기준"**이지 "dash 일반"이 아닙니다.
- **리눅스에서의 재현.** Debian·Ubuntu의 `/bin/sh`가 dash라는 것, trixie의 dash에 `pipefail`이 있다는 것은 **문서로만 확인했습니다.** Docker 데몬이 떠 있지 않아 재현하지 못했습니다.
- **Alpine의 `/bin/sh`.** BusyBox ash로 알려져 있으나 이 문서에서 확인하지 않았습니다. dash와 동작이 같다고 가정하면 안 됩니다.
- **상위 프로젝트 홈페이지**(`gondor.apana.org.au/~herbert/dash/`)는 접속이 거부되어(ECONNREFUSED) 확인하지 못했습니다. 계보와 릴리스는 kernel.org 미러와 Debian 패키지 설명으로 대신했습니다.
- **dash의 메모리 사용량.** Debian 위키가 "more memory efficient"라고 하지만 측정하지 않았습니다. 이 문서의 수치는 시간과 바이너리 크기뿐입니다.

---

## 출처

- Debian 패키지 dash 0.5.12-12 (trixie/stable) — [packages.debian.org/en/stable/dash](https://packages.debian.org/en/stable/dash) (확인: 2026-09-06)
- Debian Wiki, Shell — [wiki.debian.org/Shell](https://wiki.debian.org/Shell) (확인: 2026-09-06)
- Debian Policy Manual §10.4 Scripts — [debian.org/doc/debian-policy/ch-files.html](https://www.debian.org/doc/debian-policy/ch-files.html) (확인: 2026-09-06)
- dash man page (trixie) — [manpages.debian.org/trixie/dash/sh.1.en.html](https://manpages.debian.org/trixie/dash/sh.1.en.html) (확인: 2026-09-06)
- dash 0.5.12-12 Debian changelog (`pipefail` 도입: 0.5.12-7, 2024-05-17) — [metadata.ftp-master.debian.org](https://metadata.ftp-master.debian.org/changelogs/main/d/dash/dash_0.5.12-12_changelog) (확인: 2026-09-06)
- Austin Group Issue 0000789 "Add set -o pipefail" — Closed / Accepted As Marked / Issue 8 — [austingroupbugs.net/view.php?id=789](https://www.austingroupbugs.net/view.php?id=789) (확인: 2026-09-06)
- 상위 저장소 태그 목록 (`v0.5.13.5`) — [kernel.googlesource.com/pub/scm/utils/dash/dash](https://kernel.googlesource.com/pub/scm/utils/dash/dash/) (확인: 2026-09-06)
- macOS `sh(1)` man page (macOS 15.7, 2019-02-08자) — 로컬 `man 1 sh` (확인: 2026-09-06)
- 실행 기록 — macOS 15.7.4 / Darwin 24.6.0 / Apple M4 Pro / dash-16 · bash 3.2.57 · zsh 5.9, 2026-09-06 직접 실행

---

*작성일: 2026-09-06*
