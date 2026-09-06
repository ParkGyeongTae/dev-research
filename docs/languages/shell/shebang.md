---
sidebar_position: 9
---

# 셔뱅이란 무엇인가 — 셸이 아니라 커널이 읽는 첫 줄

`#!/bin/bash`을 "셸에게 주는 지시"로 이해하면 대부분의 동작이 설명되지 않습니다.
셔뱅을 읽는 것은 셸이 아니라 **커널의 `execve()`** 이고, 커널은 그 줄을 문법이 아니라 **파일 맨 앞 두 바이트짜리 매직 넘버**로 취급합니다. 그래서 셔뱅의 규칙은 셸 문법이 아니라 **커널 구현마다 다른 규칙**이고, 실제로 macOS와 Linux가 다릅니다.

이 문서가 잡으려는 것은 셋입니다. **누가 이 줄을 읽는가**, **읽어서 무엇을 만드는가**, 그리고 **그 결과가 두 커널에서 어떻게 갈라지는가**입니다. 세 번째가 중심입니다 — 맥에서 통과한 셔뱅이 컨테이너에서 다른 뜻이 되거나, 아예 다른 프로그램에게 넘어가는 일이 여기서 나옵니다.

## 실행 환경

아래 실행 기록은 모두 이 두 환경에서 **직접 돌린 결과**입니다.

| 항목 | macOS | Linux (컨테이너) |
| --- | --- | --- |
| OS | macOS 15.7.4 (빌드 24G517) | Debian 13.6 (trixie) |
| 커널 | Darwin 24.6.0 / `xnu-11417.140.69.708.3` | `6.12.76-linuxkit` |
| CPU | Apple M4 Pro 14코어 / 24 GiB | 같은 머신, aarch64 |
| `/bin/sh` | bash 3.2.57로 re-exec | dash 0.5.12-12 |
| bash | 3.2.57(1)-release | 5.2.37(1)-release |
| python3 | 3.13.2 (Anaconda 패키지) | 3.14.7 (`python:3-slim`) |
| 실행 경로 | 로컬 | Docker 29.3.1 / `debian:trixie-slim@sha256:d7e12182…`, `python:3-slim@sha256:cad9a2c8…` |
| 실행 날짜 | 2026-09-06 | 2026-09-06 |

커널이 만든 `argv`를 그대로 보기 위해 인자 덤프용 C 프로그램을 각 환경에서 컴파일해 썼습니다. macOS에서는 `show`, Linux에서는 `show_lin`이라는 이름입니다.

```c
#include <stdio.h>
int main(int argc, char **argv) {
    int i;
    for (i = 0; i < argc; i++) printf("argv[%d]=[%s]\n", i, argv[i]);
    return 0;
}
```

Linux 쪽 실행 기록은 **Docker Desktop이 띄운 linuxkit 커널 하나**에서만 얻은 것입니다. 다른 배포판 커널·다른 아키텍처는 확인하지 못했습니다.

---

## 1. 이 줄을 읽는 것은 셸이 아닙니다

먼저 규격부터 못 박아 둘 필요가 있습니다. **POSIX는 `#!`를 규범으로 정하지 않았습니다.** `sh` 페이지에서 `#!`가 나오는 자리는 APPLICATION USAGE 절이고, 문장 자체가 "지원하는 시스템에서는"이라는 조건을 달고 있습니다.

> Furthermore, on systems that support executable scripts (the "#!" construct), it is recommended that applications using executable scripts install them using `getconf PATH` to determine the shell pathname and update the "#!" script appropriately as it is being installed
>
> — [The Open Group Base Specifications Issue 8 (POSIX.1-2024), `sh`, APPLICATION USAGE](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html) (확인: 2026-09-06)

규격이 정의하지 않았으니 정의는 각 커널 문서에 있습니다. Linux의 `execve(2)`가 이렇게 씁니다.

