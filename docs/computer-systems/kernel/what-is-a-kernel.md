---
sidebar_position: 1
---

# 커널이란 무엇인가 — 운영체제 자원에 대한 권한 있는 중재자

> **원문** — [Additional Features: The Kernel, Apple Developer Documentation](https://developer.apple.com/library/archive/documentation/Porting/Conceptual/PortingUnix/additionalfeatures/additionalfeatures.html)
>
> **확인 날짜** — 2026-09-11. Apple의 Unix 포팅 문서와 Kernel Framework 문서를 확인했습니다. 해당 문서는 보관 문서이므로 판번호 대신 URL과 확인 날짜를 기록합니다.
>
> **검증 상태** — Apple 공식 문서를 읽고 macOS의 커널 식별 정보를 직접 확인했습니다. Linux 커널의 내부 동작이나 다른 운영체제의 구현을 이 문서에서 직접 재현하지는 않았습니다.

커널은 운영체제에서 **프로세스 실행, 메모리 보호, 파일 시스템, 네트워크, 장치 접근처럼 여러 프로그램이 공유하는 자원을 관리하는 핵심 부분**입니다. 응용 프로그램은 일반적으로 제한된 권한의 사용자 공간에서 실행되고, 커널 기능이 필요할 때 시스템 호출이나 라이브러리 인터페이스를 통해 요청합니다.

Apple은 커널을 운영체제의 핵심으로 설명합니다.

> The core of any operating system is its kernel.
>
> **번역** — 모든 운영체제의 핵심은 커널입니다.
>
> — [Additional Features: The Kernel, Apple Developer Documentation](https://developer.apple.com/library/archive/documentation/Porting/Conceptual/PortingUnix/additionalfeatures/additionalfeatures.html) (확인: 2026-09-11)

macOS에 대해서는 같은 문서가 XNU가 Mach 기반 기능과 BSD 기능을 함께 포함한다고 설명합니다.

> The OS X kernel, known as XNU, differs significantly.
>
> **번역** — XNU라고 알려진 OS X의 커널은 [다른 Unix 계열의 기반과] 상당히 다릅니다.
>
> — [Additional Features: The Kernel, Apple Developer Documentation](https://developer.apple.com/library/archive/documentation/Porting/Conceptual/PortingUnix/additionalfeatures/additionalfeatures.html) (확인: 2026-09-11)

이 문장에서 중요한 결론은 “Unix 계열이면 커널이 모두 같다”가 아니라, **공통 인터페이스와 비슷한 책임이 있어도 내부 커널은 서로 다를 수 있다**는 점입니다.

## 사용자 공간과 커널 공간

프로그램은 보통 사용자 공간에서 실행됩니다. 사용자 공간의 코드는 다른 프로세스의 메모리나 장치에 임의로 접근할 수 없습니다. 파일을 읽거나 새 프로세스를 만들려면 운영체제가 정한 경계를 통과해야 합니다.

```text
사용자 공간
  Python, 셸, cat, 애플리케이션
        │ 시스템 호출·라이브러리 호출
        ▼
커널 공간
  프로세스·메모리·파일 시스템·네트워크·드라이버
        │
        ▼
하드웨어
```

예를 들어 `read()`를 호출한 프로그램은 디스크의 물리 주소를 지정하지 않습니다. 커널이 파일 디스크립터를 확인하고, 파일 시스템과 장치 드라이버를 통해 데이터를 가져온 뒤 프로그램의 메모리로 전달합니다. 권한이 없거나 파일 디스크립터가 유효하지 않으면 커널은 실패를 반환합니다.

## POSIX API와 시스템 호출은 같은 것이 아닙니다

POSIX는 프로그램이 사용할 수 있는 표준 인터페이스를 정의하고, 시스템 호출은 커널로 들어가는 운영체제별 통로입니다. C 라이브러리가 POSIX 함수 호출을 시스템 호출로 연결할 수 있지만, 모든 POSIX 함수가 시스템 호출인 것은 아닙니다.

```text
Python·C 프로그램
  ↓
POSIX 함수와 C 라이브러리
  ↓ 필요할 때
운영체제별 시스템 호출
  ↓
커널
```

따라서 POSIX 프로그램이 여러 운영체제에서 다시 빌드될 수 있어도, 커널 내부 구현이나 시스템 호출 번호까지 같아야 하는 것은 아닙니다. 커널은 같은 외부 계약을 서로 다른 내부 방식으로 구현할 수 있습니다.

## 이 컴퓨터에서 확인한 커널

```text
$ sysctl -n kern.ostype kern.osrelease kern.osproductversion
Darwin
24.6.0
15.7.4
```

이 출력은 현재 실행 중인 커널이 Darwin 24.6.0임을 보여 줍니다. Apple 문서의 XNU 설명과 이 출력으로 macOS의 커널 식별 정보는 확인했지만, 이 명령만으로 Mach·BSD 각 부분의 실행 경로나 모든 장치 드라이버의 동작까지 확인한 것은 아닙니다.

커널을 “컴퓨터를 직접 조작하는 프로그램”이라고만 이해하면 부족합니다. 커널의 핵심은 직접 조작 자체보다 **권한이 있는 하나의 중재자로서 여러 프로그램의 요청을 안전하게 조정하는 것**입니다.

---

*작성일: 2026-09-11*
