# Java란 무엇인가 — 언어와 JVM은 서로 다른 명세다

Java를 "느리지만 안정적인 백엔드 언어" 정도로 알고 넘어가면, 데이터 엔지니어가 실제로 Java를 만나는 지점을 놓칩니다.
Kafka·Spark·Flink·Hadoop·Trino는 모두 JVM 위에서 돕니다. **Java 코드를 한 줄도 쓰지 않아도 JVM은 매일 만집니다.**
그래서 이 문서가 먼저 잡는 개념은 문법이 아니라 **언어와 JVM이 별개라는 사실**입니다.

**실행 환경**

```
openjdk 11.0.31 2026-04-21
OpenJDK Runtime Environment Homebrew (build 11.0.31+0)
OpenJDK 64-Bit Server VM Homebrew (build 11.0.31+0, mixed mode)
```

macOS(Darwin 24.6.0). 로컬에 설치된 것이 JDK 11이라 **아래 출력은 모두 Java 11 기준**입니다(2026-09-06 직접 실행).

## 1. 두 개의 명세

Java에는 별개로 관리되는 두 개의 명세가 있습니다.

| 명세 | 정의하는 것 |
| --- | --- |
| **JLS** (Java Language Specification) | 문법, 타입 규칙, 제네릭 — 사람이 쓰는 소스 코드 |
| **JVMS** (JVM Specification) | `class` 파일 포맷과 바이트코드 — 기계가 읽는 실행 단위 |

이 둘이 분리돼 있다는 게 핵심입니다. JVM 명세는 자기가 Java와 무관하다고 **명시적으로** 말합니다.

> The Java Virtual Machine knows nothing of the Java programming language, only of a particular binary format, the `class` file format.
>
> — [The Java Virtual Machine Specification, Java SE 25 Edition, §1.2](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-1.html) (확인: 2026-09-06)

같은 문서는 "유효한 `class` 파일로 표현될 수 있는 기능을 가진 어떤 언어든 JVM 위에서 호스팅될 수 있다"고 이어집니다.

이 구조를 잡아 두면 두 가지가 한꺼번에 풀립니다. Scala·Kotlin·Clojure가 JVM 위에서 도는 것도, **Spark를 Scala로 짜든 Java로 짜든 같은 GC 튜닝이 적용되는 것도** 같은 이유입니다. 튜닝의 대상은 언어가 아니라 아래쪽 기계입니다.

## 2. 어떻게 실행되는가

`소스(.java)` → **javac** → `class 파일(바이트코드)` → **JVM**(인터프리터 + JIT 컴파일)의 순서입니다.

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

### `class` 파일은 자기가 요구하는 포맷 버전을 갖고 다닙니다

§1에서 JVM이 아는 것은 `class` 파일 포맷뿐이라고 했습니다. 그 포맷에는 **판번호가 파일 안에 박혀 있습니다.**

```console
$ javap -v Hello.class | grep -E '^\s*(major|minor) version'
  minor version: 0
  major version: 55
```

major 55가 Java 11입니다. 그리고 JVM은 자기가 아는 것보다 **높은** 판번호를 만나면 로딩 단계에서 거부합니다. 위 `Hello.class`의 7번째 바이트를 69(Java 25)로 직접 조작한 뒤 JDK 11에서 실행해 봤습니다.

```console
$ java -cp . Patched
오류: 기본 클래스 Patched을(를) 로드하는 중 LinkageError가 발생했습니다.
	java.lang.UnsupportedClassVersionError: Patched has been compiled by a more recent version of the Java Runtime (class file version 69.0), this version of the Java Runtime only recognizes class file versions up to 55.0
```

이게 실무에서 가장 자주 만나는 형태의 실패입니다. 커넥터 JAR만 최신으로 올리고 런타임 JDK는 그대로 두면 정확히 이 모양으로 터집니다. 증상은 컴파일 에러가 아니라 **런타임 로딩 실패**라서 빌드는 통과하고 **배포 후에야** 드러납니다.

### 바이트코드를 보면 JVM이 실제로 무엇을 받는지 드러납니다

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

여기서 성능 이야기의 층이 갈립니다. Java 프로그램의 속도에는 최소 세 단계가 관여합니다 — **javac의 컴파일 시점 최적화**, **JVM의 JIT 컴파일**, **GC**. 위 출력은 첫 번째 단계의 흔적입니다. "Java는 빠르다/느리다"를 말할 때 이 셋을 뭉뜽그리면 이야기가 성립하지 않습니다.

특히 JIT은 **프로세스가 오래 살아야 값어치가 나는** 구조입니다. JVM은 처음에 인터프리터로 시작해서 자주 도는 코드를 실행 중에 기계어로 컴파일합니다. 그래서 수백 ms 만에 끝나는 CLI나 짧은 서버리스 함수는 워밍업 비용만 내고 끝납니다. 반대로 며칠씩 도는 Kafka 브로커나 Spark executor는 그 비용을 한 번만 내고 계속 이득을 봅니다.

> AOT 관련 JEP 514·515가 JDK 25에 들어갔지만 **이 저장소에서 측정한 적 없습니다 — 확인 필요.**

### 정적 타입 언어라서 타입 오류는 실행 전에 걸립니다

```console
$ javac Bad.java
Bad.java:3: error: incompatible types: String cannot be converted to int
        int n = "문자열";
                ^
1 error
```

이 성질이 앞의 `class` 파일 이야기와 짝을 이룹니다. **타입은 컴파일 시점에 검사되고, 그 결과가 `class` 파일에 담겨 실행 시점에는 이미 확정돼 있습니다.**

## 3. 버전과 LTS — 지금 무엇을 쓰는가

