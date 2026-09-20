---
sidebar_position: 2
---

# Apache Zeppelin은 시작할 때 무엇을 하는가 — 설정·서비스·웹 서버의 초기화 경계

> 원문 — [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java), [Apache Zeppelin 소스 2ee180ffa](https://github.com/apache/zeppelin/tree/2ee180ffab215aa18fd167815b65bc23fcc64d1f)
>
> 확인 날짜 — 2026-09-20

> Lazy loading will cause paragraph recovery and cron job initialization is delayed.
>
> **번역** — 지연 로딩은 Paragraph 복구와 cron 작업 초기화가 지연되게 합니다.
>
> — [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L253-L265) (확인: 2026-09-20)

서버 시작은 포트를 여는 한 번의 호출이 아닙니다. 설정을 읽고 서비스 의존성을 등록하고 Notebook을 초기화한 다음 Jetty를 시작합니다. 위 소스 주석은 첫 브라우저 요청 전에 Notebook 객체를 명시적으로 조회하는 이유를 설명합니다. 서비스 **등록**, 객체 **생성**, 비동기 **초기화 완료**는 구분해야 합니다.

## 실행 환경과 검증 범위

기준은 `/Users/pgt0409/Desktop/git/zeppelin`의 커밋 `2ee180ffab215aa18fd167815b65bc23fcc64d1f`, 버전 **0.13.0-SNAPSHOT**입니다. 릴리스 버전이나 이동하는 `latest` 문서와 동일시하지 않습니다. 확인 환경은 macOS 15.7.4 (24G517), arm64, Python 3.9.6, OpenJDK 11.0.31입니다. 아래 소스 조회 명령은 2026-09-20에 실행했습니다. **Zeppelin 서버·Interpreter 기동은 미실행**이며, 호출 순서와 조건은 해당 커밋의 소스 분석 결과입니다.

## 실행 스크립트에서 Java 진입점까지

| 명령 | 프로세스 실행 방식 | 조사할 대상 |
| --- | --- | --- |
| `bin/zeppelin.sh` | `exec`로 foreground 실행 | 터미널의 프로세스와 출력 |
| `bin/zeppelin-daemon.sh start` | `nohup`과 background 실행, PID 파일 기록 | PID·로그 파일과 실제 생존 여부 |
| `bin/zeppelin-daemon.sh upstart` | foreground 경로 | 서비스 관리자의 프로세스 감독 |

스크립트는 Java 버전을 검사하고 classpath·환경을 준비해 `org.apache.zeppelin.server.ZeppelinServer`를 실행합니다. `check_java_version`의 하한 검사는 Java 11입니다. 하한을 통과한다는 사실을 모든 상위 JDK 호환성 검증으로 읽으면 안 됩니다. 예를 들어 CI의 일반 Linux 빌드 matrix는 Java 11·17입니다.

— [common.sh](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/bin/common.sh#L72-L84) (확인: 2026-09-20)
— [zeppelin.sh](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/bin/zeppelin.sh) (확인: 2026-09-20)
— [zeppelin-daemon.sh](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/bin/zeppelin-daemon.sh) (확인: 2026-09-20)
— [core.yml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/.github/workflows/core.yml) (확인: 2026-09-20)

Java의 `main()`은 `ZeppelinConfiguration.load()` → `printShortInfo()` → `new ZeppelinServer(zConf)` → `startZeppelin()` 순서로 실행합니다. `main(String[] args)`는 인자를 사용하지 않습니다. 따라서 임의의 CLI 인자를 덧붙여 포트를 변경할 수 있다고 가정하지 말고 실제 설정 키를 사용해야 합니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L309-L315) (확인: 2026-09-20)

## 설정 우선순위와 정확한 키 이름

인스턴스의 `getString(ConfVars)`·`getInt(ConfVars)` 같은 getter는 환경 변수 → Java system property → XML 값 → enum 기본값 순서로 값을 찾습니다. `getStaticString()`처럼 XML 조회 없이 반환하는 별도 메서드까지 같은 네 단계라고 일반화하지 않습니다.

— [ZeppelinConfiguration.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L205-L248) (확인: 2026-09-20)

포트의 환경 변수는 **`ZEPPELIN_PORT`**입니다. system property와 XML 키는 **`zeppelin.server.port`**입니다. 이번 소스 조회 결과입니다.

```bash
rg -n 'ZEPPELIN_PORT\("|return getInt\(ConfVars.ZEPPELIN_PORT' zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java
```

```text
339:    return getInt(ConfVars.ZEPPELIN_PORT);
989:    ZEPPELIN_PORT("zeppelin.server.port", 8080),
```

예를 들어 XML에 8080, JVM 인자에 `-Dzeppelin.server.port=8081`, 환경에 `ZEPPELIN_PORT=8082`가 있으면 getter는 8082를 선택합니다. 이는 소스 분기의 예시이며 실제 포트 기동 결과는 아닙니다. 기존 문서의 `ZEPPELIN_SERVER_PORT`는 이 enum의 이름이 아니어서 이 설정을 덮어쓰지 못합니다.

XML 파일 로딩은 설정 경로와 classpath를 탐색하며, 파일을 읽지 못하면 경고를 남기고 진행하는 경로가 있습니다. “프로세스가 떴다”만 확인하면 의도한 XML이 읽혔는지를 놓칠 수 있습니다.

— [ZeppelinConfiguration.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L98-L134) (확인: 2026-09-20)

## 생성자와 `startZeppelin()`의 순서

다음은 소스 호출 순서이며, 실측 시간 순서나 모든 비동기 작업의 완료 순서를 나타내지는 않습니다.

```text
생성자
  Prometheus registry 선택
  Jetty Server·Connector 구성
  HK2 ServiceLocator 생성
  ConfigStorage 생성

startZeppelin()
  metrics와 handler tree 준비
  HK2 binding 등록
  new/classic WebAppContext 구성과 endpoint 등록
  NotebookRepo.init()
  initJMX()
  runNoteOnStart()
  shutdown hook 등록
  Notebook·SearchService·SchedulerService 명시적 조회
  notebook.initNotebook() / recoveryIfNecessary()
  jettyWebServer.start()
  immediate service construction error 확인
  jettyWebServer.join()
```

Connector는 생성자에서 구성하지만 시작 호출은 뒤에 있습니다. 설정된 host·port, SSL 사용 시의 SSL port, 30초 idle timeout도 이 구성 단계에 정해집니다. 포트 점유 실패는 Connector 객체 생성과 같은 사건으로 취급하지 않고 `start()` 예외 경로에서 조사해야 합니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L147-L315) (확인: 2026-09-20)
— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L381-L430) (확인: 2026-09-20)

