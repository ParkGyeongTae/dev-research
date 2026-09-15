# Java란 무엇인가 — 언어 명세와 JVM 실행 규격의 결합

> **원문** — [The Java Language Specification, Java SE 25 Edition, §1](https://docs.oracle.com/javase/specs/jls/se25/html/jls-1.html), [The Java Virtual Machine Specification, Java SE 25 Edition, §1](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-1.html)
>
> **확인 날짜** — 2026-09-15. Java SE 25 명세는 2025년 9월 정식판입니다.
>
> **검증 상태** — JLS·JVMS의 정의와 Java 11 도구 실행을 확인했습니다. 릴리스·지원 일정은 Oracle 공식 로드맵을 대조했고, JVM 성능 수치는 측정하지 않았습니다.

Java는 일반 목적의 동시성·클래스 기반 객체 지향 언어입니다. 하지만 “Java가 실행된다”는 문장에는 언어만 들어 있지 않습니다. Java 소스의 규칙은 JLS(Java Language Specification)가, JVM이 읽는 `class` 파일과 바이트코드의 규칙은 JVMS(Java Virtual Machine Specification)가 정합니다.

## 언어와 JVM은 같은 것이 아닙니다

JLS는 Java 프로그램을 어떻게 쓰고 컴파일할 수 있는지를 정의합니다.

> The Java programming language is strongly and statically typed.
>
> **번역** — Java 프로그래밍 언어는 강한 정적 타입 언어입니다.
>
> — [JLS §1](https://docs.oracle.com/javase/specs/jls/se25/html/jls-1.html) (확인: 2026-09-15)

반면 JVMS가 정의하는 것은 JVM 자체와 `class` 파일 형식입니다.

> The Java Virtual Machine knows nothing of the Java programming language, only of the particular binary format defined by the Java Virtual Machine Specification.
>
> **번역** — JVM은 Java 프로그래밍 언어를 알지 못하고, Java Virtual Machine Specification이 정의한 특정 바이너리 형식만 압니다.
>
> — [JVMS §1](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-1.html) (확인: 2026-09-15)

따라서 JVM은 Java로 작성된 `class` 파일만을 위한 기계가 아닙니다. JVM의 `class` 파일 형식으로 번역할 수 있는 다른 언어도 JVM 위에서 실행될 수 있습니다. Kotlin·Scala 애플리케이션을 운영할 때도 Java 소스 문법보다 JVM의 클래스 로딩, 바이트코드, 메모리와 스레드 동작을 관찰하게 되는 이유입니다. 이 마지막 문장은 명세의 분리에서 도출한 설명입니다.

## 소스에서 실행까지

`javac`는 Java 소스를 읽어 JVM에서 실행되는 `class` 파일로 컴파일합니다. `java`는 클래스를 JVM에서 실행하고, `javap`는 `class` 파일을 분석합니다. — [JDK 25 Tool Specifications](https://docs.oracle.com/en/java/javase/25/docs/specs/man/index.html) (확인: 2026-09-15)

가장 작은 예시는 다음과 같습니다.

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("hello");
    }
}
```

```bash
javac Hello.java
java Hello
```

`javac`의 결과는 운영체제별 기계어가 아니라 `Hello.class`입니다. JVM은 이 파일을 로드·링크한 뒤 실행하며, 구현에 따라 실행 중 코드를 기계어로 변환하고 동적으로 최적화할 수 있습니다. — [JLS §1](https://docs.oracle.com/javase/specs/jls/se25/html/jls-1.html) (확인: 2026-09-15)

그러므로 `javac` 성공과 프로그램 실행 성공은 다릅니다. 컴파일 시점에는 소스의 타입 오류를 검사하지만, 클래스 로딩·링크·실행 단계에서는 다른 종류의 오류가 발생할 수 있습니다.

## `class` 파일 버전이 런타임을 제한합니다

`class` 파일에는 `minor_version`과 `major_version`이 들어 있습니다. JVM은 자신이 지원하는 형식보다 높은 버전의 파일을 실행할 수 없습니다. — [JVMS §4.1](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-4.html) (확인: 2026-09-15)

예를 들어 Java 11로 컴파일한 클래스 파일의 major version은 55입니다. Java 25로 컴파일해 Java 11 런타임으로 실행하면, 소스가 아니라 런타임의 클래스 로더에서 `UnsupportedClassVersionError`가 발생할 수 있습니다. 이 상황은 규칙을 설명하는 예시이며, 이 작업에서 Java 25로 컴파일해 오류를 재현한 것은 아닙니다.

`--release`는 특정 Java 릴리스의 언어 규칙·API·바이트코드 대상으로 컴파일할 때 사용하는 `javac` 옵션입니다. `-source`와 `-target`만 따로 지정하는 것보다 목표 플랫폼의 API까지 함께 제한할 수 있습니다. — [javac — Compiling for Earlier Releases](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html) (확인: 2026-09-15)

```bash
javac --release 11 Hello.java
```

이 명령은 현재 설치된 JDK가 11이라는 뜻이 아니라, 결과물을 Java 11 플랫폼에 맞추겠다는 뜻입니다. 실제 프로젝트에서는 빌드 도구의 toolchain 또는 compiler 설정도 함께 확인해야 합니다.

## 릴리스 주기와 LTS를 구분합니다

OpenJDK JDK 프로젝트는 시간 기반으로 6개월마다 기능 릴리스를 냅니다. — [OpenJDK JDK Project](https://openjdk.org/projects/jdk/) (확인: 2026-09-15)

Oracle의 현재 로드맵에서는 Java 21과 Java 25가 LTS이고, Java 26은 non-LTS로 표시됩니다. 다음 LTS로 계획된 Java 29와 일정은 변경될 수 있습니다. 이 표는 Oracle의 지원 정책이며 모든 OpenJDK 배포판의 지원 계약을 뜻하지는 않습니다. — [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) (확인: 2026-09-15)

따라서 “Java 버전”을 말할 때는 언어·API 기준 릴리스, JDK 배포판과 업데이트, 실행 환경의 호환성, 지원·라이선스 조건을 나누어 확인해야 합니다. Oracle JDK의 조건을 다른 OpenJDK 빌드에 그대로 적용해서는 안 됩니다.

## 데이터 엔지니어링에서 JVM을 보는 이유

Java를 직접 작성하지 않아도 JVM을 운영하게 되는 경우가 있습니다. 그때 중요한 관찰 대상은 Java 문법보다 다음 경계입니다.

- `class` 파일과 라이브러리가 실행 JDK가 지원하는 버전인가
- 프로세스 메모리에서 Java heap 외 영역까지 고려했는가
- GC·스레드·클래스 로딩 문제가 애플리케이션 로그와 어떤 관계를 갖는가

특정 프레임워크의 처리 위치나 컨테이너 OOM 원인은 프레임워크·배포 방식에 따라 달라집니다. 이 문서의 공식 원문만으로 확정하지 않으며, 해당 시스템의 공식 문서와 실제 프로세스 측정이 필요합니다.

## 실행 환경

2026-09-15에 직접 확인했습니다.

```console
$ java -version
openjdk version "11.0.31" 2026-04-21
OpenJDK Runtime Environment Homebrew (build 11.0.31+0)
OpenJDK 64-Bit Server VM Homebrew (build 11.0.31+0, mixed mode)

$ javac -version
javac 11.0.31
```

macOS 15.7.4, Apple Silicon, Homebrew OpenJDK 11입니다. 이 작업에서는 Java 예제의 컴파일·실행 출력과 `javap` 출력은 새로 재현하지 않았습니다.

## 확인하지 못한 것

- Java 25 `class` 파일을 Java 11에서 실행한 실제 오류 출력 — 이 작업에서는 Java 25 JDK를 사용하지 않았습니다.
- JVM별 JIT·GC 성능 비교 — 워크로드·힙 크기·동시성·측정 방법이 필요한 별도 실험이므로 수치를 제시하지 않았습니다.

*작성일: 2026-09-15*
