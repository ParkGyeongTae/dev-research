---
sidebar_position: 2
---

# 프로그램은 컴퓨터 자원을 어떻게 사용하는가 — 언어 런타임에서 운영체제까지

> **원문** — [Generic Operating System Services, Python 3.11.16 documentation](https://docs.python.org/3.11/library/allos.html), [`os` — Miscellaneous operating system interfaces](https://docs.python.org/3.11/library/os.html), [`subprocess` — Subprocess management](https://docs.python.org/3.11/library/subprocess.html), [The Open Group Base Specifications Issue 8, IEEE Std 1003.1-2024](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html)
>
> **확인 날짜** — 2026-09-11. Python 3.11 문서와 POSIX.1-2024를 확인했습니다. 이 문서의 실행 예시는 Python 3.9.6과 macOS에서 직접 실행했습니다.
>
> **검증 상태** — Python 공식 문서와 POSIX 규격을 읽고 정리했습니다. Python·Shell 예시의 출력은 이 저장소의 macOS 환경에서 직접 확인했습니다. 각 언어 런타임이 내부적으로 호출하는 모든 시스템 호출까지 추적한 것은 아닙니다.

Python이나 Shell로 파일을 읽고, 프로세스를 실행하고, 환경 변수를 조회할 수 있습니다. 그렇다고 Python 인터프리터나 Shell이 일반적으로 디스크·CPU·메모리 장치를 직접 제어한다는 뜻은 아닙니다. 프로그램의 요청은 보통 다음 층을 통과합니다.

```text
Python 코드 / Shell 명령
        ↓
언어 런타임·표준 라이브러리·Shell
        ↓ 운영체제 인터페이스
커널
        ↓
파일 시스템·프로세스·장치 드라이버
        ↓
하드웨어
```

핵심은 **언어가 하드웨어를 직접 조작하는 것이 아니라, 런타임과 운영체제가 제공하는 추상화에 요청을 보낸다**는 점입니다. 이 경계를 이해하면 Python의 `open()`과 Shell의 `cat`이 서로 다른 문법인데도 결국 운영체제의 파일 기능을 사용할 수 있는 이유를 설명할 수 있습니다.

## 운영체제 인터페이스는 프로그램이 요청하는 경계입니다

POSIX.1-2024는 운영체제 인터페이스와 실행 환경, Shell, 공통 유틸리티를 정의합니다.

> POSIX.1-2024 defines a standard operating system interface and environment, including a command interpreter (or "shell"), and common utility programs to support applications portability at the source code level.
>
> **번역** — POSIX.1-2024는 표준 운영체제 인터페이스와 실행 환경을 정의합니다. 여기에는 명령 해석기, 즉 Shell과 응용 프로그램의 소스 코드 수준 이식성을 지원하는 공통 유틸리티가 포함됩니다.
>
> — [Base Definitions 1.1 Scope, The Open Group](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap01.html) (확인: 2026-09-11)

여기서 인터페이스는 커널 내부 자료구조를 공개한다는 뜻이 아닙니다. 파일 경로를 열고, 프로세스를 만들고, 데이터를 읽고 쓰는 것처럼 **프로그램이 관찰하고 요청할 수 있는 규칙**을 뜻합니다. 커널은 요청자의 권한과 자원 상태를 확인한 뒤 작업을 수행하거나 오류를 반환합니다.

POSIX의 API 정의도 API를 “컴퓨터 시스템 서비스를 제공하기 위한 문법과 의미의 정의”로 설명합니다.

> The definition of syntax and semantics for providing computer system services.
>
> **번역** — 컴퓨터 시스템 서비스를 제공하기 위한 문법과 의미의 정의입니다.
>
> — [3.20 Application Program Interface, The Open Group](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap03.html) (확인: 2026-09-11)

따라서 `open()` 같은 함수 이름이나 `cat file.txt` 같은 명령은 하드웨어 명령어가 아니라 운영체제 서비스를 요청하는 더 높은 수준의 인터페이스입니다.

## Python: 표준 라이브러리가 운영체제 기능을 감쌉니다

Python의 `os` 모듈은 운영체제 의존 기능을 사용하는 인터페이스를 제공합니다.

> This module provides a portable way of using operating system dependent functionality.
>
> **번역** — 이 모듈은 운영체제에 의존하는 기능을 이식 가능한 방식으로 사용하는 방법을 제공합니다.
>
> — [`os` — Miscellaneous operating system interfaces, Python 3.11.16](https://docs.python.org/3.11/library/os.html) (확인: 2026-09-11)

가장 작은 예로 Python 프로세스의 현재 작업 디렉터리와 프로세스 ID를 조회해 보겠습니다.

```python
import os

print(os.getpid())
print(os.getcwd())
```

이 코드는 Python 문법만으로 값을 계산한 것이 아닙니다. Python 런타임이 `os` 모듈의 운영체제별 구현을 사용해 현재 프로세스와 작업 디렉터리에 대한 정보를 운영체제에서 가져온 것입니다. 다만 이 예시만으로 Python이 어떤 시스템 호출 번호를 사용했는지까지 알 수는 없습니다.

이 문서에서 직접 실행한 결과는 다음과 같습니다.

```text
$ python3 -c 'import os; print("pid=" + str(os.getpid())); print("cwd=" + os.getcwd())'
pid=50326
cwd=/Users/pgt0409/Desktop/git/dev-research
```

`pid`는 운영체제가 프로세스에 부여한 식별자이고, `cwd`는 해당 프로세스의 현재 작업 디렉터리입니다. 프로세스 ID처럼 실행할 때마다 달라지는 값은 시스템 자원에 대한 프로그램의 관찰 결과라는 점만 보여 줍니다.

## Python에서 다른 프로세스를 실행하는 방법

Python의 `subprocess` 모듈은 새로운 프로세스를 생성하고 그 입력·출력·종료 상태를 다루는 기능을 제공합니다.

> The subprocess module allows you to spawn new processes, connect to their input/output/error pipes, and obtain their return codes.
>
> **번역** — `subprocess` 모듈을 사용하면 새 프로세스를 만들고, 그 입력·출력·오류 파이프에 연결하며, 반환 코드를 얻을 수 있습니다.
>
> — [`subprocess` — Subprocess management, Python 3.11.16](https://docs.python.org/3.11/library/subprocess.html) (확인: 2026-09-11)

```python
import subprocess

result = subprocess.run(
    ["printf", "%s", "hello from child"],
    capture_output=True,
    text=True,
    check=True,
)

print(result.stdout)
print(result.returncode)
```

실행 결과는 다음과 같았습니다.

```text
$ python3 -c 'import subprocess; result = subprocess.run(["printf", "%s", "hello from child"], capture_output=True, text=True, check=True); print(result.stdout); print(result.returncode)'
hello from child
0
```

여기서 Python 프로세스와 `printf` 프로세스는 서로 다릅니다. `subprocess.run()`은 Python 코드 안에서 문자열을 계산한 것이 아니라 자식 프로세스를 실행하도록 운영체제에 요청하고, 자식 프로세스의 표준 출력과 종료 상태를 Python 객체로 돌려줍니다. `check=True`를 사용했기 때문에 자식 프로세스가 0이 아닌 상태로 끝나면 Python은 예외를 발생시킵니다.

## Shell: 명령을 해석하고 프로그램을 실행합니다

POSIX는 Shell을 명령 문자열을 해석하는 프로그램으로 정의합니다.

> A program that interprets sequences of text input as commands.
>
> **번역** — 텍스트 입력의 명령 시퀀스를 해석하는 프로그램입니다.
>
> — [3.333 Shell, The Open Group](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap03.html) (확인: 2026-09-11)

Shell은 모든 명령을 직접 수행하지 않습니다. `printf` 같은 내장 명령은 Shell 자체가 처리할 수 있지만, 외부 명령은 `PATH`에서 실행 파일을 찾은 뒤 별도 프로세스로 실행합니다. POSIX는 이 외부 프로그램 실행이 `exec` 계열 함수 호출과 동등한 동작을 하도록 설명합니다.

```sh
printf '%s\n' 'hello from shell'
printf '%s\n' "shell_pid=$$"
```

이 명령의 실제 출력은 다음과 같습니다.

```text
$ sh -c 'printf "%s\n" "hello from shell"; printf "%s\n" "shell_pid=$$"'
hello from shell
shell_pid=51949
```

`$$`는 현재 Shell의 프로세스 ID를 확장합니다. Shell 스크립트가 실행 중인 프로세스의 상태를 읽고 표준 출력에 쓰는 것은 운영체제가 제공하는 프로세스·출력 스트림 인터페이스를 Shell이 사용하기 때문입니다.

명령의 종료 상태도 운영체제와 프로그램 사이의 계약입니다.

```sh
sh -c 'exit 7'
```

이 명령은 실제로 종료 상태 `7`을 반환했습니다. Shell에서 이 상태는 “명령이 7이라는 결과로 종료되었다”는 정보이며, 호출한 프로그램이나 상위 Shell이 확인할 수 있습니다. 종료 상태의 숫자 자체에 모든 상황에 공통인 의미가 붙는 것은 아니므로, 애플리케이션은 자신이 호출하는 명령의 규칙을 함께 알아야 합니다.

## 같은 작업도 층마다 다른 이름으로 보입니다

파일 읽기와 자식 프로세스 실행을 예로 들면, 같은 운영체제 기능이 언어마다 다음처럼 보입니다.

| 작업 | Python | Shell | 운영체제 관점 |
| --- | --- | --- | --- |
| 파일 열기·읽기 | `open()` 또는 `pathlib.Path.read_text()` | `cat file.txt` | 파일 경로와 파일 디스크립터를 통한 파일 서비스 요청 |
| 다른 프로그램 실행 | `subprocess.run([...])` | `command` 입력 | 새 프로세스 생성과 실행 파일 적재 |
| 출력 전달 | `print()` 또는 `capture_output=True` | 표준 출력·파이프 `\|` | 프로세스의 표준 입출력 스트림 연결 |
| 현재 위치 조회 | `os.getcwd()` | `pwd` 또는 `$PWD` | 프로세스 실행 환경의 현재 작업 디렉터리 조회 |

이 표는 Python과 Shell이 같은 구현이라는 뜻이 아닙니다. Python에는 Python 런타임과 표준 라이브러리가 있고, Shell에는 명령 해석 규칙과 내장 명령이 있습니다. 두 환경 모두 운영체제가 제공하는 프로세스·파일·입출력 추상화를 사용한다는 뜻입니다.

## 직접 하드웨어를 다루는 것과 운영체제에 요청하는 것은 다릅니다

일반 애플리케이션은 디스크의 물리적 섹터 번호나 네트워크 장치의 레지스터를 직접 지정하지 않습니다. 파일을 읽을 때는 경로와 읽기 요청을 전달하고, 커널이 권한·파일 시스템·장치 드라이버를 거쳐 데이터를 준비합니다. 권한이 없거나 자원이 없으면 애플리케이션은 오류나 비정상 종료 상태를 받습니다.

이 경계는 안전성과 이식성의 근거입니다.

- 안전성: 프로세스가 다른 프로세스의 메모리나 임의 장치를 마음대로 변경하지 못하도록 커널이 접근을 검사합니다.
- 이식성: Python의 `os`나 POSIX 인터페이스처럼 공통 기능을 사용하면 운영체제별 내부 구현을 애플리케이션이 직접 알 필요가 줄어듭니다.
- 차이의 발생: 언어 런타임의 구현, 운영체제의 확장, 권한, 파일 시스템, Shell 종류가 다르면 같은 코드나 명령의 동작 범위가 달라질 수 있습니다.

따라서 “Python으로 파일을 읽었다”는 문장은 세 층으로 나누어 읽어야 합니다. Python 코드가 API를 호출했고, Python 런타임과 표준 라이브러리가 그 요청을 운영체제 인터페이스에 연결했으며, 커널과 파일 시스템이 실제 자원 접근을 중재했다는 뜻입니다. 이 문서의 실행 기록은 첫째와 둘째 층의 사용 결과를 보여 주지만, 커널 내부에서 정확히 어떤 경로를 거쳤는지까지 검증한 기록은 아닙니다.

## 확인하지 못한 것

- Python 3.9.6의 각 `os`·`subprocess` 호출이 macOS Darwin 커널의 어떤 시스템 호출로 연결되는지는 시스템 호출 추적을 별도로 수행하지 않았으므로 확인하지 못했습니다.
- Shell 예시에서 `printf`가 Shell 내장 명령으로 처리되었는지 외부 실행 파일로 실행되었는지는 `sh` 구현의 실행 경로를 별도로 추적하지 않았으므로 확인하지 못했습니다.
- Python과 Shell의 모든 운영체제별 차이는 다루지 않았습니다. 이 문서는 POSIX 계열 macOS에서 확인한 기본 경로를 설명합니다.

---

*작성일: 2026-09-11*
