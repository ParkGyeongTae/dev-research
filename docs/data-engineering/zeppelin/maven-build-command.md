---
sidebar_position: 4
---

# Apache Zeppelin의 Maven 빌드 명령은 무엇을 만드는가

> 원문 — [how_to_build.md](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/docs/setup/basics/how_to_build.md), [Apache Zeppelin 소스 2ee180ffa](https://github.com/apache/zeppelin/tree/2ee180ffab215aa18fd167815b65bc23fcc64d1f)
>
> 확인 날짜 — 2026-09-20

> `package` - take the compiled code and package it in its distributable format, such as a JAR.
>
> **번역** — `package`는 컴파일된 코드를 JAR와 같은 배포 가능한 형식으로 패키징합니다.
>
> — [Introduction to the Build Lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) (확인: 2026-09-20)

```bash
./mvnw clean package -DskipTests
```

이 명령은 Maven Wrapper로 `clean` lifecycle의 clean phase와 default lifecycle의 package phase까지 실행합니다. **모듈의 JAR/WAR를 만드는 것과 Zeppelin 배포 tarball을 만드는 것은 다릅니다.** 어떤 작업을 수행할지는 선택된 모듈·profile·plugin 실행 설정으로 결정됩니다.

— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/pom.xml) (확인: 2026-09-20)
— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-distribution/pom.xml) (확인: 2026-09-20)

## 실행 환경과 검증 범위

기준은 `/Users/pgt0409/Desktop/git/zeppelin`의 커밋 `2ee180ffab215aa18fd167815b65bc23fcc64d1f`, 버전 **0.13.0-SNAPSHOT**입니다. 릴리스 버전이나 이동하는 `latest` 문서와 동일시하지 않습니다. 확인 환경은 macOS 15.7.4 (24G517), arm64, Python 3.9.6, OpenJDK 11.0.31입니다. 아래 소스 조회 명령은 2026-09-20에 실행했습니다. **Zeppelin 전체 빌드·서버 기동은 미실행**이며, 호출 순서와 조건은 해당 커밋의 소스 분석 결과입니다.

## Wrapper가 고정하는 것은 Maven 버전입니다

이 커밋의 Wrapper는 Maven 3.9.9를 지정합니다. Java는 실행 환경에서 제공해야 합니다. 다음은 이번에 직접 실행한 출력입니다.

```bash
./mvnw --version
```

```text
Apache Maven 3.9.9 (8e8579a9e76f7d015ee5ec7bfcdc97d260186937)
Maven home: /Users/pgt0409/.m2/wrapper/dists/apache-maven-3.9.9-bin/33b4b2b4/apache-maven-3.9.9
Java version: 11.0.31, vendor: Homebrew, runtime: /opt/homebrew/Cellar/openjdk@11/11.0.31/libexec/openjdk.jdk/Contents/Home
Default locale: ko_KR, platform encoding: UTF-8
OS name: "mac os x", version: "15.7.4", arch: "aarch64", family: "mac"
```

— [maven-wrapper.properties](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.mvn/wrapper/maven-wrapper.properties) (확인: 2026-09-20)

빌드 문서는 JDK 11과 Maven 3.6.3 이상을 요구 사항으로 적고, CI의 일반 Linux 빌드는 JDK 11·17을 사용합니다. 문서의 요구 버전, CI가 시험하는 조합, 현재 셸의 JDK는 서로 다른 정보입니다.

— [how_to_build.md](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/docs/setup/basics/how_to_build.md) (확인: 2026-09-20)
— [core.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/core.yml) (확인: 2026-09-20)

## `clean`과 `package`는 `target/` 밖에도 영향을 줍니다

Interpreter parent의 pluginManagement에는 다음 경로가 있습니다.

```xml
<!-- maven-clean-plugin의 추가 fileset -->
<directory>${project.basedir}/../interpreter/${interpreter.name}</directory>

<!-- maven-shade-plugin의 출력 -->
<outputFile>${project.basedir}/../interpreter/${interpreter.name}/${project.artifactId}-${project.version}.jar</outputFile>
```

이 설정을 사용하는 루트 직하 Interpreter 모듈은 `interpreter/<이름>/`도 지우고 다시 채웁니다. 경로가 `${project.basedir}`에 상대적이고 개별 모듈의 override도 있을 수 있으므로 모든 중첩 모듈에 문자열 그대로 적용하면 안 됩니다. 예를 들어 JDBC의 공통 출력 경로와 Spark의 별도 복사 설정을 각각 확인해야 합니다.

실무상 실행 중인 서버가 참조하는 Interpreter 산출물과 소스 빌드 산출물이 겹칠 수 있습니다. “clean은 테스트용 target만 지운다”는 전제로 실행하면 Interpreter를 잃을 수 있으므로 배포 디렉터리와 빌드 작업 디렉터리의 관계를 먼저 확인해야 합니다.

— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-interpreter-parent/pom.xml#L110-L175) (확인: 2026-09-20)
— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/jdbc/pom.xml) (확인: 2026-09-20)
— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/spark/interpreter/pom.xml#L258-L276) (확인: 2026-09-20)