OpenJDK는 **6개월 고정 주기**로 기능 릴리스를 냅니다("The Project ships a feature release every six months according to a strict, time-based model" — [OpenJDK JDK Project](https://openjdk.org/projects/jdk/), 확인: 2026-09-06). 매년 3월·9월입니다.

| 릴리스 | GA | LTS 여부 |
| --- | --- | --- |
| JDK 21 | 2023-09-19 | **LTS** |
| JDK 25 | 2025-09-16 | **LTS** |
| JDK 26 | 2026-03-17 | non-LTS |

GA 날짜는 [OpenJDK JDK Project](https://openjdk.org/projects/jdk/), LTS 지정은 [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)에서 확인했습니다(둘 다 확인: 2026-09-06).
Oracle 표 기준 LTS는 8·11·17·21·25이고, 27·28은 non-LTS, **29가 LTS로 예정**돼 있습니다 — 다만 같은 표에 "LTS/non-LTS designation and dates are subject to change"라는 단서가 붙어 있습니다.

지금 시점에서 실무에 직접 걸리는 항목이 하나 있습니다.

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

## 4. 데이터 엔지니어가 Java를 만나는 지점

### 먼저, 어디에 쓰이는 언어인가

Stack Overflow 2025 개발자 설문에서 Java 사용률은 **29.4%**였습니다([2025 Stack Overflow Developer Survey — Technology](https://survey.stackoverflow.co/2025/technology), 확인: 2026-09-06. 해당 문항 응답 31,771건).
같은 설문에서 JavaScript 66%, SQL 58.6%, Python 57.9%, TypeScript 43.6%입니다.

**이 수치는 자기선택 편향이 있는 설문입니다.** Stack Overflow를 쓰는 개발자만 답했고, 언어별 "코드 줄 수"나 "매출 비중"이 아니라 응답자 비율입니다. 순위를 대략 잡는 용도 이상으로 쓰면 안 됩니다.

대표적인 영역은 대규모 엔터프라이즈 백엔드(Spring 계열), Android 애플리케이션, 그리고 아래의 데이터 인프라입니다.

반대로 Java가 잘 안 보이는 자리도 §2의 성질에서 그대로 따라 나옵니다. 컴파일-실행 주기가 REPL과 맞지 않아 **탐색적 데이터 분석**에는 거의 쓰이지 않고, 타입 선언과 빌드 설정의 고정 비용이 **한 번 쓰고 버리는 스크립트**보다 큽니다.

### 실제로 하는 일은 대개 이 셋입니다

Java로 애플리케이션을 짜지 않아도 JVM은 계속 만나게 됩니다. 데이터 엔지니어링 스택의 상당수가 JVM 위에서 돌기 때문입니다 — Kafka, Spark, Flink, Hadoop, Hive, Trino, Elasticsearch 등.

1. **힙과 GC 설정** — `-Xmx`, GC 종류 선택, executor/broker 메모리 배분
2. **스택 트레이스 읽기** — PySpark에서 터진 에러도 결국 JVM 스택 트레이스로 나옵니다
3. **JAR 의존성 맞추기** — 커넥터·드라이버 버전과 §2의 클래스 파일 버전 정합

**PySpark를 쓰면 Python으로 일한다고 생각하기 쉽지만, 실행되는 것은 JVM입니다.** Python 코드는 실행 계획을 조립해 JVM으로 넘기는 역할이고, 무거운 처리는 JVM에서 일어납니다. 그래서 OOM이 나면 파이썬 쪽이 아니라 executor의 JVM 힙을 봐야 합니다.

### 힙 상한과 컨테이너 한도는 같은 숫자가 아닙니다

1번 항목이 컨테이너와 만나면 헷갈리는 지점이 생깁니다. **JVM이 쓰는 메모리는 힙만이 아닙니다** — `-Xmx`로 잡은 힙 위에 메타스페이스·스레드 스택·네이티브 버퍼가 더 얹힙니다.

그래서 힙 상한을 컨테이너 메모리 한도와 **같게** 잡으면, JVM이 `OutOfMemoryError`를 던지기 전에 커널이 컨테이너를 OOM kill 합니다. 이때 애플리케이션 로그에는 아무것도 남지 않고 **프로세스만 사라집니다.** "OOM인데 OOM 로그가 없다"는 상황의 흔한 원인이 이것입니다.

같은 이유로 JVM은 **메모리가 빡빡한 환경**에 잘 맞지 않습니다. 힙에 담을 데이터와 무관하게 깔고 가는 오버헤드가 있습니다.

> 위 두 문단은 JVM 메모리 구조에서 따라 나오는 설명이며, **이 저장소에서 재현 실험을 하지 않았습니다 — 확인 필요.** 사용 중인 JDK 버전의 컨테이너 인식 옵션(`-XX:MaxRAMPercentage` 등) 동작은 공식 문서로 따로 확인해야 합니다.

### 금액 컬럼의 타입은 처음에 결정됩니다

JVM 이야기와 별개로, 타입 시스템 쪽에서 한 번 정하면 되돌리기 어려운 선택이 하나 있습니다. 금액을 `double`로 다루면 이진 부동소수점 오차가 누적되므로, 정산·집계처럼 값이 맞아야 하는 곳에는 `BigDecimal`을 씁니다.

이건 Java만의 문제가 아니라 IEEE 754를 쓰는 모든 언어의 문제입니다. 다만 Java에서는 **선택지가 타입으로 갈려 있어서** 처음 컬럼 타입을 잡는 순간 결정되고, 나중에 바꾸려면 스키마와 하류를 모두 건드려야 합니다.

---

*작성일: 2026-09-06*
