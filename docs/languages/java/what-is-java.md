# Java란 무엇인가 — 언어와 JVM은 서로 다른 명세다

Java를 "느리지만 안정적인 백엔드 언어" 정도로 알고 넘어가면, 데이터 엔지니어가 실제로 Java를 만나는 지점을 놓칩니다.
Kafka·Spark·Flink·Hadoop·Trino는 모두 JVM 위에서 돕니다. **Java 코드를 한 줄도 쓰지 않아도 JVM은 매일 만집니다.**

## 1. 무엇인가 — 두 개의 명세

Java에는 별개로 관리되는 두 개의 명세가 있습니다.

| 명세 | 정의하는 것 |
| --- | --- |
| **JLS** (Java Language Specification) | 문법, 타입 규칙, 제네릭 — 사람이 쓰는 소스 코드 |
| **JVMS** (JVM Specification) | `class` 파일 포맷과 바이트코드 — 기계가 읽는 실행 단위 |

이 둘이 분리돼 있다는 게 핵심입니다. JVM 명세는 자기가 Java와 무관하다고 명시적으로 말합니다.

> The Java Virtual Machine knows nothing of the Java programming language, only of a particular binary format, the `class` file format.
>
> — [The Java Virtual Machine Specification, Java SE 25 Edition, §1.2](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-1.html) (확인: 2026-09-06)

같은 문서는 "유효한 `class` 파일로 표현될 수 있는 기능을 가진 어떤 언어든 JVM 위에서 호스팅될 수 있다"고 이어집니다.
Scala·Kotlin·Clojure가 JVM 위에서 도는 것도, **Spark를 Scala로 짜든 Java로 짜든 같은 GC 튜닝이 적용되는 것도** 이 구조 때문입니다.

## 2. 어떻게 실행되는가

`소스(.java)` → **javac** → `class 파일(바이트코드)` → **JVM**(인터프리터 + JIT 컴파일)의 순서입니다.

아래는 실제로 돌린 기록입니다.

**실행 환경**

```
openjdk 11.0.31 2026-04-21
OpenJDK Runtime Environment Homebrew (build 11.0.31+0)
OpenJDK 64-Bit Server VM Homebrew (build 11.0.31+0, mixed mode)
```

macOS(Darwin 24.6.0). 로컬에 설치된 것이 JDK 11이라 **아래 출력은 모두 Java 11 기준**입니다.

```java title="Hello.java"
public class Hello {
    public static void main(String[] args) {
        int n = 1 + 2;
        System.out.println("sum=" + n);
    }
}
```

```console
$ javac Hello.java && java Hello
sum=3
```

컴파일된 `class` 파일에는 **자신이 요구하는 클래스 파일 포맷 버전**이 박힙니다.

```console
$ javap -v Hello.class | grep -E '^\s*(major|minor) version'
  minor version: 0
  major version: 55
```

major 55가 Java 11입니다. 이 숫자가 뒤에 나올 실패 모드의 원인입니다.

바이트코드를 보면 JVM이 실제로 무엇을 받는지 드러납니다.

```console
$ javap -c Hello.class
  public static void main(java.lang.String[]);
    Code:
       0: iconst_3
       1: istore_1
       2: getstatic     #2                  // Field java/lang/System.out:Ljava/io/PrintStream;
       5: iload_1
       6: invokedynamic #3,  0              // InvokeDynamic #0:makeConcatWithConstants:(I)Ljava/lang/String;
      11: invokevirtual #4                  // Method java/io/PrintStream.println:(Ljava/lang/String;)V
      14: return
```

첫 줄이 `iconst_3`입니다. 소스에 쓴 `1 + 2`가 바이트코드에는 없습니다 — **javac가 컴파일 시점에 3으로 접었습니다.**
즉 "Java는 느리다"를 말할 때 대상이 되는 컴파일러 최적화·JIT·GC는 각각 다른 단계에서 일어나며, 셋을 뭉뚱그리면 성능 이야기가 성립하지 않습니다.

정적 타입 언어라서 **타입 오류는 실행 전에 걸립니다.**

```console
$ javac Bad.java
Bad.java:3: error: incompatible types: String cannot be converted to int
        int n = "문자열";
                ^
1 error
```

## 3. 버전과 LTS — 지금 무엇을 쓰는가

