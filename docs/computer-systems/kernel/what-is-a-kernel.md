---
sidebar_position: 1
---

# 커널은 어떤 언어로 만들어지는가 — 하나의 언어가 아니라 하드웨어 경계에 맞춘 여러 언어의 조합

> **원문** — [Programming Language, The Linux Kernel documentation](https://docs.kernel.org/process/programming-language.html) · [XNU README](https://github.com/apple-oss-distributions/xnu#what-is-xnu)
>
> **확인 날짜** — 2026-09-12. 두 문서 모두 판번호가 없는 온라인 문서이므로 URL과 확인 날짜를 기록합니다.
>
> **검증 상태** — Linux 커널 공식 문서와 Apple이 공개한 XNU 소스 저장소의 README 전문을 읽고 정리했습니다. 현재 이 컴퓨터에서 실행 중인 Darwin 커널 식별 정보도 직접 확인했습니다. 모든 운영체제 커널의 소스 구성을 전수 대조한 것은 아닙니다.

## 먼저 결론

커널은 일반적으로 **C를 중심으로 만들고, CPU가 시작하는 부분이나 특정 명령어를 직접 다뤄야 하는 부분에는 어셈블리어를 사용합니다.** 최근 커널에는 Rust 같은 언어가 추가되기도 합니다. 운영체제마다 구현이 다르므로 “커널은 C로 만들어진다”는 말은 대표적인 경향을 요약한 것이지, 모든 커널의 모든 코드가 C라는 뜻은 아닙니다.

Linux 공식 문서는 Linux 커널을 C로 작성한다고 명시하고, 실제로는 GNU C11 방언으로 보통 컴파일한다고 설명합니다.

> The Linux kernel is written in the C programming language. More precisely, it is typically compiled with `gcc` under `-std=gnu11`: the GNU dialect of ISO C11.
>
> **번역** — Linux 커널은 C 프로그래밍 언어로 작성됩니다. 더 정확히 말하면 보통 `-std=gnu11` 옵션, 즉 ISO C11의 GNU 방언을 사용해 `gcc`로 컴파일합니다.
>
> — [Programming Language, The Linux Kernel documentation](https://docs.kernel.org/process/programming-language.html) (확인: 2026-09-12)

따라서 가장 짧은 답은 **“대부분 C이고, 필요한 곳에 어셈블리어와 다른 언어가 섞인다”**입니다.

## 왜 C가 중심인가

커널은 메모리·레지스터·주소·인터럽트·장치 레지스터처럼 하드웨어에 가까운 대상을 다루면서도, 수십 년간 여러 CPU 아키텍처와 컴파일러에서 유지되어야 합니다. C는 포인터와 메모리 배치를 직접 다룰 수 있고, 컴파일하면 운영체제 런타임에 의존하지 않는 기계어를 만들 수 있어 이 경계에 오래 사용되어 왔습니다.

다만 C라고 해서 하드웨어를 자동으로 안전하게 다뤄 주는 것은 아닙니다. 포인터 연산, 수동 메모리 관리, 동시성 코드의 실수는 커널 패닉이나 보안 취약점으로 이어질 수 있습니다. “C로 작성한다”는 사실과 “C 코드가 안전하다”는 판단은 별개입니다.

가장 작은 예시는 커널 코드가 장치나 CPU 기능을 다룰 때 C 함수 안에서 메모리와 비트 단위를 직접 조작하는 형태입니다.

```c
// 개념을 보여 주는 축약 예시입니다. 실제 커널 API가 아닙니다.
volatile unsigned int *status = device_register;
unsigned int value = *status;

if (value & DEVICE_READY)
    start_transfer();
```

이 코드는 C 문법으로 작성되지만, `device_register`가 가리키는 주소와 `DEVICE_READY`의 의미는 특정 하드웨어와 커널 설계에 매여 있습니다. 그러므로 언어만 보면 안 되고, 어떤 아키텍처와 장치에 대한 코드인지 함께 봐야 합니다.

## 어셈블리어는 어디에 쓰이는가

C만으로는 CPU가 막 부팅된 초기 단계, 문맥 전환, 예외 진입, 특수 레지스터 접근처럼 특정 명령어와 레지스터를 정확히 제어해야 하는 코드를 표현하기 어렵습니다. 이때 아키텍처별 어셈블리어 또는 C 안의 inline assembly가 사용됩니다.

Linux 커널 공식 코딩 스타일 문서는 아키텍처별 코드에서 CPU·플랫폼 기능과 연결하기 위해 inline assembly가 필요할 수 있다고 설명하고, 크고 복잡한 어셈블리 함수는 `.S` 파일에 두라고 안내합니다.

> In architecture-specific code, you may need to use inline assembly to interface with CPU or platform functionality.
>
> **번역** — 아키텍처별 코드에서는 CPU 또는 플랫폼 기능과 연결하기 위해 inline assembly가 필요할 수 있습니다.
>
> — [Inline assembly, Linux kernel coding style](https://docs.kernel.org/6.17/process/coding-style.html#inline-assembly) (확인: 2026-09-12)

구조는 대략 다음과 같습니다.

```text
공통 커널 로직          → C
CPU·플랫폼별 저수준 코드 → C + inline assembly 또는 어셈블리어(.S)
```

그래서 어셈블리어는 커널 전체를 작성하는 주력 언어라기보다, **C로 표현하기 어렵거나 CPU별로 달라지는 좁은 경계**에 집중됩니다. 어셈블리어 파일을 읽지 않고도 커널의 모든 동작을 이해할 수 있다는 뜻은 아니지만, 커널 전체가 어셈블리어로 작성된다는 뜻도 아닙니다.

## Rust와 C++도 사용되는가

사용됩니다. 다만 “커널 전체가 Rust나 C++로 바뀌었다”는 뜻은 아닙니다.

Linux 공식 문서는 `CONFIG_RUST` 설정 아래 Rust를 지원하며 `rustc`와 Rust 2021 edition으로 컴파일한다고 설명합니다.

> The kernel has support for the Rust programming language under `CONFIG_RUST`.
>
> **번역** — 커널은 `CONFIG_RUST` 설정 아래에서 Rust 프로그래밍 언어를 지원합니다.
>
> — [Programming Language, The Linux Kernel documentation](https://docs.kernel.org/process/programming-language.html#rust) (확인: 2026-09-12)

그러나 Linux의 Rust 문서는 Rust 지원이 커널 개발자와 메인테이너가 추상화·드라이버·인프라를 개발하기 위한 단계이며, 특정 설정에서는 여전히 개발 중이라고 설명합니다. 따라서 Linux 기준으로 Rust는 **기존 C 커널을 전부 대체한 언어가 아니라, 제한된 영역에 추가된 언어**로 이해해야 합니다.

Apple의 공개 XNU 저장소는 XNU를 Mach와 FreeBSD 구성 요소를 결합한 하이브리드 커널로 설명하며, 드라이버 작성을 위한 C++ API인 IOKit도 포함한다고 밝힙니다.

> XNU is a hybrid kernel combining the Mach kernel developed at Carnegie Mellon University with components from FreeBSD and a C++ API for writing drivers called IOKit.
>
> **번역** — XNU는 카네기 멜론 대학교에서 개발한 Mach 커널과 FreeBSD 구성 요소, 그리고 IOKit이라는 드라이버 작성용 C++ API를 결합한 하이브리드 커널입니다.
>
> — [XNU README, What is XNU?](https://github.com/apple-oss-distributions/xnu#what-is-xnu) (확인: 2026-09-12)

이 두 사례가 보여 주는 것은 “커널 언어”가 하나로 고정되지 않는다는 점입니다.

| 언어 | 주로 맡는 영역 | 문서에서 확인한 사례 |
| --- | --- | --- |
| C | 공통 커널 로직과 자원 관리 | Linux 커널의 주 언어 |
| 어셈블리어 | 부팅·예외 진입·문맥 전환·특수 명령어 등 아키텍처 의존 코드 | Linux 커널의 `.S` 파일과 inline assembly 지침 |
| Rust | 일부 추상화·드라이버·인프라 | Linux의 `CONFIG_RUST` 지원 |
| C++ | 특정 커널 구성 요소나 드라이버 API | XNU의 IOKit |

표의 “주로”는 모든 커널에 대한 통계가 아니라, 위 공식 자료에서 확인한 대표 사례를 요약한 표현입니다.

## 이 컴퓨터의 커널은 무엇으로 만들어졌는가

현재 실행 중인 macOS에서 다음 명령을 직접 실행했습니다.

```text
$ sysctl -n kern.ostype kern.osrelease kern.osproductversion
Darwin
24.6.0
15.7.4
```

이 출력은 실행 중인 커널의 식별 정보가 Darwin 24.6.0이고 운영체제 제품 버전이 15.7.4임을 보여 줍니다. 이것만으로 현재 설치된 커널 바이너리의 언어별 코드 비율이나 Apple 내부 코드까지 알 수는 없습니다. 다만 Apple이 공개한 XNU 소스 설명을 통해 XNU에 C++ 기반 IOKit이 포함된다는 사실은 확인할 수 있습니다.

## 정리

“커널은 어떤 언어로 만들어져 있나?”에 대한 정확한 답은 다음과 같습니다.

> **커널은 보통 C를 중심으로 만들고, 하드웨어와 CPU에 가장 가까운 부분에는 어셈블리어를 사용하며, 운영체제와 구성 요소에 따라 Rust·C++ 같은 언어도 함께 사용합니다.**

그러므로 커널을 배울 때는 C 문법만 익히는 것으로 끝나지 않습니다. C가 메모리와 포인터를 어떻게 표현하는지, 컴파일러가 이를 기계어로 어떻게 바꾸는지, CPU 아키텍처별 코드가 어디에서 갈라지는지를 함께 봐야 커널 코드가 실제로 무엇을 하는지 검증할 수 있습니다.

## 확인하지 못한 것

- Windows NT 커널의 전체 언어별 구성은 확인하지 못했습니다. Microsoft가 공개한 공식 자료만으로는 전체 커널 소스의 언어 구성을 산출할 수 없기 때문입니다.
- Linux와 XNU의 언어별 코드 비율은 제시하지 않았습니다. 확인한 공식 문서와 저장소 README가 언어별 전체 비율을 제공하지 않기 때문입니다.

*작성일: 2026-09-12*