> An interpreter script is a text file that has execute permission enabled and whose first line is of the form:
>
> `#!interpreter [optional-arg]`
>
> The interpreter must be a valid pathname for an executable file.
>
> — [`execve(2)`, Linux man-pages 6.18 (2026-02-08)](https://man7.org/linux/man-pages/man2/execve.2.html) (확인: 2026-09-06)

`execve(2)`는 **시스템 콜 문서**입니다. 즉 셔뱅 처리는 셸이 아니라 커널의 프로그램 적재 단계에 들어 있습니다. macOS 쪽도 같습니다 — XNU 소스에 `exec_shell_imgact()`라는 이미지 액티베이터가 있고, 파일의 첫 두 바이트가 `#!`인지부터 봅니다.

```c
	/*
	 * Make sure it's a shell script.  If we've already redirected
	 * from an interpreted file once, don't do it again.
	 */
	if (vdata[0] != '#' ||
	    vdata[1] != '!' ||
	    (imgp->ip_flags & IMGPF_INTERPRET) != 0) {
		return -1;
	}
```

— [apple-oss-distributions/xnu, `bsd/kern/kern_exec.c`, 태그 `xnu-11417.140.69`](https://github.com/apple-oss-distributions/xnu/blob/xnu-11417.140.69/bsd/kern/kern_exec.c) (확인: 2026-09-06). 이 맥이 돌리는 커널은 `xnu-11417.140.69.708.3`이고, 공개된 소스 태그 중 가장 가까운 것이 `xnu-11417.140.69`입니다.

커널이 하는 일은 눈으로 볼 수 있습니다. 위 C 프로그램을 해석자로 지정해 두고 스크립트를 실행하면, 커널이 **새로 조립한 `argv`가 그대로** 찍힙니다.

```console
$ printf '#!./show\nbody\n' > t; chmod +x t
$ ./t X Y
argv[0]=[./show]
argv[1]=[./t]
argv[2]=[X]
argv[3]=[Y]
```

`./t`를 실행했는데 실행된 프로그램은 `./show`이고, 원래 명령줄에 없던 `./t`가 인자로 끼워져 있습니다. **셸은 `./t`를 `execve()`에 넘겼을 뿐이고, 인자를 이렇게 바꿔 끼운 것은 커널입니다.**

여기서 `#`으로 시작하는 이유도 따라 나옵니다. 커널에게 `#!`는 주석 기호가 아니라 **ELF의 `\x7fELF`와 같은 자리의 매직 넘버**입니다. 다만 그 두 바이트를 하필 `#!`로 고른 덕분에, 뒤이어 파일을 읽는 셸·Python·Perl에게는 그 줄이 자연스럽게 주석이 됩니다. 한 줄이 두 독자에게 다른 뜻으로 읽히도록 만든 설계입니다.

그래서 **커널을 거치지 않으면 셔뱅은 아무 힘이 없습니다.** 해석자를 직접 지정해 부르면 그 줄은 그냥 주석입니다.

```console
$ printf '#!/bin/nosuchshell\necho "body ran under: $0"\n' > u; chmod +x u
$ ./u
/bin/bash: ./u: /bin/nosuchshell: bad interpreter: No such file or directory
$ /bin/sh u
body ran under: u
```

(이 맥의 bash 3.2에서 돌린 것입니다. 메시지 맨 앞의 `/bin/bash:`는 오류를 낸 셸이 자기 이름을 붙인 것입니다.)

`sh u`는 존재하지 않는 해석자를 적어 놓고도 잘 돌아갑니다. `python job.py`, `bash deploy.sh`, Dockerfile의 `RUN sh -c ...`가 모두 이 경로입니다 — **그렇게 부르는 한 셔뱅이 틀려 있어도 아무 일도 일어나지 않습니다.** 셔뱅이 틀린 스크립트가 CI를 통과해 배포까지 가는 흔한 이유입니다.

---

## 2. 커널이 조립하는 `argv`

`execve(2)`가 조립 규칙을 명시합니다.

> interpreter will be invoked with the following arguments:
>
> `interpreter [optional-arg] path arg...`
>
> where `arg...` is the series of words pointed to by the `argv` argument of `execve()`, starting at `argv[1]`. Note that there is no way to get the `argv[0]` that was passed to the `execve()` call.
>
> — [`execve(2)`, Linux man-pages 6.18](https://man7.org/linux/man-pages/man2/execve.2.html) (확인: 2026-09-06)

마지막 문장이 실무에서 걸립니다. **원래 `argv[0]`은 버려집니다.** Python으로 `argv[0]`을 일부러 다른 값으로 넣어 `execv()`를 불러 봤습니다.

```console
$ python3 -c "import os; os.execv('./t', ['ZERO','A','B'])"
argv[0]=[./show]
argv[1]=[./t]
argv[2]=[A]
argv[3]=[B]
```

`ZERO`는 어디에도 없습니다. Linux(`python:3-slim`)에서도 같은 결과였습니다. 그래서 **스크립트 안의 `$0`은 "나를 어떻게 불렀는가"가 아니라 "커널이 넣어 준 스크립트 경로"** 입니다. `argv[0]`을 바꿔 넣어 동작을 분기시키는 기법(bash가 `sh`라는 이름으로 불리면 POSIX 모드로 도는 것 같은)은 셔뱅 스크립트에는 쓸 수 없습니다.

끼워 넣어지는 경로는 **호출자가 쓴 형태 그대로**입니다. 커널이 절대 경로로 정규화하지 않습니다.

```console
### macOS  (긴 작업 디렉터리 경로는 …로 줄였습니다)
relative  : argv[1]=[./t]
absolute  : argv[1]=[/private/tmp/…/scratchpad/sb/t]
via PATH  : argv[1]=[/private/tmp/…/scratchpad/sb/bin/mytool]

### Linux  (작업 디렉터리 /w)
relative  : argv[1]=[./t]
absolute  : argv[1]=[/w/t]
via PATH  : argv[1]=[/w/bin/mytool]
```

(`via PATH`는 스크립트를 `PATH` 안 디렉터리에 두고 이름만으로 부른 경우입니다. `PATH` 검색은 셸이 하고, 셸은 찾아낸 **전체 경로**를 `execve()`에 넘기므로 절대 경로가 들어옵니다.)

그래서 `$0` 기준으로 스크립트 자신의 위치를 계산하는 관용구(`cd "$(dirname "$0")"`)는 **부른 방식에 따라 상대 경로를 받습니다.** 그 상대 경로는 **호출 시점의 작업 디렉터리 기준**이라, 스크립트가 중간에 `cd`를 했다면 이미 의미가 달라진 뒤입니다.

---

## 3. 인자가 하나인가 여럿인가 — 여기서 맥과 리눅스가 갈립니다

`#!interpreter [optional-arg]`의 `optional-arg`를 커널이 어떻게 쪼개는지가 **구현마다 다릅니다.** man page가 이 점을 명시적으로 경고합니다.

> The semantics of the `optional-arg` argument of an interpreter script vary across implementations. On Linux, the entire string following the interpreter name is passed as a single argument to the interpreter, and this string can include white space. However, behavior differs on some other systems. Some systems use the first white space to terminate `optional-arg`. On some systems, an interpreter script can have multiple arguments, and white spaces in `optional-arg` are used to delimit the arguments.
>
> — [`execve(2)`, Linux man-pages 6.18](https://man7.org/linux/man-pages/man2/execve.2.html) (확인: 2026-09-06)

macOS는 마지막 부류입니다. XNU 소스가 "토큰화"라고 적어 두었습니다.

```c
	if ((imgp->ip_flags & IMGPF_INTERPRET) != 0) {
		...
		/* First, the arguments in the "#!" string are tokenized and extracted. */
		argstart = imgp->ip_interp_buffer;
```

— [apple-oss-distributions/xnu, `bsd/kern/kern_exec.c` (`exec_extract_strings`), 태그 `xnu-11417.140.69`](https://github.com/apple-oss-distributions/xnu/blob/xnu-11417.140.69/bsd/kern/kern_exec.c) (확인: 2026-09-06)

같은 셔뱅 줄을 두 환경에서 돌린 결과입니다.

```console
$ ./t X Y

### macOS — 첫 줄: #!./show -a -b
argv[0]=[./show]
argv[1]=[-a]
argv[2]=[-b]
argv[3]=[./t]
argv[4]=[X]
argv[5]=[Y]

### Linux — 첫 줄: #!./show_lin -a -b
argv[0]=[./show_lin]
argv[1]=[-a -b]
argv[2]=[./t]
argv[3]=[X]
argv[4]=[Y]
```

**macOS는 인자 두 개, Linux는 `"-a -b"`라는 인자 한 개**입니다. 공백을 여러 개 넣으면 차이가 더 분명해집니다 — Linux는 그 공백까지 인자 안에 그대로 담습니다.

```console
### Linux — 첫 줄: #!./show_lin    -a    -b
argv[1]=[-a    -b]
```

양쪽이 같게 동작하는 부분도 있습니다. `#!` 바로 뒤의 공백은 무시되고, 줄 끝의 공백은 잘립니다. 둘 다 소스에 그렇게 적혀 있고(XNU는 `IS_WHITESPACE`로 건너뛰기·되감기, Linux는 `next_non_spacetab()`·트림), 실측도 일치했습니다.

### 그래서 `#!/usr/bin/env python3 -u`가 리눅스에서 깨집니다

이 차이가 실제로 드러나는 자리는 `env`에 옵션을 붙일 때입니다. 같은 파일을 두 환경에서 돌렸습니다.

```console
### macOS
--- 셔뱅: #!/usr/bin/env python3
orig_argv = ['python3', './t']
--- 셔뱅: #!/usr/bin/env python3 -u
orig_argv = ['python3', '-u', './t']
--- 셔뱅: #!/usr/bin/env -S python3 -u
orig_argv = ['python3', '-u', './t']

### Linux
--- 셔뱅: #!/usr/bin/env python3
orig_argv = ['python3', './t']
--- 셔뱅: #!/usr/bin/env python3 -u
env: 'python3 -u': No such file or directory
env: use -[v]S to pass options in shebang lines
--- 셔뱅: #!/usr/bin/env -S python3 -u
orig_argv = ['python3', '-u', './t']
```

Linux에서는 커널이 `python3 -u`를 **한 덩어리 문자열**로 넘겼고, `env`는 그 이름을 가진 실행 파일을 `PATH`에서 찾다가 실패했습니다. 오류 메시지가 원인을 정확히 짚어 주긴 하지만, **이 스크립트는 맥에서 아무 문제 없이 돌기 때문에 커밋될 때까지 아무도 모릅니다.**

고치는 방법은 `env -S`입니다. GNU coreutils 문서가 용도를 직접 밝히고 있습니다.

> The `-S`/`--split-string` option enables use of multiple arguments on the first line of scripts (the shebang line, '#!').
>
> — [GNU Coreutils manual, `env` invocation](https://www.gnu.org/software/coreutils/manual/html_node/env-invocation.html) (확인: 2026-09-06)

macOS의 `env`는 BSD 계열이지만 `-S`를 갖고 있고(`usage: env [-0iv] [-C workdir] [-P utilpath] [-S string]` — 직접 확인), 위 실측대로 양쪽에서 같은 결과를 냅니다. **셔뱅에 옵션을 두 개 이상 붙여야 하면 `env -S`를 쓰거나, 아예 옵션을 스크립트 안으로 옮기는 편이 안전합니다**(의견).

---

## 4. 해석자는 `PATH`에서 찾지 않습니다

`execve(2)`가 "The interpreter must be a valid pathname"이라고 쓴 대로, 커널은 셔뱅에 적힌 문자열을 **경로로만** 봅니다. 이름만 적으면 찾지 못합니다.

```console
$ printf '#!sh\necho hi\n' > t2; chmod +x t2; ./t2
### macOS (bash 3.2)
/bin/bash: ./t2: sh: bad interpreter: No such file or directory
### Linux (dash 0.5.12)
sh: 1: ./t2: not found
```

`sh`는 분명 `PATH` 위에 있는데도 실패합니다. **`PATH` 검색은 셸의 기능이지 커널의 기능이 아니기 때문**입니다.

`#!/usr/bin/env python3`가 존재하는 이유가 여기 있습니다. `/usr/bin/env`는 경로가 고정된 실행 파일이고, `PATH` 검색은 그 `env`가 대신해 줍니다. 커널은 여전히 경로 하나만 다루고, `PATH` 검색은 사용자 공간으로 넘어갑니다.

그 대가는 **어떤 해석자가 걸릴지가 실행 시점의 `PATH`에 달린다**는 것입니다. 같은 머신에서 같은 코드를 셔뱅만 바꿔 돌린 결과입니다.

```console
$ printf '#!/usr/bin/env python3\nimport sys; print("executable =", sys.executable)\n' > w.py; chmod +x w.py; ./w.py
executable = /opt/homebrew/Caskroom/miniconda/base/bin/python3

$ printf '#!/usr/bin/python3\nimport sys; print("executable =", sys.executable)\n' > w2.py; chmod +x w2.py; ./w2.py
executable = /Library/Developer/CommandLineTools/usr/bin/python3
```

**같은 스크립트가 서로 다른 파이썬에서 돌았습니다.** 가상환경을 쓰는 쪽에서는 이게 의도한 동작이고(활성화된 venv의 python이 잡히므로), 배포된 잡에서는 이게 사고의 원인입니다(cron·systemd·컨테이너의 `PATH`는 로그인 셸의 `PATH`와 다릅니다). 어느 쪽을 원하는지 정해서 셔뱅을 고르는 문제이지, `env`가 더 좋은 관행인 것은 아닙니다.

경로를 상대 경로로 쓰면 기준은 **스크립트의 위치가 아니라 호출 시점의 작업 디렉터리**입니다.

```console
$ printf '#!./show\nbody\n' > sub/t; chmod +x sub/t

$ ./sub/t                 # 해석자 ./show 가 있는 디렉터리에서
argv[0]=[./show]
argv[1]=[./sub/t]

$ cd sub && ./t           # 같은 파일, 디렉터리만 바꿔서
/bin/bash: ./t: ./show: bad interpreter: No such file or directory
```

같은 파일인데 `cd` 하나로 결과가 갈립니다. 커널은 `./show`를 **스크립트가 있는 `sub/` 기준이 아니라 호출 시점의 작업 디렉터리 기준**으로 찾기 때문입니다. **셔뱅에 상대 경로를 쓰면 안 되는 이유**가 이것입니다.

---

## 5. 첫 줄에는 길이 제한이 있고, 넘치면 조용히 잘립니다

커널은 파일 앞부분을 **고정 크기 버퍼**에 읽어 놓고 셔뱅을 파싱합니다. 그 크기가 곧 첫 줄의 상한입니다.

| 커널 | 버퍼 상수 | 값 | 근거 |
| --- | --- | --- | --- |
| Linux | `BINPRM_BUF_SIZE` | 256 바이트 | [`include/uapi/linux/binfmts.h`, v6.12](https://github.com/torvalds/linux/blob/v6.12/include/uapi/linux/binfmts.h) (확인: 2026-09-06) |
| XNU | `IMG_SHSIZE` | 512 바이트 | [`bsd/sys/imgact.h`, `xnu-11417.140.69`](https://github.com/apple-oss-distributions/xnu/blob/xnu-11417.140.69/bsd/sys/imgact.h) (확인: 2026-09-06) |

인자를 `x`로 채워 가며 경계를 직접 재 봤습니다. `line_len`은 첫 줄의 문자 수(개행 제외), `arg_len`은 해석자가 실제로 받은 인자의 길이입니다.

```console
### macOS
line_len=509 rc=0 arg_len=500 (expected 500)
line_len=510 rc=0 arg_len=501 (expected 501)
line_len=511 rc=0 arg_len=502 (expected 502)
line_len=512 rc=127 arg_len=0 (expected 503)

### Linux
line_len=253 rc=0 arg_len=240 (expected 240)
line_len=254 rc=0 arg_len=241 (expected 241)
line_len=255 rc=0 arg_len=242 (expected 242)
line_len=256 rc=0 arg_len=242 (expected 243)
line_len=257 rc=0 arg_len=242 (expected 244)
line_len=512 rc=0 arg_len=242 (expected 499)
```

두 커널이 **넘쳤을 때의 대응이 다릅니다.**

- **macOS는 실패시킵니다.** 511자까지는 그대로 통하고 512자에서 멈춥니다. `os.execv()`로 직접 불러 확인한 errno는 `8 Exec format error`(ENOEXEC)입니다. 소스에도 그렇게 적혀 있습니다 — `/* A long line, like "#! blah blah blah" without end */ return ENOEXEC;`
- **Linux는 조용히 자릅니다.** 255자를 넘겨도 종료 코드는 0이고, 인자만 242자에서 잘린 채 해석자가 정상 실행됩니다. **오류도 경고도 없습니다.**

Linux가 그렇게 하는 것은 의도된 설계이고, 커널 주석이 이유를 밝힙니다.

```c
	 * We do not want to exec a truncated interpreter path, so either
	 * we find a newline (which indicates nothing is truncated), or
	 * we find a space/tab/NUL after the interpreter path (which
	 * itself may be preceded by spaces/tabs). Truncating the
	 * arguments is fine: the interpreter can re-read the script to
	 * parse them on its own.
```

— [`fs/binfmt_script.c`, v6.12](https://github.com/torvalds/linux/blob/v6.12/fs/binfmt_script.c) (확인: 2026-09-06)

즉 **인자가 잘리는 것은 봐주고, 해석자 경로가 잘리는 것만 막습니다.** 경로 쪽이 넘치면 ENOEXEC가 납니다. 262자짜리 해석자 경로로 확인했습니다.

```console
interpreter path length = 262 (shebang line = 264)

### macOS
rc=0 : argv[0]=[./dd/dd/dd/…//show]      ← 가운데 반복 부분을 …로 줄였습니다
### Linux
rc=127 : ./tp: 2: body: not found
execv errno 8 Exec format error
```

Linux 쪽 출력이 이 문서에서 가장 헷갈리는 실패의 모양입니다. **커널은 ENOEXEC로 거절했는데, 셸이 그 파일을 셸 스크립트로 대신 실행했습니다**(§6). 그래서 화면에 뜬 것은 "셔뱅이 너무 깁니다"가 아니라 `body: not found`라는 엉뚱한 메시지입니다.

한 가지 짚어 둘 것이 있습니다. man page는 한계를 이렇게 씁니다.

> Before Linux 5.1, the limit is 127 characters. Since Linux 5.1, the limit is 255 characters.

그런데 실측에서 온전히 살아남은 것은 `#!` 뒤 **253자**였습니다(첫 줄 255자). 소스를 보면 파싱 범위의 끝이 `buf_end = bprm->buf + sizeof(bprm->buf) - 1`(인덱스 255)이고 그 자리에 NUL이 들어가므로, 실제로 쓸 수 있는 텍스트는 인덱스 2~254 = 253자입니다 — **소스를 읽은 제 계산이며**, 다른 커널 판에서는 확인하지 않았습니다. 어느 쪽이든 실무적 결론은 같습니다: **긴 가상환경 경로를 셔뱅에 적으면 리눅스에서 조용히 잘릴 수 있고, 맥에서는 그 사실이 드러나지 않습니다.**

---

## 6. 셔뱅이 어긋나면 셸이 대신 떠맡습니다

셔뱅이 없거나 해석자를 찾지 못하면 `execve()`는 실패합니다. 그런데 **셸은 그 실패를 그냥 보고하지 않습니다.** POSIX가 규범으로 이렇게 정해 두었습니다.

> If the `execl()` function fails due to an error equivalent to the [ENOEXEC] error defined in the System Interfaces volume of POSIX.1-2024, the shell shall execute a command equivalent to having a shell invoked with the pathname resulting from the search as its first operand, with any remaining arguments passed to the new shell
>
> — [The Open Group Base Specifications Issue 8 (POSIX.1-2024), Shell Command Language, 2.9.1 Command Search and Execution](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) (확인: 2026-09-06)

**ENOEXEC이면 셸이 그 파일을 셸 스크립트로 다시 실행한다** — 이 되돌림이 셔뱅 문제의 증상을 통째로 바꿔 놓습니다. 셔뱅 없는 파이썬 파일을 실행해 보면 이렇게 나옵니다.

```console
$ cat job.py
import sys
rows = [1, 2, 3]
print("rows =", rows)

### macOS (bash 3.2)
./job.py: line 1: import: command not found
./job.py: line 2: rows: command not found
./job.py: line 3: syntax error near unexpected token `"rows =",'
./job.py: line 3: `print("rows =", rows)'
rc=2

### Linux (dash)
./job.py: 1: import: not found
./job.py: 2: rows: not found
./job.py: 3: Syntax error: word unexpected (expecting ")")
rc=2
```

파이썬 코드가 셸에게 넘어갔습니다. **"파이썬 스크립트인데 왜 셸 문법 오류가 나는가"의 답은 셔뱅 한 줄**입니다.

같은 되돌림이 반대로 **문제를 숨기기도** 합니다. 셔뱅처럼 생겼지만 셔뱅이 아닌 경우들입니다.

```console
$ printf '\n#!/bin/sh\necho hi\n' > t; chmod +x t; ./t     # 첫 줄이 빈 줄
hi
$ printf '#!\necho hi\n' > t; chmod +x t; ./t              # #! 뒤가 비어 있음
hi
```

둘 다 `hi`가 나옵니다. 하지만 **커널이 셔뱅을 처리한 것이 아니라, ENOEXEC 뒤에 셸이 떠맡은 것**입니다. `#!` 앞에 빈 줄이 하나 들어간 스크립트가 로컬에서 잘 돌다가, `sh`를 거치지 않는 실행 경로에 올라가는 순간 죽습니다.

### 오류 메시지를 errno로 되읽기

셔뱅 문제로 나오는 메시지는 셸마다 다르고, 대부분 원인을 직접 말해 주지 않습니다. `os.execv()`로 errno를 직접 확인한 결과와 함께 정리하면 이렇습니다(errno는 macOS·Linux 양쪽에서 동일했습니다).

| 상황 | errno | macOS bash 3.2 | macOS zsh 5.9 | Linux dash | Linux bash 5.2 | Docker exec form |
| --- | --- | --- | --- | --- | --- | --- |
| 셔뱅 없음 / 해석자가 또 스크립트(맥) / 첫 줄 초과(맥) | 8 ENOEXEC | (셸이 대신 실행) | (셸이 대신 실행) | (셸이 대신 실행) | (셸이 대신 실행) | `exec ./job.py: exec format error` |
| 해석자 경로가 없음 (CRLF 포함) | 2 ENOENT | `bad interpreter: No such file or directory` | `bad interpreter: … no such file or directory` | `not found` | `cannot execute: required file not found` | `exec ./entry.sh: no such file or directory` |
| 스크립트에 실행 권한 없음 | 13 EACCES | `./noexec2: Permission denied` | `permission denied: ./noexec2` | `./noexec2: Permission denied` | `/bin/sh: bad interpreter: Permission denied` | `exec ./noexec2: permission denied` |

특히 흔한 것이 CRLF입니다. 윈도우에서 편집한 파일의 첫 줄은 `#!/bin/sh\r`이고, 커널은 `\r`까지 포함한 경로를 찾다가 실패합니다.

```console
$ printf '#!/bin/sh\r\necho hi\r\n' > crlf.sh; chmod +x crlf.sh
$ head -1 crlf.sh | od -c
0000000    #   !   /   b   i   n   /   s   h  \r  \n
0000013

### macOS
/bin/bash  : /bin/bash: ./crlf.sh: /bin/sh^M: bad interpreter: No such file or directory
/bin/zsh   : zsh:1: ./crlf.sh: bad interpreter: /bin/sh^M: no such file or directory
/bin/dash  : /bin/dash: 1: ./crlf.sh: not found

### Linux
/bin/bash  : /bin/bash: line 1: ./crlf.sh: cannot execute: required file not found
/bin/dash  : /bin/dash: 1: ./crlf.sh: not found
/bin/sh    : /bin/sh: 1: ./crlf.sh: not found
```

메시지 안의 `^M`은 CR이 화면을 망가뜨리지 않도록 셸이 **`^`와 `M` 두 글자로 바꿔 출력한 것**입니다. bash 3.2의 출력을 `od -c`에 통과시켜 `^`(0x5E) `M`(0x4D) 두 바이트가 실제로 들어 있음을 확인했고, zsh 쪽은 같은 방식일 것으로 보이나 바이트 단위로 확인하지 않았습니다(추측). 그래서 `^M`이 보이면 CRLF라고 읽으면 됩니다. **문제는 dash에서 그 단서마저 사라진다는 것**입니다 — `./crlf.sh: not found`는 파일이 없다는 말처럼 보이지만 파일은 멀쩡히 있고, 없는 것은 `/bin/sh\r`라는 이름의 해석자입니다. 슬림 이미지의 `/bin/sh`가 dash라서, 컨테이너에서 이 메시지를 만나면 원인이 한 겹 더 가려집니다.

인자가 있는 셔뱅에서는 CRLF의 증상이 또 달라집니다. `\r`이 마지막 **인자**에 붙기 때문에 실행 자체는 성공합니다.

```console
### macOS — 첫 줄: #!./show -a\r
argv[1]=[-a^M]
### Linux — 첫 줄: #!./show_lin -a\r
argv[1]=[-a^M]
```

(이 두 줄은 출력을 `cat -v`에 통과시킨 것이라 `^M`이 CR 한 바이트를 나타냅니다. 앞 절의 오류 메시지에 나온 `^M`은 셸이 스스로 두 글자로 바꿔 찍은 것이라 성격이 다릅니다.)

그래서 **같은 원인(CRLF)이 셔뱅의 모양에 따라 전혀 다른 메시지로 나옵니다.** 두 가지를 더 돌려 봤습니다.

```console
$ printf '#!/usr/bin/env python3\r\nprint("hi")\r\n' > c1.py; chmod +x c1.py
$ printf '#!/bin/sh -e\r\necho hi\r\n'              > c2.sh; chmod +x c2.sh

### macOS (bash 3.2 로 호출, 출력은 cat -v 경유)
env: python3\r: No such file or directory
/bin/sh: -^M: invalid option

### Linux
env: 'python3\r': No such file or directory
env: use -[v]S to pass options in shebang lines
/bin/sh: 0: Illegal option -^M
```

`No such file or directory`, `invalid option`, `Illegal option` — 셋 다 원인은 같은 `\r` 한 바이트입니다.

### 셸을 거치지 않는 실행 경로

되돌림은 **셸이 있을 때만** 일어납니다. 컨테이너 런타임이 `execve()`를 직접 부르는 자리에는 그 안전망이 없습니다.

```console
$ docker run --rm -v $PWD:/w -w /w debian:trixie-slim sh -c './job.py'
./job.py: 1: import: not found
./job.py: 2: rows: not found
./job.py: 3: Syntax error: word unexpected (expecting ")")
$ docker run --rm -v $PWD:/w -w /w debian:trixie-slim ./job.py
exec ./job.py: exec format error
$ docker run --rm -v $PWD:/w -w /w debian:trixie-slim ./entry.sh      # 셔뱅이 CRLF
exec ./entry.sh: no such file or directory
```

같은 파일인데 `sh -c`를 거치면 셸 오류가, 직접 실행하면 `exec format error`가 납니다. Dockerfile의 `ENTRYPOINT ["./entry.sh"]`(exec form)·Kubernetes의 `command:`가 두 번째 경로입니다. **`exec format error`는 "아키텍처가 안 맞는다"로만 알려져 있지만, 셔뱅이 없거나 깨진 스크립트도 같은 메시지를 냅니다** — 둘 다 ENOEXEC이기 때문입니다.

---

## 7. 해석자가 또 스크립트일 때, 그리고 setuid

셔뱅에 적은 해석자가 그 자체로 셔뱅 스크립트라면 어떻게 될까요. **여기서도 두 커널이 갈립니다.** 해석자를 한 단계씩 늘려 가며 재 봤습니다.

```console
### macOS  (depth=8까지 돌렸고 전부 같은 모양이라 두 줄만 옮깁니다)
depth=1 rc=127 : ./s1: line 2: body: command not found
depth=2 rc=127 : ./s2: line 2: body: command not found

### Linux
depth=1 rc=0 : argv[0]=[./show_lin]
depth=2 rc=0 : argv[0]=[./show_lin]
depth=3 rc=0 : argv[0]=[./show_lin]
depth=4 rc=0 : argv[0]=[./show_lin]
depth=5 rc=127 : ./exp3.sh: 8: ./s5: Too many levels of symbolic links
```

Linux는 네 단계까지 허용합니다. man page에 그대로 적혀 있습니다.

> Since Linux 2.6.28, the kernel permits the interpreter of a script to itself be a script. This permission is recursive, up to a limit of four recursions
>
> — [`execve(2)`, Linux man-pages 6.18](https://man7.org/linux/man-pages/man2/execve.2.html) (확인: 2026-09-06)

macOS는 **한 단계도 허용하지 않습니다.** §1에 인용한 `IMGPF_INTERPRET` 검사가 그것이고, `os.execv()`로 확인한 errno도 `8 Exec format error`였습니다. 위 `depth=1` 출력이 그럴듯하게 보이는 것은 §6의 되돌림 때문입니다 — 커널이 거절하자 셸이 `./s1`을 셸 스크립트로 읽었고, 2행의 `body`에서 걸린 것입니다.

두 가지가 따라 나옵니다. 하나는 **래퍼 스크립트를 셔뱅의 해석자로 지정하는 방식이 맥에서는 아예 성립하지 않는다**는 것입니다(`#!./my-python-wrapper.sh`). 다른 하나는 **다섯 단계째 리눅스가 내는 메시지가 `Too many levels of symbolic links`(ELOOP)** 라는 것입니다 — 심볼릭 링크는 등장하지도 않았는데 그렇게 나옵니다.

### setuid는 무시됩니다

셔뱅 스크립트에 setuid 비트를 걸어 권한 상승을 시키려는 시도는 통하지 않습니다. Linux는 못을 박아 두었습니다.

> Linux (like most other modern UNIX systems) ignores the set-user-ID and set-group-ID bits on scripts.
>
> — [`execve(2)`, Linux man-pages 6.18](https://man7.org/linux/man-pages/man2/execve.2.html) (확인: 2026-09-06)

XNU에는 켜고 끄는 스위치가 있지만 기본값이 꺼짐이고, 꺼져 있으면 SUID/SGID 비트를 지워 버립니다.

```c
static int sugid_scripts = 0;
...
	if (sugid_scripts == 0) {
		imgp->ip_origvattr->va_mode &= ~(VSUID | VSGID);
	}
```

— [apple-oss-distributions/xnu, `bsd/kern/kern_exec.c`, 태그 `xnu-11417.140.69`](https://github.com/apple-oss-distributions/xnu/blob/xnu-11417.140.69/bsd/kern/kern_exec.c) (확인: 2026-09-06)

이 맥의 현재 값도 0이었습니다.

```console
$ sysctl kern.sugid_scripts
kern.sugid_scripts: 0
```

이유는 셔뱅의 구조 자체에 있습니다. 커널은 스크립트 파일을 **경로 문자열로 다시 넘기고**, 해석자가 그 경로를 **다시 엽니다**(§2에서 본 `argv`의 `path`가 그것입니다). 권한 판정 시점과 실제로 파일이 열리는 시점 사이에 파일을 바꿔치기할 틈이 생깁니다. XNU가 SUID 스크립트에 한해 경로 대신 `/dev/fd/%d`를 넘기도록 만들어 둔 것도 이 때문입니다.

```c
	/*
	 * If we have an SUID or SGID script, create a file descriptor
	 * from the vnode and pass /dev/fd/%d instead of the actual
	 * path name so that the script does not get opened twice
	 */
```

— [apple-oss-distributions/xnu, `bsd/kern/kern_exec.c`, 태그 `xnu-11417.140.69`](https://github.com/apple-oss-distributions/xnu/blob/xnu-11417.140.69/bsd/kern/kern_exec.c) (확인: 2026-09-06)

POSIX RATIONALE에도 이 계열의 함정이 기록으로 남아 있습니다.

> On systems that support set-user-ID scripts, a historical trapdoor has been to link a script to the name `-i`.
>
> — [The Open Group Base Specifications Issue 8 (POSIX.1-2024), `sh`, RATIONALE](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html) (확인: 2026-09-06)

같은 절이 "There are other problems with set-user-ID scripts that the two approaches described here do not resolve"라고 덧붙입니다. **권한이 필요한 자리에서는 스크립트가 아니라 컴파일된 바이너리나 `sudo` 규칙을 쓰는 것이 정석입니다**(의견).

---

## 확인하지 못한 것

- **Linux 쪽 실측은 커널 하나에서만 얻었습니다.** Docker Desktop이 띄운 `6.12.76-linuxkit` aarch64입니다. 실제 배포판 커널(Ubuntu·Amazon Linux 등), x86_64, 다른 커널 판에서는 재현하지 않았습니다.
- **Linux 5.1 이전의 127자 제한**은 man page 서술로만 확인했고 재현하지 않았습니다.
- **man page의 "255 characters"와 실측 253자의 차이**는 소스를 읽은 제 계산으로 설명했을 뿐, 커널 개발자의 의도나 다른 판에서의 동작은 확인하지 못했습니다.
- **macOS `/bin/dash`의 상위 버전**은 확인하지 못했습니다(`--version` 없음). dash 관련 출력은 "이 맥에 설치된 dash 기준"입니다.
- **setuid 스크립트의 실제 동작은 재현하지 않았습니다.** `sysctl` 값과 커널 소스만 확인했습니다.
- **FreeBSD·Solaris·BusyBox 계열(Alpine)** 의 셔뱅 처리는 확인하지 않았습니다. man page가 "구현마다 다르다"고 한 이상, 이 문서의 두 결과를 그쪽에 옮겨 적으면 안 됩니다.
- **Rosetta·fat binary 경로**(`ip_origcputype`가 걸리는 분기)는 소스에서 보긴 했으나 시험하지 않았습니다.

---

*작성일: 2026-09-06*
