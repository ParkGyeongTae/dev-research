# Gradle이란 무엇인가 — project와 task를 그래프로 실행하는 빌드 도구

> **원문** — [Core Concepts](https://docs.gradle.org/current/userguide/gradle_basics.html), [The Java Plugin](https://docs.gradle.org/current/userguide/java_plugin.html), [Gradle Wrapper](https://docs.gradle.org/current/userguide/wrapper_plugin.html)
>
> **확인 날짜** — 2026-09-15. `current` 공식 문서에 표시된 Gradle 9.7.1 기준입니다.
>
> **검증 상태** — Gradle 공식 문서의 project·task·build script·plugin·Wrapper 정의를 읽었습니다. 이 머신에는 Gradle과 Gradle Wrapper가 없어 명령은 실행하지 않았습니다.

Gradle은 build script에 선언된 정보를 바탕으로 소프트웨어의 빌드·테스트·배포를 자동화하는 빌드 도구입니다.

> Gradle automates building, testing, and deployment of software from information in build scripts.
>
> **번역** — Gradle은 빌드 스크립트에 있는 정보를 바탕으로 소프트웨어의 빌드·테스트·배포를 자동화합니다.
>
> — [Core Concepts](https://docs.gradle.org/current/userguide/gradle_basics.html) (확인: 2026-09-15)

## build, project, task

Gradle의 세 단위는 같은 뜻이 아닙니다.

| 단위 | 의미 |
| --- | --- |
| build | 결과물을 만드는 과정과 실행 환경. 하나 이상의 project를 포함할 수 있습니다. |
| project | 빌드할 애플리케이션·라이브러리 또는 하위 프로젝트입니다. |
| task | 컴파일·테스트처럼 수행할 하나의 작업입니다. |

build script(`build.gradle` 또는 `build.gradle.kts`)는 task·의존성·기타 빌드 지시를 정의합니다. plugin은 task, 의존성 설정(configuration), DSL 요소와 관례를 project에 추가합니다. — [Core Concepts](https://docs.gradle.org/current/userguide/gradle_basics.html), [Plugin Basics](https://docs.gradle.org/current/userguide/plugin_basics.html) (확인: 2026-09-15)

따라서 `gradle build`는 고정된 한 단계의 컴파일 명령이 아니라 `build`라는 task를 요청하는 것입니다. 실제 task와 순서는 적용된 plugin과 빌드 구성에 따라 달라집니다. task 간 의존성이 실행 순서를 결정하므로 Gradle build는 task 그래프로 이해하는 편이 정확합니다.

## Java plugin이 제공하는 것

Java plugin은 Java 컴파일·테스트·패키징의 기본 building block을 project에 추가합니다. Gradle 문서는 일반 Java 라이브러리에는 `java-library`, 실행 애플리케이션에는 `application` plugin도 검토하라고 안내합니다. — [The Java Plugin](https://docs.gradle.org/current/userguide/java_plugin.html) (확인: 2026-09-15)

```kotlin
plugins {
    java
}
```

Java plugin이 추가하는 task와 source set을 바탕으로 테스트·패키징·의존성·실행 버전을 프로젝트 요구에 맞게 구성합니다. plugin 선언만으로 조직의 빌드 정책이 완성되는 것은 아닙니다.

Java 버전은 toolchain으로 명시할 수 있습니다.

```kotlin
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}
```

toolchain은 컴파일·실행처럼 JVM 도구를 사용하는 task가 사용할 Java를 지정합니다. Gradle 공식 문서는 대부분의 경우 단순한 `sourceCompatibility` 설정보다 toolchain 사용을 선호한다고 설명합니다. — [The Java Plugin](https://docs.gradle.org/current/userguide/java_plugin.html) (확인: 2026-09-15)

## 의존성은 Repository에서 해석합니다

```kotlin
repositories {
    mavenCentral()
}

dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:5.13.4")
}
```

`mavenCentral()`은 의존성을 조회할 Repository를 지정하고, `testImplementation`은 테스트 컴파일·실행에 필요한 의존성 범위를 선언합니다. Gradle 자체가 라이브러리 저장소라는 뜻은 아닙니다. 의존성 해석 결과는 빌드 설정·Repository·캐시의 영향을 받습니다.

## Wrapper를 기준으로 실행합니다

> The Wrapper is a script that invokes a declared version of Gradle and is the recommended way to execute a Gradle build.
>
> **번역** — Wrapper는 선언된 Gradle 버전을 호출하는 스크립트이며, Gradle 빌드를 실행할 때 권장되는 방법입니다.
>
> — [Gradle Wrapper](https://docs.gradle.org/current/userguide/wrapper_plugin.html) (확인: 2026-09-15)

프로젝트에 `gradlew`와 `gradlew.bat`가 있으면 전역 설치된 Gradle 대신 다음처럼 실행합니다.

```bash
./gradlew build
```

Wrapper는 필요한 Gradle 배포판을 내려받을 수 있고 프로젝트가 선언한 버전을 사용하게 합니다. Wrapper 파일은 버전 관리에 포함해야 합니다. — [Gradle Wrapper](https://docs.gradle.org/current/userguide/wrapper_plugin.html) (확인: 2026-09-15)

## Maven과의 차이를 파일 형식으로만 설명하면 안 됩니다

Maven은 POM과 생명주기 phase를 중심으로 빌드를 모델링하고, Gradle은 build script·plugin·task 모델을 중심으로 빌드를 구성합니다. Gradle도 Maven Repository를 사용할 수 있고 Maven도 plugin을 사용하므로 “XML 대 코드”만으로 차이를 설명하면 핵심 실행 모델을 놓칩니다. 앞 문장은 각 도구의 공식 개념을 비교한 설명이고, 어느 도구가 적합한지는 프로젝트의 표준화·확장 요구에 대한 판단입니다.

## 실행 환경

2026-09-15에 다음을 확인했습니다.

```console
$ command -v gradle
gradle: command not found
```

이 저장소에는 Gradle Wrapper도 없어 `gradle build`와 `./gradlew build`는 실행하지 않았습니다.

## 확인하지 못한 것

- Java plugin이 추가하는 실제 task 목록 — Gradle 9.7.1을 실행할 설치본 또는 Wrapper가 없어 확인하지 못했습니다.
- 예시 의존성의 실제 해석 결과 — 네트워크·캐시·Repository 상태에 영향을 받으므로 이번 문서에서는 실행하지 않았습니다.

*작성일: 2026-09-15*