## 테스트 생략은 빌드 준비 생략이 아닙니다

Surefire에서 `-DskipTests`는 테스트 실행을 건너뛰고 테스트 컴파일은 남깁니다. `-Dmaven.test.skip=true`는 Compiler·Surefire·Failsafe가 인식하는 테스트 컴파일/실행 생략 옵션입니다. 사용자 정의 plugin까지 모두 똑같이 반응한다고 보장하지는 않습니다.

— [Skipping Tests](https://maven.apache.org/surefire/maven-surefire-plugin/examples/skipping-tests.html) (확인: 2026-09-20)

default lifecycle의 관련 순서는 다음과 같습니다. 이해를 위해 일부 phase만 표시했습니다.

```text
validate → generate-resources → compile → test-compile → test → package → verify → install
```

Spark Interpreter의 `download-pyspark-files`는 **validate**에 연결돼 있고 `skipTests` 조건이 없습니다. `generate-resources`에서는 Spark 소스의 Python 파일을 꺼내 PySpark 산출물을 만듭니다. 따라서 테스트를 생략해도 다운로드 plugin과 압축 처리 경로는 실행 대상입니다. 캐시·기존 파일·plugin 설정에 따라 실제 네트워크 다운로드 여부는 달라질 수 있으므로 “항상 같은 크기를 다시 다운로드한다”고 단정하지 않습니다.

— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/spark/interpreter/pom.xml#L234-L276) (확인: 2026-09-20)

과거 기록의 `du -sh target/spark-3.4.3`은 **압축 해제 디렉터리의 디스크 사용량**입니다. tarball 다운로드 크기가 아닙니다. `find ... | wc -l`도 파일만이 아니라 디렉터리를 포함한 경로 수입니다. 이 두 숫자로 삭제 실패 원인을 설명할 수는 없습니다. 실패한 파일·권한·동시 접근 등의 근거가 없으므로 원인은 **원인 미상**입니다.

## 모듈 선언 수와 실제 reactor 크기는 다릅니다

```bash
python3 - <<'PYCODE'
import xml.etree.ElementTree as E
ns={'m':'http://maven.apache.org/POM/4.0.0'}
r=E.parse('pom.xml').getroot()
mods=[x.text for x in r.findall('m:modules/m:module',ns)]
print('root modules:',len(mods))
print('default classic:', 'zeppelin-web' in mods)
for p in r.findall('m:profiles/m:profile',ns):
    modules=[m.text for m in p.findall('m:modules/m:module',ns)]
    if modules: print(p.find('m:id',ns).text+': '+', '.join(modules))
PYCODE
```

```text
root modules: 36
default classic: False
web-classic: zeppelin-web
integration: zeppelin-integration, zeppelin-interpreter-integration
examples: zeppelin-examples
helium-dev: helium-dev
```

36은 루트 POM 바로 아래의 module 선언 수입니다. `spark` 등의 하위 aggregator가 포함한 모듈, 활성 profile, `-pl` 선택을 반영한 **최종 reactor 프로젝트 수**와 같다고 할 수 없습니다. classic UI는 `web-classic` profile을 활성화해야 포함됩니다. 산출물이 이미 남아 있는 로컬 작업 폴더와 깨끗한 checkout의 결과도 구분해야 합니다.

— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/pom.xml) (확인: 2026-09-20)
— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/spark/pom.xml) (확인: 2026-09-20)

## 배포 tarball은 `build-distr`의 assembly 연결을 확인합니다

`zeppelin-distribution/pom.xml`은 assembly descriptor를 지정하고, 루트의 `build-distr` profile은 assembly `single` goal을 package에 연결합니다. 따라서 일반적인 이 저장소의 빌드 경로에서는 profile이 없는 `package`만으로 배포 tarball을 만든다고 설명하면 안 됩니다. 명시적으로 assembly goal을 직접 부르는 별도 경로까지 불가능하다는 뜻은 아닙니다.

```bash
# 배포물 조립 예시 — 이번에는 미실행
./mvnw clean package -Pbuild-distr -DskipTests

# classic UI 모듈까지 포함하는 예시 — 이번에는 미실행
./mvnw clean package -Pbuild-distr -Pweb-classic -DskipTests
```

`build-distr`는 Surefire의 `skipTests=true`도 설정합니다. 그렇다고 `-DskipTests`가 모든 단계에서 중복이라고 말할 수는 없습니다. 예를 들어 Angular UI POM에는 `${skipTests}`를 읽는 실행이 별도로 있습니다. **Surefire plugin configuration과 Maven user property는 서로 다른 설정 경로**입니다.

— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/pom.xml#L859-L898) (확인: 2026-09-20)
— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-distribution/pom.xml#L66-L77) (확인: 2026-09-20)
— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-web-angular/pom.xml#L130-L145) (확인: 2026-09-20)

## Spark profile과 `SPARK_HOME`의 역할

