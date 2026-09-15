# Maven이란 무엇인가 — POM과 생명주기로 빌드를 모델링하는 도구

> **원문** — [Introduction to the POM](https://maven.apache.org/guides/introduction/introduction-to-the-pom.html), [Introduction to the Build Lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html)
>
> **확인 날짜** — 2026-09-15. 특정 판번호가 없는 현재 Apache Maven 공식 문서를 확인했습니다.
>
> **검증 상태** — POM·생명주기·phase·plugin 설명을 공식 문서에서 읽었습니다. 이 머신에는 Maven과 Maven Wrapper가 없어 명령은 실행하지 않았습니다.

Maven은 Java 프로젝트의 빌드 도구입니다. 프로젝트의 정보와 빌드 설정을 `pom.xml`이라는 POM(Project Object Model)에 선언하고, 생명주기의 phase를 호출해 컴파일·테스트·패키징·설치·배포를 수행합니다.

> A Project Object Model or POM is the fundamental unit of work in Maven.
>
> **번역** — Project Object Model, 즉 POM은 Maven에서 작업의 기본 단위입니다.
>
> — [Introduction to the POM](https://maven.apache.org/guides/introduction/introduction-to-the-pom.html) (확인: 2026-09-15)

## POM은 프로젝트의 모델입니다

최소 POM에는 `project`, `modelVersion`, `groupId`, `artifactId`, `version`이 필요합니다. 의존성·plugin·profile·빌드 설정도 POM에 넣을 수 있습니다. — [Introduction to the POM](https://maven.apache.org/guides/introduction/introduction-to-the-pom.html) (확인: 2026-09-15)

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>example</groupId>
  <artifactId>hello</artifactId>
  <version>1.0.0</version>
</project>
```

`pom.xml`은 라이브러리를 저장하는 파일이 아닙니다. Maven이 POM을 읽고 필요한 artifact와 plugin을 Repository에서 해석해 빌드에 사용하도록 만드는 프로젝트 모델입니다. Maven의 기본 디렉터리 관례도 POM 모델에 포함됩니다. 예를 들어 main 소스는 `src/main/java`, 빌드 결과 디렉터리는 `target`입니다. — [Introduction to the POM](https://maven.apache.org/guides/introduction/introduction-to-the-pom.html) (확인: 2026-09-15)

의존성은 다음처럼 선언합니다.

```xml
<dependencies>
  <dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-api</artifactId>
    <version>2.0.17</version>
  </dependency>
</dependencies>
```

이 선언은 artifact의 좌표를 프로젝트 모델에 넣는 것입니다. 실제 파일을 어느 Repository에서 가져올지와 의존성 해석 결과는 Repository·캐시·Maven 설정의 영향을 받습니다.

## 생명주기와 phase

Maven에는 `default`, `clean`, `site`의 세 가지 내장 생명주기가 있습니다. `default`는 artifact를 다루고, `clean`은 이전 결과를 지우며, `site`는 프로젝트 사이트를 생성합니다. — [Introduction to the Build Lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) (확인: 2026-09-15)

`default` 생명주기의 주요 phase는 다음과 같습니다.

| phase | 의미 |
| --- | --- |
| `validate` | 프로젝트가 올바르고 필요한 정보가 있는지 확인합니다. |
| `compile` | main 소스를 컴파일합니다. |
| `test` | 테스트 소스를 컴파일하고 단위 테스트를 실행합니다. |
| `package` | JAR 같은 배포 형식으로 패키징합니다. |
| `verify` | 통합 테스트 결과 등 추가 검사를 수행합니다. |
| `install` | artifact를 로컬 Repository에 설치합니다. |
| `deploy` | artifact를 원격 Repository에 배포합니다. |

phase를 실행하면 앞선 phase도 순서대로 실행됩니다. 따라서 `mvn package`는 보통 `compile`과 `test`를 거쳐 패키지를 만들고, `mvn install`은 그 결과를 로컬 Repository에 추가합니다. `package`와 `deploy`는 같은 말이 아닙니다. — [Introduction to the Build Lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) (확인: 2026-09-15)

```bash
mvn compile
mvn test
mvn package
mvn verify
```

Apache 공식 문서는 결과가 확실하지 않을 때 `mvn verify`를 호출하는 방식을 안내합니다. 통합 테스트나 품질 검사가 구성돼 있다면 `package`보다 더 많은 검사가 실행될 수 있습니다. — [Introduction to the Build Lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) (확인: 2026-09-15)

## plugin이 실제 작업을 제공합니다

Maven의 phase는 추상적인 단계이고, 실제 동작은 plugin의 goal이 phase에 연결되어 수행합니다. 예를 들어 `jar` packaging은 `compile` phase에 compiler plugin의 goal을, `package` phase에 jar plugin의 goal을 연결합니다. plugin은 하나 이상의 goal을 제공할 수 있습니다. — [Introduction to the Build Lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) (확인: 2026-09-15)

이 구분을 놓치면 `mvn package`가 Maven 자체에 내장된 컴파일러라고 오해하게 됩니다. Maven은 생명주기와 모델을 조정하고, compiler·Surefire·JAR 같은 plugin이 각 작업을 수행합니다. 사용하는 packaging과 plugin 설정에 따라 연결되는 goal은 달라질 수 있습니다.

## 실행 환경

2026-09-15에 다음을 확인했습니다.

```console
$ command -v mvn
mvn: command not found
```

이 저장소에는 Maven Wrapper도 없어 `mvn package`와 `./mvnw package`는 실행하지 않았습니다. 따라서 실제 빌드 출력은 문서에 넣지 않았습니다.

## 확인하지 못한 것

- 이 저장소의 Maven 프로젝트 빌드 결과 — `pom.xml`과 Maven 실행 환경이 없어 확인하지 못했습니다.
- 특정 packaging·plugin 조합의 정확한 goal 바인딩 — 공식 생명주기 문서의 대표적인 `jar` 기준만 정리했으며, 프로젝트별 설정은 별도 POM 확인이 필요합니다.

*작성일: 2026-09-15*
