---
sidebar_position: 3
---

# 프로세스의 생명주기 — 프로그램이 실행되고 종료 상태를 남기는 과정

> **원문** — [fork — create a new process](https://pubs.opengroup.org/onlinepubs/9799919799/functions/fork.html) · [exec — execute a file](https://pubs.opengroup.org/onlinepubs/9799919799/functions/exec.html) · [wait — wait for a process to change state](https://pubs.opengroup.org/onlinepubs/9799919799/functions/wait.html) · [_Exit — terminate a process](https://pubs.opengroup.org/onlinepubs/9799919799/functions/_exit.html), The Open Group Base Specifications Issue 8, IEEE Std 1003.1-2024
>
> **확인 날짜** — 2026-09-12. POSIX.1-2024의 프로세스 생성·실행 파일 교체·대기·종료 관련 원문을 확인했습니다.
>
> **검증 상태** — POSIX 규격을 읽고 macOS에서 Python `subprocess`를 사용한 프로세스 생성·대기·종료를 직접 실행했습니다. Python이 내부적으로 선택하는 정확한 시스템 호출 경로와 macOS 커널의 내부 구현은 추적하지 않았습니다.

프로세스는 실행 중인 프로그램을 운영체제가 관리하기 위한 단위입니다. 프로그램 파일 자체가 프로세스인 것은 아닙니다. 실행 파일은 디스크에 있는 데이터이고, 프로세스는 그 파일을 실행하기 위해 운영체제가 만든 실행 상태입니다.

프로세스의 전형적인 흐름은 다음과 같습니다.

```text
실행 파일·명령
      │
      ▼
부모 프로세스가 자식 프로세스를 생성
      │ fork() 또는 posix_spawn()
      ▼
자식 프로세스
      │
      ├─ exec() 성공 → 같은 프로세스가 새 프로그램 이미지로 교체
      ├─ 실행 중     → CPU·파일·메모리·신호를 사용
      └─ exit/return 또는 신호 → 종료 상태 생성
      │
      ▼
부모 프로세스가 wait()/waitpid()로 상태 회수
```

핵심은 **프로세스를 만드는 일, 그 안에 실행할 프로그램을 적재하는 일, 종료를 회수하는 일이 서로 다른 단계**라는 점입니다. Shell의 명령 실행이나 Python의 `subprocess.run()`은 이 단계를 감싼 고수준 인터페이스입니다.

## 프로그램과 프로세스는 다릅니다

디스크에 있는 `/bin/echo` 같은 실행 파일은 실행에 필요한 코드와 데이터가 담긴 파일입니다. 그 파일을 실행하면 운영체제는 프로세스 ID, 주소 공간, 파일 디스크립터, 현재 작업 디렉터리, 환경 변수와 같은 실행 상태를 가진 프로세스를 관리합니다.

따라서 같은 실행 파일을 여러 번 실행하면 서로 다른 프로세스가 생깁니다.

```text
실행 파일: /bin/echo
        ├─ 프로세스 PID 101 — 첫 번째 실행
        └─ 프로세스 PID 102 — 두 번째 실행
```

두 프로세스가 같은 프로그램 파일을 사용하더라도 PID와 실행 상태는 서로 다릅니다. 반대로 `exec()`는 새로운 PID를 만드는 함수가 아니라, **현재 프로세스가 사용하던 프로그램 이미지를 다른 이미지로 교체하는 함수**입니다.

## `fork()`는 자식 프로세스를 만듭니다

POSIX.1-2024는 `fork()`가 호출 프로세스의 자식 프로세스를 만든다고 정의합니다.

> The `fork()` function shall create a new process.
>
> **번역** — `fork()` 함수는 새 프로세스를 만들어야 합니다.
>
> — [fork — create a new process](https://pubs.opengroup.org/onlinepubs/9799919799/functions/fork.html) (확인: 2026-09-12)

성공하면 `fork()`는 부모에게 자식의 PID를 반환하고 자식에게는 0을 반환합니다. 두 프로세스는 `fork()` 다음 지점부터 독립적으로 실행할 수 있습니다. 자식은 부모와 다른 PID와 PPID를 가지며, POSIX가 정한 범위에서는 부모의 프로세스 상태를 이어받습니다.

```c
pid_t child_pid = fork();

if (child_pid == 0) {
    /* 자식 프로세스 */
} else if (child_pid > 0) {
    /* 부모 프로세스. child_pid는 자식의 PID */
} else {
    /* 프로세스 생성 실패 */
}
```

`fork()` 뒤에 부모와 자식이 어느 순서로 실행될지는 이 코드만으로 정해지지 않습니다. 부모가 먼저 실행될 수도 있고 자식이 먼저 실행될 수도 있습니다. 그러므로 출력 순서나 실행 시점에 의존하는 코드는 동기화 없이 작성하면 재현되지 않는 결과를 만들 수 있습니다.

파일 디스크립터도 중요한 상속 대상입니다. `fork()` 뒤 자식은 부모의 파일 디스크립터 사본을 가지지만, 대응하는 디스크립터는 같은 open file description을 가리킬 수 있습니다. 그래서 Shell이 파이프를 연결할 때 부모가 만든 파일 디스크립터를 자식의 표준 입력·출력으로 연결할 수 있습니다.
— [fork — create a new process](https://pubs.opengroup.org/onlinepubs/9799919799/functions/fork.html) (확인: 2026-09-12)

## `exec()`는 프로세스가 아니라 프로그램 이미지를 바꿉니다

`fork()`만 호출하면 자식은 부모와 같은 프로그램 코드를 이어서 실행합니다. 다른 실행 파일을 실행하려면 자식이 `exec()` 계열 함수를 호출합니다.

> The exec family of functions shall replace the current process image with a new process image.
>
> **번역** — `exec` 계열 함수는 현재 프로세스 이미지를 새로운 프로세스 이미지로 교체해야 합니다.
>
> — [exec — execute a file](https://pubs.opengroup.org/onlinepubs/9799919799/functions/exec.html) (확인: 2026-09-12)

`exec()`가 성공하면 호출한 프로세스의 PID는 그대로이고, 실행할 코드·전역 데이터·스택 같은 프로세스 이미지가 새 실행 파일의 것으로 바뀝니다. 성공한 `exec()`는 호출자에게 돌아오지 않습니다. `exec()`가 반환했다면 새 이미지로 교체되지 못한 것이므로 실패를 처리해야 합니다.

```c
if (fork() == 0) {
    execlp("echo", "echo", "hello", (char *)0);

    /* 여기까지 왔다면 exec 실패 */
    _exit(127);
}
```

이 구조가 Shell과 서버에서 자주 쓰이는 이유는 부모가 자식의 생성과 관리를 맡고, 자식이 실행할 프로그램으로 자신을 교체할 수 있기 때문입니다.

`fork()`와 `exec()`를 구분하지 않으면 “명령 하나를 실행할 때 프로세스가 두 번 만들어진다”고 오해하기 쉽습니다. 일반적인 흐름은 **`fork()`로 자식을 하나 만들고, 그 자식이 `exec()`로 실행 이미지를 교체하는 것**입니다. `exec()` 자체는 프로세스를 추가하지 않습니다.

## 부모는 `wait()`로 자식의 결과를 회수합니다

자식이 종료하면 부모가 확인할 수 있는 종료 상태가 생깁니다. 부모는 `wait()`나 특정 자식을 지정하는 `waitpid()`를 호출해 그 상태를 회수할 수 있습니다.

```c
int status;
pid_t result = waitpid(child_pid, &status, 0);

if (result == child_pid && WIFEXITED(status)) {
    int code = WEXITSTATUS(status);
    /* code는 자식이 정상 종료할 때 남긴 상태 */
}
```

부모가 아직 상태를 회수하지 않은 종료 자식은 흔히 **좀비 프로세스**라고 부릅니다. 좀비는 실행을 계속하는 프로세스가 아니라, 부모가 `wait()` 계열 함수로 회수할 수 있도록 종료 상태를 보관한 상태입니다. POSIX.1-2024는 종료 상태가 부모가 상태 정보를 얻을 때까지 이용 가능해야 하고, 그 뒤 프로세스의 수명이 끝난다고 설명합니다.
— [_Exit — terminate a process](https://pubs.opengroup.org/onlinepubs/9799919799/functions/_exit.html) (확인: 2026-09-12)

그러므로 자식 프로세스를 많이 만들면서 `wait()`를 호출하지 않는 프로그램은 자식이 실행을 끝냈더라도 프로세스 테이블 자원을 회수하지 못할 수 있습니다. “자식이 종료했으니 운영체제가 모든 흔적을 즉시 지운다”는 모델은 정확하지 않습니다.

`wait()`는 아무 자식 하나의 상태를 기다리는 데 사용할 수 있고, `waitpid()`는 특정 PID나 조건에 맞는 자식을 기다리는 데 사용할 수 있습니다. 부모가 기다리는 동안 자식이 먼저 종료할 수도 있고, 부모가 먼저 종료할 수도 있습니다. 부모가 먼저 종료하면 남은 자식의 PPID가 구현이 정한 시스템 프로세스로 바뀔 수 있으므로, 부모-자식 관계가 항상 프로세스의 전체 수명보다 오래 유지되는 것은 아닙니다.
— [_Exit — terminate a process](https://pubs.opengroup.org/onlinepubs/9799919799/functions/_exit.html) (확인: 2026-09-12)

## 종료는 정상 종료와 신호에 의한 종료가 다릅니다

프로세스는 `return`이나 `exit()`로 정상 종료할 수 있고, 처리되지 않은 신호의 기본 동작으로 비정상 종료할 수도 있습니다. `_exit()`는 종료 상태를 남기지만 `atexit()` 함수나 등록된 신호 처리기를 호출하지 않고 즉시 종료하는 경로입니다.

POSIX는 종료한 프로세스의 상태 정보를 부모가 조회할 수 있도록 하고, 부모에게 `SIGCHLD`를 보낼 수 있도록 정의합니다.
— [_Exit — terminate a process](https://pubs.opengroup.org/onlinepubs/9799919799/functions/_exit.html) (확인: 2026-09-12)

종료 상태의 숫자와 신호 종료는 구분해야 합니다. 정상 종료에서 `7`을 반환한 것과 `SIGTERM`을 받아 종료된 것은 모두 “자식이 끝났다”는 결과를 만들지만 원인은 다릅니다. Python의 `subprocess`는 이 차이를 `returncode`에 반영하며, 신호로 종료되면 음수 신호 번호를 반환합니다.

## 직접 확인한 실행 기록

### 실행 환경

이 절의 명령과 출력은 다음 환경에서 2026-09-12에 직접 실행했습니다.

```text
$ python3 --version
Python 3.9.6

$ sw_vers
ProductName:    macOS
ProductVersion: 15.7.4
BuildVersion:   24G517

$ uname -a
Darwin gyeongtaee.local 24.6.0 Darwin Kernel Version 24.6.0: Mon Jan 19 22:01:58 PST 2026; root:xnu-11417.140.69.708.3~1/RELEASE_ARM64_T6041 arm64
```

### 부모·자식 PID와 정상 종료 상태

다음 명령은 Python이 자식 프로세스를 시작하고, 자식이 자신의 PID와 PPID를 출력한 뒤 종료 상태 `7`로 끝나도록 합니다. 부모는 자식이 끝날 때까지 기다린 다음 반환 코드를 출력합니다.

```text
$ python3 -c 'import os, subprocess, sys; p = subprocess.Popen([sys.executable, "-c", "import os; print(\"child_pid=%d\" % os.getpid()); print(\"child_ppid=%d\" % os.getppid()); raise SystemExit(7)"], stdout=subprocess.PIPE, text=True); out, _ = p.communicate(); print("parent_pid=%d" % os.getpid()); print("child_pid=%d" % p.pid); print(out, end=""); print("returncode=%d" % p.returncode)'
parent_pid=30652
child_pid=30653
child_pid=30653
child_ppid=30652
returncode=7
```

이 기록에서 확인할 수 있는 사실은 다음과 같습니다.

- 부모와 자식은 서로 다른 PID를 가집니다.
- 자식의 PPID는 부모 PID입니다.
- 부모는 자식의 종료를 기다린 뒤 `returncode=7`을 얻습니다.

이 실행 기록만으로 Python이 내부에서 정확히 `fork()`와 `exec()`를 어떤 조합으로 사용했는지 단정할 수는 없습니다. Python의 `subprocess`가 운영체제별 구현을 감싸고 있기 때문입니다. 다만 부모가 별도 프로세스를 실행하고 그 종료 상태를 회수한다는 외부 동작은 확인할 수 있습니다.

### 신호에 의한 종료

이번에는 자식에게 `SIGTERM`을 보낸 뒤 종료 상태를 확인했습니다.

```text
$ python3 -c 'import signal, subprocess, sys; p = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(10)"]); p.send_signal(signal.SIGTERM); p.wait(); print("returncode=%d" % p.returncode)'
returncode=-15
```

이 Python 실행에서 `-15`는 자식이 정상적으로 `exit(15)`를 반환했다는 뜻이 아니라, 신호 번호 `15`인 `SIGTERM`으로 종료되었다는 `subprocess`의 표현입니다. 신호 종료를 정상 종료 코드와 같은 것으로 처리하면 재시작·재시도·장애 원인 분석이 틀어질 수 있습니다.

## Python과 Shell에서는 이 과정이 감춰져 보입니다

Python의 `subprocess.run()`은 기본적으로 자식 프로세스가 끝날 때까지 기다리고 결과를 반환합니다. Shell도 명령을 실행한 뒤 기본적으로 해당 명령의 종료 상태를 확인할 수 있습니다.

```python
import subprocess

result = subprocess.run(["sh", "-c", "exit 7"])
print(result.returncode)
```

```text
7
```

이 코드는 `fork()`·`exec()`·`waitpid()` 호출을 직접 작성하지 않았지만, 운영체제가 제공하는 프로세스 생성·실행·대기 모델을 사용합니다. `Popen`처럼 비동기적으로 자식을 시작하는 API를 사용할 때는 프로그램이 명시적으로 `wait()` 또는 `communicate()`를 호출해 자식의 상태와 입출력을 처리할 시점을 관리해야 합니다.

## 실무에서 생기는 문제는 단계의 누락으로 설명할 수 있습니다

프로세스 생명주기를 단계별로 나누면 다음과 같은 증상을 원인과 연결할 수 있습니다.

| 누락하거나 잘못 이해한 단계 | 나타나는 증상 | 핵심 원인 |
| --- | --- | --- |
| 자식 생성 실패를 확인하지 않음 | 자원이 부족할 때 부모가 잘못된 PID를 사용함 | `fork()`·spawn은 실패할 수 있음 |
| `exec()` 실패 뒤 계속 실행함 | 자식이 원래 프로그램의 코드를 계속 수행함 | 성공한 `exec()`는 돌아오지 않으며, 반환은 실패를 뜻함 |
| 자식의 `wait()`를 호출하지 않음 | 종료한 자식이 좀비로 남을 수 있음 | 종료 상태를 부모가 회수하지 않음 |
| 종료 상태와 신호를 구분하지 않음 | 정상 실패와 강제 종료를 같은 장애로 처리함 | 종료 원인이 서로 다름 |
| 부모가 모든 자식을 직접 종료한다고 가정함 | 부모 종료 뒤 자식 관계를 잘못 추적함 | 자식의 재부모화와 프로세스 관리 정책을 별도로 고려해야 함 |

이 표의 원칙은 “프로세스를 실행했다”는 사실만 기록하는 것보다 중요합니다. 운영 프로그램은 PID를 얻은 뒤 **실행이 실제로 성공했는지, 종료 원인이 무엇인지, 상태를 회수했는지**까지 관리해야 합니다.

## 이 문서의 범위

이 문서는 POSIX가 외부에 제공하는 프로세스 생명주기의 기본 흐름을 다룹니다. CPU 스케줄러가 어떤 자료구조로 다음 실행 프로세스를 고르는지, 가상 메모리가 `fork()`를 어떻게 최적화하는지, macOS의 launchd나 Linux의 systemd가 부모 역할을 어떻게 확장하는지는 이 문서에서 다루지 않았습니다. 그런 내용은 운영체제의 특정 구현이나 커널 내부 동작을 별도 문서로 검증해야 합니다.

## 확인하지 못한 것

- Python 3.9.6의 macOS 구현이 위 실행에서 `fork()`·`posix_spawn()`·다른 경로 중 무엇을 선택했는지는 시스템 호출 추적을 하지 않았으므로 확인하지 못했습니다.
- macOS 커널 내부의 프로세스 테이블, 주소 공간 복제·공유 방식, 스케줄링 자료구조는 POSIX 문서와 위 실행 기록만으로 확인할 수 없으므로 다루지 않았습니다.
- 프로세스 상태의 정확한 메모리 회수 시점과 부모 종료 뒤 자식을 맡는 시스템 프로세스의 이름은 POSIX가 구현에 맡기는 부분이 있으므로 macOS의 커널 소스나 공식 구현 문서와 대조하지 않았습니다.

*작성일: 2026-09-12*