이 커밋의 Spark Interpreter POM 기본 `spark.version`은 3.5.8이며 profile에 따라 3.3.4·3.4.3·3.5.8·4.0.0을 선택합니다. 빌드 문서는 이 profile을 Interpreter 단위 테스트의 Spark 버전 선택으로 설명하고, 실제 실행 환경의 Spark 선택은 `SPARK_HOME`으로 안내합니다. 다만 POM의 버전 값은 앞서 본 소스 다운로드에도 사용되므로 “테스트 밖에서는 아무 영향이 없다”는 뜻으로 읽으면 안 됩니다.

— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/spark/interpreter/pom.xml) (확인: 2026-09-20)
— [how_to_build.md](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/docs/setup/basics/how_to_build.md#L80-L105) (확인: 2026-09-20)

`core.yml`은 Spark 4.0 테스트를 Java 17에서만 실행합니다. profile 이름이 존재하는 것과 임의의 JDK·Scala·Spark 조합이 지원된다는 주장은 구분해야 합니다.

— [core.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/core.yml) (확인: 2026-09-20)

## 과거 로컬 관측 기록 보존

다음은 **이전 문서에서 옮긴 2026-09-15~18 관측 기록**입니다. 이번 실행 출력이 아니며 명령을 재실행하지 않았습니다. 당시 환경은 이전 문서에 macOS 15.7.4 arm64, Homebrew OpenJDK 11.0.31, Maven 3.9.9로 기재돼 있습니다. 아래에는 당시 생략 부호·설명 주석이 포함돼 있어 원본 로그 전체로 취급하지 않습니다.

이전 기록은 9월 15일 `clean` 실패와 이후 여러 JAR/WAR 존재를 보여 줍니다. **9월 17일 전체 빌드의 Reactor 로그·종료 코드가 없으므로 전체 성공은 확인 필요**입니다. 재실행이 삭제 실패의 원인을 해결했다고도 확정하지 않습니다.

```text
$ ls -la interpreter/jdbc/
drwxr-xr-x  7 pgt0409  staff      224  9 17 22:03 .
-rw-r--r--  1 pgt0409  staff     2314  9 17 22:03 ansi.sql.keywords
-rw-r--r--  1 pgt0409  staff     6605  9 17 22:03 interpreter-setting.json
...
```

```text
$ du -sh spark/interpreter/target/spark-3.4.3
162M    spark/interpreter/target/spark-3.4.3

$ find spark/interpreter/target/spark-3.4.3 | wc -l
   22858
```

```text
$ ls zeppelin-web/target/*.war
zsh: no matches found: zeppelin-web/target/*.war

$ ls zeppelin-web-angular/target/*.war
zeppelin-web-angular/target/zeppelin-web-angular-0.13.0-SNAPSHOT.war   (37MB)
```

```text
$ ls zeppelin-distribution/target/
maven-shared-archive-resources        ← tarball 없음
```

```text
Reactor Summary for Zeppelin 0.13.0-SNAPSHOT:
Zeppelin ........................................... SUCCESS
Zeppelin: Tools .................................... SUCCESS
Zeppelin: Common ................................... SUCCESS
Zeppelin: Interpreter .............................. SUCCESS
Zeppelin: Interpreter Shaded ....................... SUCCESS
Zeppelin: Jupyter Interpreter ...................... SUCCESS
Zeppelin: Spark Common ............................. SUCCESS
Zeppelin: Python interpreter ....................... SUCCESS
Zeppelin: Spark Interpreter ........................ FAILURE
Zeppelin: Server ................................... SKIPPED
Zeppelin: web angular Application .................. SKIPPED
Zeppelin: Packaging distribution ................... SKIPPED

BUILD FAILURE
Failed to delete .../spark/interpreter/target
```

```text
$ ls -la spark/interpreter/target/spark-interpreter-0.13.0-SNAPSHOT.jar
-rw-r--r--  1 pgt0409  staff     69774  9 17 22:02

$ ls -la zeppelin-server/target/zeppelin-server-0.13.0-SNAPSHOT.jar
-rw-r--r--  1 pgt0409  staff    781851  9 17 22:03

$ ls -la zeppelin-web-angular/target/zeppelin-web-angular-0.13.0-SNAPSHOT.war
-rw-r--r--  1 pgt0409  staff  37110138  9 17 22:04

$ ls */target/*.jar */target/*.war */*/target/*.jar | wc -l
      41
```

## 확인하지 못한 것

- `clean package`·`build-distr` 전체 빌드는 **미실행**입니다 — 이 조사에서는 사용 중일 수 있는 소스 트리 산출물을 지우지 않고 버전·POM·기존 기록을 확인했습니다.
- 과거 삭제 실패의 OS 수준 원인은 **원인 미상**입니다 — 당시 상세 오류·파일 상태를 보존한 기록이 없습니다.
- 과거 전체 reactor 성공 여부는 **확인 필요**입니다 — 산출물 존재만으로 종료 코드와 모든 모듈 성공을 복원할 수 없습니다.
- 빌드 시간·최대 디스크 사용량·다운로드 바이트 수는 **미측정**입니다 — 이번에는 전체 빌드를 실행하지 않았습니다.
- 모든 모듈의 테스트 생략 방식은 **확인 필요**입니다 — 공통 Maven 설정과 Spark·UI·distribution의 관련 설정을 중심으로 확인했습니다.

*작성일: 2026-09-20*
