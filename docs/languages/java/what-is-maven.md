# Maven이란 무엇인가 — POM으로 Java 빌드를 모델링하는 도구

> **원문** — [Welcome to Apache Maven](https://maven.apache.org/) 및 [Introduction](https://maven.apache.org/what-is-maven)
>
> **확인 날짜** — 2026-09-15. 특정 판번호가 없는 현재 공식 문서입니다.
>
> **검증 상태** — 공식 문서의 정의와 POM·빌드 생명주기 설명을 읽었습니다. 이 문서의 실행 환경 절에는 이번 세션에 직접 실행한 Maven Wrapper 출력만 포함했습니다.

Maven은 라이브러리를 모아 두는 저장소가 아니라, 프로젝트의 빌드 과정을 정의하고 실행하는 도구입니다. 라이브러리를 저장하는 곳은 Maven Central 같은 원격 Repository나 로컬의 `~/.m2/repository`이고, Maven은 `pom.xml`에 적힌 의존성을 그 저장소에서 가져와 컴파일·테스트·패키징에 사용합니다.

Apache 공식 문서는 Maven을 다음처럼 정의합니다.

> Apache Maven is a build tool for Java projects. Using a project object model (POM), Maven manages a project's compilation, testing, and documentation.
>
> **번역** — Apache Maven은 Java 프로젝트를 위한 빌드 도구입니다. Maven은 프로젝트 객체 모델(POM)을 사용해 프로젝트의 컴파일·테스트·문서화를 관리합니다.
>
> — [Welcome to Apache Maven](https://maven.apache.org/) (확인: 2026-09-15)

## POM은 무엇을 적는가

Maven 프로젝트의 중심 파일은 `pom.xml`입니다. POM은 프로젝트의 이름과 버전, 의존성, 패키징 방식, 플러그인 설정, 하위 모듈을 선언하는 XML 파일입니다. Maven 공식 문서도 POM을 프로젝트 정보와 Maven 빌드 설정을 담는 XML 파일로 설명합니다. — [Introduction to the POM](https://maven.apache.org/guides/introduction/introduction-to-the-pom.html) (확인: 2026-09-15)

가장 작은 의존성 선언은 다음과 같습니다.

```xml
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>example</groupId>
  <artifactId>hello</artifactId>
  <version>1.0.0</version>

  <dependencies>
    <dependency>
      <groupId>org.slf4j</groupId>
      <artifactId>slf4j-api</artifactId>
      <version>2.0.17</version>
    </dependency>
  </dependencies>
</project>
```

이 선언은 `slf4j-api`를 프로젝트의 의존성으로 모델에 넣습니다. Maven이 라이브러리 파일을 영구적으로 보관한다는 뜻이 아니라, 빌드에 필요한 artifact를 Repository에서 해석하고 classpath에 연결한다는 뜻입니다.

## 명령은 생명주기의 단계를 실행한다

```bash
mvn compile  # main 소스 컴파일
mvn test     # 테스트 컴파일 및 실행
mvn package  # 산출물(JAR 등) 생성
mvn install  # 산출물을 로컬 Repository에 설치
mvn deploy   # 원격 Repository에 배포
```

`package`까지는 프로젝트 산출물을 만드는 빌드 과정이고, `install`과 `deploy`는 만들어진 산출물을 Repository에 넣는 단계입니다. 따라서 “Maven으로 패키징한다”와 “Maven Repository에 배포한다”는 서로 다른 작업입니다. Maven 공식 Getting Started 문서도 컴파일, 테스트, JAR 생성, 로컬 설치, 원격 배포를 별도 단계로 나눕니다. — [Getting Started Guide](https://maven.apache.org/guides/getting-started/index.html) (확인: 2026-09-15)

## Maven이 정하는 것과 정하지 않는 것

Maven은 `pom.xml`과 플러그인을 바탕으로 빌드 작업을 실행합니다. `maven-compiler-plugin`은 Java 소스를 컴파일하고, `maven-jar-plugin`은 JAR를 만드는 식입니다. Maven 자체가 모든 언어의 컴파일러인 것은 아니며, 실제 작업은 플러그인과 JDK 같은 외부 도구가 맡습니다.

이 구조의 장점은 같은 생명주기 명령을 여러 프로젝트에서 반복해서 쓸 수 있다는 점입니다. 반면 프로젝트가 Maven의 표준 구조와 생명주기에서 크게 벗어나면 POM과 플러그인 설정이 복잡해집니다. 이 마지막 판단은 Maven의 표준화 목표와 “관례로 재구성할 수 없는 프로젝트에서는 일부 기능을 포기해야 할 수 있다”는 공식 설명에서 이어지는 실무적 해석입니다. — [Introduction](https://maven.apache.org/what-is-maven) (확인: 2026-09-15)

## Zeppelin에서의 Maven

Zeppelin 루트 [`pom.xml`](https://github.com/apache/zeppelin/blob/master/pom.xml)은 `<packaging>pom</packaging>`인 상위 프로젝트이며, `zeppelin-server`와 `zeppelin-interpreter` 같은 여러 모듈을 `<modules>`로 묶습니다. `zeppelin-server/pom.xml`은 `jar` 패키징을 선언하고, `zeppelin-distribution`은 Maven Assembly Plugin으로 최종 배포 압축 파일을 만듭니다. 이 저장소의 실제 설정을 읽어 확인한 내용입니다.

```bash
./mvnw clean install -DskipTests
```

여기서 `mvnw`는 저장소가 지정한 Maven 버전을 사용하는 Wrapper입니다. `clean`은 이전 빌드 산출물을 지우고, `install`은 모듈을 빌드한 뒤 결과물을 로컬 Repository에도 설치합니다. Zeppelin의 `bin/zeppelin-daemon.sh`는 이 빌드 결과물을 classpath에 올려 `org.apache.zeppelin.server.ZeppelinServer`를 실행합니다.

## 실행 환경

다음은 2026-09-15에 Zeppelin 저장소에서 직접 실행한 출력입니다.

```console
$ ./mvnw -version
Apache Maven 3.9.9 (8e8579a9e76f7d015ee5ec7bfcdc97d260186937)
Maven home: /Users/pgt0409/.m2/wrapper/dists/apache-maven-3.9.9-bin/33b4b2b4/apache-maven-3.9.9
Java version: 11.0.31, vendor: Homebrew, runtime: /opt/homebrew/Cellar/openjdk@11/11.0.31/libexec/openjdk.jdk/Contents/Home
Default locale: ko_KR, platform encoding: UTF-8
OS name: "mac os x", version: "15.7.4", arch: "aarch64", family: "mac"
```

`mvn` 명령 자체는 설치되어 있지 않았고, 저장소에 포함된 `mvnw`로 Maven 3.9.9를 확인했습니다. 전체 Zeppelin 빌드는 이번 작업에서 실행하지 않았습니다.

*작성일: 2026-09-15*
