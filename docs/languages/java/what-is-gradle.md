# Gradle이란 무엇인가 — 프로젝트와 task로 빌드를 구성하는 도구

> **원문** — [Core Concepts](https://docs.gradle.org/current/userguide/gradle_basics.html) 및 [Gradle User Manual](https://docs.gradle.org/current/userguide/)
>
> **확인 날짜** — 2026-09-15. `current` 공식 문서의 Gradle 9.7.1 기준입니다.
>
> **검증 상태** — Gradle 공식 문서의 정의, project·task·build script·plugin 개념을 읽었습니다. 이 머신에는 Gradle이 설치되어 있지 않아 실행 결과는 포함하지 않았습니다.

Gradle은 소스 코드를 컴파일하고, 테스트하고, JAR 같은 산출물을 만들고, 필요하면 배포하는 빌드 자동화 도구입니다. Maven처럼 의존성 관리도 하지만, 빌드의 작업을 `task`라는 단위로 모델링하고 Groovy 또는 Kotlin으로 빌드 스크립트를 작성한다는 점이 핵심입니다.

Gradle 공식 문서는 다음처럼 정의합니다.

> Gradle automates building, testing, and deployment of software from information in build scripts.
>
> **번역** — Gradle은 빌드 스크립트에 있는 정보를 바탕으로 소프트웨어의 빌드·테스트·배포를 자동화합니다.
>
> — [Core Concepts](https://docs.gradle.org/current/userguide/gradle_basics.html) (확인: 2026-09-15)

## build, project, task

Gradle 문서에서 세 단어는 서로 다른 층위입니다.

| 개념 | 뜻 |
| --- | --- |
| build | 산출물을 만들기 위한 전체 빌드 과정과 환경 |
| project | 빌드할 애플리케이션·라이브러리 또는 하위 모듈 |
| task | 컴파일·테스트처럼 수행할 하나의 작업 |

이 구분이 중요한 이유는 `build`가 반드시 하나의 Java 프로젝트만 뜻하지 않기 때문입니다. 하나의 build 안에 여러 project가 있을 수 있고, 각 project에는 plugin이 task를 추가할 수 있습니다. — [Core Concepts](https://docs.gradle.org/current/userguide/gradle_basics.html) (확인: 2026-09-15)

## 가장 작은 Java 빌드

`build.gradle`에 Java plugin을 적용하면 Java 프로젝트에 필요한 기본 task와 관례를 얻습니다.

```groovy
plugins {
    id 'java'
}
```

이제 다음 명령으로 Java 프로젝트에 등록된 task를 확인하고 JAR를 만들 수 있습니다.

```bash
gradle tasks
gradle build
```

`gradle build`는 하나의 마법 같은 컴파일 명령이 아니라, Java plugin이 제공하는 여러 task와 그 의존 관계를 실행하는 요청입니다. 예를 들어 소스 컴파일과 테스트 실행이 먼저 수행되어야 결과물 생성이 가능하도록 task 그래프가 구성됩니다. 어떤 task가 생기고 어떻게 연결되는지는 적용한 plugin과 빌드 스크립트에 따라 달라집니다. — [Java Plugin](https://docs.gradle.org/current/userguide/java_plugin.html) (확인: 2026-09-15)

## build script와 plugin

Gradle의 build script는 `build.gradle`(Groovy DSL) 또는 `build.gradle.kts`(Kotlin DSL)입니다. 공식 문서의 최소 모델처럼 이 파일은 task·의존성·빌드 지시를 정의합니다.

```kotlin
plugins {
    java
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:5.13.4")
}
```

여기서 `java` plugin은 Java 소스 컴파일과 테스트 같은 기본 task를 추가하고, `mavenCentral()`은 의존성을 가져올 Repository를 지정합니다. 따라서 Gradle도 라이브러리 저장소 그 자체가 아닙니다. 빌드 스크립트가 어떤 저장소에서 어떤 의존성을 가져올지 선언하고, Gradle이 이를 해석해 빌드에 연결합니다.

## Maven과 비교할 때 놓치기 쉬운 지점

Maven과 Gradle은 모두 Java/JVM 프로젝트의 빌드·의존성 관리·패키징에 사용됩니다. 차이는 “Maven은 XML, Gradle은 코드”처럼 표면적인 파일 형식만이 아닙니다.

Maven은 POM과 표준 생명주기를 중심으로 프로젝트가 공통 관례를 따르게 합니다. Gradle은 build script와 plugin이 project에 task를 추가하는 모델을 중심으로 더 유연하게 빌드를 구성합니다. 그 유연성은 프로젝트별 요구를 표현하기 쉽다는 장점이지만, 빌드 스크립트가 일반 코드처럼 복잡해질 수 있다는 비용도 있습니다. 앞 문장은 공식 개념 정의에 근거한 비교이고, 마지막 비용 평가는 그 구조에서 도출한 실무적 판단입니다.

## Gradle Wrapper

Gradle 공식 문서는 Wrapper를 선언된 Gradle 버전을 호출하는 스크립트이자, Gradle 빌드를 실행하는 권장 방법으로 설명합니다. — [Core Concepts](https://docs.gradle.org/current/userguide/gradle_basics.html) (확인: 2026-09-15)

일반적인 프로젝트에서는 다음처럼 실행합니다.

```bash
./gradlew build
```

`./gradlew`를 사용하면 개발자가 각자 다른 Gradle 버전을 전역 설치해 생기는 차이를 줄일 수 있습니다. 이때 버전은 프로젝트의 Wrapper 설정에 기록됩니다.

## 실행 환경

이 머신에서는 `gradle` 명령이 설치되어 있지 않아 Gradle 예시를 직접 실행하지 못했습니다. 따라서 위 명령의 출력은 작성하지 않았습니다. 실제 프로젝트에서 실행할 때는 전역 `gradle`보다 해당 저장소가 제공하는 `./gradlew`의 존재와 선언 버전을 먼저 확인해야 합니다.

## 확인하지 못한 것

- Gradle 최소 예시의 실제 `build` 출력 — 이 머신에 Gradle이 설치되어 있지 않아 실행하지 못했습니다.
- 특정 Gradle 버전의 기본 task 목록 — 문서의 `current` 버전은 확인했지만, 로컬 프로젝트의 Wrapper가 없어 버전별 출력까지 대조하지 못했습니다.

*작성일: 2026-09-15*