## HK2 binding이 선택하는 구현체

| 조건 | 등록하는 구현 |
| --- | --- |
| cron 활성 조건 충족 | `QuartzSchedulerService` |
| cron 활성 조건 불충족 | `NoSchedulerService` |
| `zeppelin.search.enable=false` | `NoSearchService` |
| search 활성, semantic 비활성 | `LuceneSearch` |
| search 활성, semantic 활성 | `EmbeddingSearch` |

기본값은 cron `false`, search `true`, semantic search `false`입니다. 이는 제품 소스의 기본값이며 회사나 로컬 설정값이 아닙니다. binding은 사용할 구현을 등록하는 단계이고, Singleton 등록만으로 모든 객체가 그 자리에서 생성됐다고 단정하지 않습니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L174-L223) (확인: 2026-09-20)
— [ZeppelinConfiguration.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L1175-L1185) (확인: 2026-09-20)

cron의 최소 예시는 다음과 같습니다. `zeppelin.notebook.cron.enable=true`만 지정하고 설정 디렉터리에 `shiro.ini`가 없으면 `NoSchedulerService`가 선택됩니다. `getShiroPath()`는 `getConfDir()`로 정한 디렉터리를 쓰므로 반드시 저장소의 기본 `conf/`만 검사하는 것도 아닙니다. 인증 설정 파일의 존재와 그 안의 사용자·필터 규칙이 올바른지는 다른 검증입니다.

— [ZeppelinConfiguration.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L620-L627) (확인: 2026-09-20)
— [ZeppelinConfiguration.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L843-L845) (확인: 2026-09-20)

## UI 경로와 API는 WebAppContext 안에 붙습니다

| `zeppelin.default.ui` | new UI | classic UI |
| --- | --- | --- |
| `new` — 기본값 | 설정된 서버 context path | `/classic` |
| `classic` | `/new` | 설정된 서버 context path |

`setupWebAppContext()`는 경로가 디렉터리면 정적 리소스 경로로, 아니면 WAR 경로로 처리합니다. 기본 UI에만 `setThrowUnavailableOnStartupException(true)`를 적용합니다. 따라서 선택적 UI의 리소스 누락과 기본 UI 누락을 같은 시작 실패로 다루지 않습니다. 기본 빌드가 `web-classic` 모듈을 포함하지 않아도 과거 산출물이나 별도 경로가 있을 수 있으므로 “classic UI는 반드시 없다”라고 단정할 수는 없습니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L225-L236) (확인: 2026-09-20)
— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L584-L614) (확인: 2026-09-20)
— [pom.xml](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/pom.xml) (확인: 2026-09-20)