OpenJDK는 **6개월 고정 주기**로 기능 릴리스를 냅니다("The Project ships a feature release every six months according to a strict, time-based model" — [OpenJDK JDK Project](https://openjdk.org/projects/jdk/), 확인: 2026-09-06). 매년 3월·9월입니다.

| 릴리스 | GA | LTS 여부 |
| --- | --- | --- |
| JDK 21 | 2023-09-19 | **LTS** |
| JDK 25 | 2025-09-16 | **LTS** |
| JDK 26 | 2026-03-17 | non-LTS |

GA 날짜는 [OpenJDK JDK Project](https://openjdk.org/projects/jdk/), LTS 지정은 [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)에서 확인했습니다(둘 다 확인: 2026-09-06).
Oracle 표 기준 LTS는 8·11·17·21·25이고, 27·28은 non-LTS, **29가 LTS로 예정**돼 있습니다 — 다만 같은 표에 "LTS/non-LTS designation and dates are subject to change"라는 단서가 붙어 있습니다.

지금 시점에서 실무에 직접 걸리는 항목이 하나 있습니다. 같은 페이지에 이렇게 적혀 있습니다.

> Updates of JDK 21 released after September of 2026, are planned to be offered under the Java SE OTN license.
>
> — Oracle Java SE Support Roadmap (확인: 2026-09-06)

즉 **2026년 9월 이후 배포되는 JDK 21 업데이트부터는 Oracle 배포판의 라이선스가 바뀝니다.** 이 문서를 쓰는 시점(2026-09-06)이 바로 그 경계입니다.
다만 이것은 **Oracle이 배포하는 빌드**에 대한 이야기입니다. Eclipse Temurin·Amazon Corretto 같은 다른 OpenJDK 빌드는 각자의 라이선스를 따릅니다 — 회사에서 무엇을 쓰는지 확인하지 않고 이 문장을 적용하면 안 됩니다.

JDK 25에서 확정된 것 중 데이터 쪽에 걸리는 항목(모두 [JDK 25 프로젝트 페이지](https://openjdk.org/projects/jdk/25/) 기준, 확인: 2026-09-06):

- **JEP 519: Compact Object Headers** — 객체 헤더 축소. 힙에 작은 객체가 대량으로 뜨는 워크로드에서 메모리 사용량에 영향을 줍니다.
- **JEP 521: Generational Shenandoah** — Shenandoah GC의 세대별 모드 정식화.
- **JEP 506: Scoped Values** / **JEP 505: Structured Concurrency**(다섯 번째 프리뷰) — 가상 스레드와 함께 쓰는 동시성 API. Structured Concurrency는 **아직 프리뷰**입니다.

> 추측: Compact Object Headers가 Spark executor 힙에 실제로 얼마나 효과가 있는지는 워크로드에 따라 갈릴 것으로 보입니다 — 이 저장소에서 측정한 적 없습니다. **확인 필요.**

## 4. 실무에서 어디에 쓰이는가

### 일반적인 사용 영역

Stack Overflow 2025 개발자 설문에서 Java 사용률은 **29.4%**였습니다([2025 Stack Overflow Developer Survey — Technology](https://survey.stackoverflow.co/2025/technology), 확인: 2026-09-06. 해당 문항 응답 31,771건).
같은 설문에서 JavaScript 66%, SQL 58.6%, Python 57.9%, TypeScript 43.6%입니다.

**이 수치는 자기선택 편향이 있는 설문입니다.** Stack Overflow를 쓰는 개발자만 답했고, 언어별 "코드 줄 수"나 "매출 비중"이 아니라 응답자 비율입니다. 순위를 대략 잡는 용도 이상으로 쓰면 안 됩니다.

대표적인 영역은 대규모 엔터프라이즈 백엔드(Spring 계열), Android 애플리케이션, 그리고 아래의 데이터 인프라입니다.

### 데이터 엔지니어가 Java를 만나는 실제 지점

Java로 애플리케이션을 짜지 않아도 JVM은 계속 만나게 됩니다. 데이터 엔지니어링 스택의 상당수가 JVM 위에서 돌기 때문입니다 — Kafka, Spark, Flink, Hadoop, Hive, Trino, Elasticsearch 등.

그래서 실제로 하는 일은 대개 이 셋입니다.

1. **힙과 GC 설정** — `-Xmx`, GC 종류 선택, executor/broker 메모리 배분
2. **스택 트레이스 읽기** — PySpark에서 터진 에러도 결국 JVM 스택 트레이스로 나옵니다
3. **JAR 의존성 맞추기** — 커넥터·드라이버 버전과 클래스 파일 버전 정합

**PySpark를 쓰면 Python으로 일한다고 생각하기 쉽지만, 실행되는 것은 JVM입니다.** Python 코드는 실행 계획을 조립해 JVM으로 넘기는 역할이고, 무거운 처리는 JVM에서 일어납니다. 그래서 OOM이 나면 파이썬 쪽이 아니라 executor의 JVM 힙을 봐야 합니다.

## 5. 경계 — Java가 안 맞는 상황

- **짧게 뜨고 죽는 프로세스.** JVM은 기동 후 JIT이 워밍업되며 빨라지는 구조라, 수백 ms 만에 끝나는 CLI나 짧은 서버리스 함수에서는 워밍업 비용만 내고 끝납니다. (AOT 관련 JEP 514·515가 JDK 25에 들어갔지만 **이 저장소에서 측정한 적 없습니다 — 확인 필요.**)
- **탐색적 데이터 분석.** 컴파일-실행 주기가 REPL 기반 작업과 맞지 않고, pandas·scikit-learn에 대응하는 생태계가 얇습니다.
- **한 번 쓰고 버리는 스크립트.** 타입 선언과 빌드 설정의 고정 비용이 스크립트 길이보다 큽니다.
- **메모리가 빡빡한 환경.** JVM은 힙 외에 메타스페이스·스레드 스택·GC 구조를 위한 오버헤드를 항상 깔고 갑니다.

## 6. 실패 모드 — 잘못 쓰면 무슨 일이 생기는가

### (1) 클래스 파일 버전 불일치

`class` 파일에 박힌 major 버전보다 낮은 JVM에서 실행하면 로딩 단계에서 죽습니다.
아래는 실제로 재현한 기록입니다 — 앞에서 만든 `Hello.class`(major 55)의 **7번째 바이트를 69(Java 25)로 직접 조작한 뒤** JDK 11에서 실행했습니다.

```console
$ java -cp . Patched
오류: 기본 클래스 Patched을(를) 로드하는 중 LinkageError가 발생했습니다.
	java.lang.UnsupportedClassVersionError: Patched has been compiled by a more recent version of the Java Runtime (class file version 69.0), this version of the Java Runtime only recognizes class file versions up to 55.0
```

실무에서는 커넥터 JAR만 최신으로 올리고 런타임 JDK는 그대로 둘 때 이 형태로 터집니다. 증상은 컴파일 에러가 아니라 **런타임 로딩 실패**라서, 배포 후에야 드러납니다.

### (2) 컨테이너 메모리 한도와 힙 설정의 불일치

`-Xmx`로 잡은 힙 위에 메타스페이스·스레드 스택·네이티브 버퍼가 더 얹히므로, 힙 상한을 컨테이너 메모리 한도와 같게 잡으면 JVM이 `OutOfMemoryError`를 던지기 전에 **커널이 컨테이너를 OOM kill** 합니다. 이때 애플리케이션 로그에는 아무 것도 남지 않고 프로세스만 사라집니다.

> 위 문단은 JVM 메모리 구조에서 따라 나오는 설명이며, **이 저장소에서 재현 실험을 하지 않았습니다 — 확인 필요.** 사용 중인 JDK 버전의 컨테이너 인식 옵션(`-XX:MaxRAMPercentage` 등) 동작은 공식 문서로 따로 확인해야 합니다.

### (3) 확정 소수 연산에 `double`을 쓰기

금액 컬럼을 `double`로 다루면 이진 부동소수점 오차가 누적됩니다. 정산·집계처럼 값이 맞아야 하는 곳에는 `BigDecimal`을 씁니다. 이건 Java만의 문제가 아니라 IEEE 754를 쓰는 모든 언어의 문제지만, Java에서는 선택지가 타입으로 갈려 있어 **처음 컬럼 타입을 잡을 때 결정됩니다.**

## 출처

- [The Java Virtual Machine Specification, Java SE 25 Edition](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-1.html) — 확인: 2026-09-06
- [OpenJDK JDK Project](https://openjdk.org/projects/jdk/) — 릴리스 주기·GA 날짜. 확인: 2026-09-06
- [JDK 25 프로젝트 페이지](https://openjdk.org/projects/jdk/25/) — JEP 목록·프리뷰 여부. 확인: 2026-09-06
- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) — LTS 지정·라이선스 전환. 확인: 2026-09-06
- [2025 Stack Overflow Developer Survey — Technology](https://survey.stackoverflow.co/2025/technology) — 사용률. 설문 자료이며 자기선택 편향이 있습니다. 확인: 2026-09-06

---

*작성일: 2026-09-06*