각 context에는 `/api/*`, `/ws`, `/ping`, `/health/readiness`, `/health/liveness` 등이 붙습니다. `/metrics`는 Prometheus 활성 시에만 붙고 `/api/*`의 Shiro 필터는 `getShiroPath()`가 비어 있지 않을 때 추가됩니다. 표기의 경로는 context 내부 경로입니다. 서버 context를 바꾼 환경에서 항상 루트 `/api`로 호출하면 다른 주소를 검사하게 됩니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L556-L643) (확인: 2026-09-20)

## Notebook 초기화 실패와 시작 시 Note 실행

`NotebookRepo.init()`의 `IOException`은 로그에 기록한 뒤 다음 단계로 진행합니다. 따라서 `Failed to init NotebookRepo`와 HTTP 서버 기동은 함께 관측될 수 있는 코드 경로입니다. 이것을 저장소 정상으로 해석해서는 안 됩니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L238-L246) (확인: 2026-09-20)

`zeppelin.notebook.run.id`가 비어 있지 않으면 `runNoteOnStart()`는 해당 Note의 모든 Paragraph 실행을 요청합니다. service context는 설정된 base64 JSON을 읽고, 없으면 anonymous를 사용합니다. `zeppelin.notebook.run.autoshutdown`의 기본값은 `true`이며 결과에 따라 `shutdown(0)` 또는 `shutdown(1)`을 호출합니다.

다만 여기에는 주의할 제어 흐름이 있습니다. **`shutdown(0)`은 `System.exit(0)`을 호출하지 않으며 `runNoteOnStart()` 이후 코드에도 무조건적인 return이 없습니다.** 따라서 이 소스만으로 “성공하면 그 자리에서 프로세스가 반드시 종료된다”고 설명하지 않습니다. 성공·실패 경로의 실제 종료 여부는 각각 기동 실험이 필요합니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L354-L379) (확인: 2026-09-20)
— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L432-L471) (확인: 2026-09-20)
— [ZeppelinConfiguration.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L1033) (확인: 2026-09-20)

일반 시작 경로에서는 Notebook 등을 명시적으로 조회한 뒤 `initNotebook()`과 `recoveryIfNecessary()`를 호출합니다. 소스는 Note 초기화를 비동기로 설명하며, recovery를 생성자 밖에서 수행하는 이유를 deadlock 회피라고 적고 있습니다. 따라서 호출 순서가 정해져 있다는 것과 모든 Note가 이미 사용 가능하다는 것은 다릅니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L253-L265) (확인: 2026-09-20)

## `start()` 다음에도 실패할 수 있습니다

Jetty 시작 예외는 `shutdown(-1)`로 이어집니다. 시작 호출이 반환한 뒤에도 HK2 immediate service 생성 오류를 최대 5초 기다려 확인하고, 오류가 있으면 종료합니다. 이 5초는 고정된 서버 준비 시간이나 모든 비동기 초기화의 완료 보장이 아닙니다. 이후 `join()`은 Jetty 종료를 기다립니다.

종료에서는 Jetty를 멈추고 Notebook을 닫습니다. recovery가 비활성이면 InterpreterSettingManager도 닫지만, recovery 활성 시에는 그 호출을 생략합니다. 이 분기는 재연결의 필요조건을 설명할 뿐 재시작 복구 성공을 증명하지는 않습니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L272-L307) (확인: 2026-09-20)
— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2ee180ffab215aa18fd167815b65bc23fcc64d1f/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L354-L379) (확인: 2026-09-20)

## 확인하지 못한 것

- HTTP 기동·포트 충돌·선택적 UI 누락의 실제 응답은 **미실행**입니다 — 기존 사용자 설정을 사용하는 서버를 기동하지 않았습니다.
- 시작 시 Note 실행의 성공·실패별 프로세스 종료는 **확인 필요**입니다 — `shutdown()` 뒤 제어 흐름은 읽었지만 batch 기동은 재현하지 않았습니다.
- Notebook 비동기 초기화 완료 시점과 recovery 성공 여부는 **미실행**입니다 — 이 문서는 서버 진입점의 호출 경계를 다룹니다.
- 모든 설정 getter가 동일한 우선순위를 따르는지는 **확인 필요**입니다 — 설명한 ConfVars 기반 인스턴스 getter와 별도 static getter를 구분했습니다.

*작성일: 2026-09-20*
