---
sidebar_position: 2
---

# Apache Zeppelin은 시작할 때 무엇을 하는가

> 원문 — [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java), [ZeppelinConfiguration.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java)
>
> 확인 날짜 — 2026-09-13 (Apache Zeppelin `master`의 커밋 `2f403f36b1b23183e2cff31b4024d9b85173bfb2` 기준이며 릴리스 태그 기준이 아닙니다.)
>
> 검증 상태 — 로컬 소스 코드를 읽어 호출 관계를 추적했습니다. 실제 Zeppelin 프로세스를 실행한 로그는 포함하지 않았습니다.

## 결론부터 말하면

`ZeppelinServer.main()`은 Java 프로세스의 진입점이지만 서버 초기화의 대부분은 `startZeppelin()` 안에서 일어납니다. 생성자는 Jetty·ServiceLocator·ConfigStorage를 구성하고, `startZeppelin()`은 서비스·웹 애플리케이션·Notebook을 준비한 뒤 `jettyWebServer.start()`에서 실제 Jetty 생명주기를 시작합니다.

```text
Zeppelin 실행 스크립트
  ↓
ZeppelinServer.main()
  ├─ ZeppelinConfiguration.load()
  ├─ new ZeppelinServer(zConf)
  │    ├─ Prometheus registry 선택
  │    ├─ Jetty Server·Connector 구성
  │    ├─ HK2 ServiceLocator 생성
  │    └─ ConfigStorage 생성
  └─ server.startZeppelin()
       ├─ Metrics·HK2 서비스 binding
       ├─ WebAppContext·REST·WebSocket 구성
       ├─ NotebookRepo 초기화·시작 Note 처리
       ├─ Notebook·Search·Scheduler 초기화
       ├─ Jetty start()
       ├─ construction error 확인
       └─ Jetty join()
```

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L309-L315) (확인: 2026-09-13)

## 실행 환경과 버전 범위

이번 문서는 `/Users/pgt0409/Desktop/git/zeppelin`의 다음 소스 상태를 읽어 작성했습니다.

```text
commit: 2f403f36b1b23183e2cff31b4024d9b85173bfb2
확인 날짜: 2026-09-13
확인 범위: ZeppelinServer.java, ZeppelinConfiguration.java, bin/zeppelin-daemon.sh
```

이 커밋은 릴리스 태그가 아닌 `master`의 커밋입니다. 따라서 공식 `latest` 문서 0.12.0 또는 최신 릴리스 0.12.1과 모든 구현이 일치한다고 단정하지 않습니다. 로컬 Zeppelin을 빌드하거나 실행하지 않았으므로 실제 시작 로그·포트 bind·비동기 초기화 시간은 기록하지 않았습니다.

## 0. JVM은 어떻게 `main()`까지 오는가

배포된 Zeppelin을 `bin/zeppelin-daemon.sh`로 시작하면 스크립트가 `org.apache.zeppelin.server.ZeppelinServer`를 Java main class로 지정하고 classpath를 구성한 뒤 JVM을 실행합니다.

```bash
$ZEPPELIN_RUNNER $JAVA_OPTS \
  -cp $ZEPPELIN_CLASSPATH_OVERRIDES:$ZEPPELIN_CLASSPATH \
  org.apache.zeppelin.server.ZeppelinServer
```

따라서 운영 프로세스 관점의 첫 단계는 실행 스크립트이고, Java 애플리케이션 관점의 첫 메서드는 `ZeppelinServer.main()`입니다. 현재 소스의 `main(String[] args)`는 인자를 직접 사용하지 않습니다.

— [zeppelin-daemon.sh](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/bin/zeppelin-daemon.sh#L51-L57), [Java 실행](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/bin/zeppelin-daemon.sh#L198-L207) (확인: 2026-09-13)

## 1. `main()` — 설정을 읽고 서버 생명주기를 소유합니다

```java
public static void main(String[] args) throws Exception {
  ZeppelinConfiguration zConf = ZeppelinConfiguration.load();
  zConf.printShortInfo();
  try (ZeppelinServer server = new ZeppelinServer(zConf)) {
    server.startZeppelin();
  }
}
```

`ZeppelinConfiguration.load()`로 설정을 만들고, `printShortInfo()`로 요약 정보를 출력한 뒤 `ZeppelinServer`를 생성하고 `startZeppelin()`을 호출합니다. `ZeppelinServer`가 `AutoCloseable`이므로 try 블록을 빠져나가면 `close()`가 호출되고 shutdown 경로가 실행됩니다.

설정 로더는 `zeppelin-site.xml`을 `conf` 경로와 classpath에서 찾습니다. getter가 환경 변수·Java system property·설정 파일 값·기본값을 적용하는 구체적인 순서는 설정 항목별 구현을 확인해야 하므로, 이 문서에서는 클래스 주석의 `environment variables > system properties > configuration file` 설명까지만 확정합니다.

— [ZeppelinConfiguration.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L88-L145), [설정값 조회 로직](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L206-L311) (확인: 2026-09-13)

## 2. 생성자 — Jetty를 구성하지만 시작하지는 않습니다

`new ZeppelinServer(zConf)`는 다음을 준비합니다.

- Prometheus metric이 켜져 있으면 `PrometheusMeterRegistry`를 선택합니다.
- Jetty thread pool, `Server`, HTTP 또는 HTTPS Connector를 구성합니다.
- HK2의 `shared-locator` ServiceLocator를 생성합니다.
- `ConfigStorage.createConfigStorage(zConf)`로 설정 저장소를 만듭니다.

Connector에 host·port·idle timeout이 설정되지만 이 단계에서 소켓이 listen 상태가 되는 것은 아닙니다. 실제 Jetty 시작은 뒤의 `jettyWebServer.start()`에서 일어납니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L147-L158), [Jetty 구성](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L381-L430) (확인: 2026-09-13)

## 3. `startZeppelin()`에서 metrics와 요청 처리 구조를 준비합니다

`initMetrics()`는 설정에 따라 JMX·Prometheus registry와 JVM·시스템 메트릭을 등록합니다. 이어서 `TimedHandler`와 `ContextHandlerCollection`을 Jetty handler tree로 구성하고 new UI와 classic UI의 `WebAppContext`를 준비합니다.

각 context에는 설정된 resource base, REST API, health·liveness·readiness, `/ping`, 조건부 `/metrics`, Notebook WebSocket 등이 연결됩니다. 이 시점도 요청 처리 시작이 아니라 웹 애플리케이션 구조를 조립하는 단계입니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L160-L171), [WebAppContext 구성](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L225-L236) (확인: 2026-09-13)

## 4. HK2에 서버 서비스를 binding합니다

`ServiceLocatorUtilities.bind()` 안에서 Interpreter, Notebook, 인증·권한, Connection, Job, Plugin, Helium 등의 서비스를 등록합니다. `bindAsContract(...).in(Singleton.class)`는 binding을 Singleton으로 등록한다는 뜻이며, 모든 객체가 이 순간 즉시 생성된다고 단정할 수는 없습니다.

설정에 따라 구현체도 달라집니다.

```text
ZEPPELIN_NOTEBOOK_CRON_ENABLE
  ├─ true  → QuartzSchedulerService
  └─ false → NoSchedulerService

ZEPPELIN_SEARCH_ENABLE
  ├─ false → NoSearchService
  └─ true
       ├─ semantic true  → EmbeddingSearch
       └─ semantic false → LuceneSearch
```

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L174-L223) (확인: 2026-09-13)

## 5. Notebook 저장소와 시작 시 작업을 준비합니다

웹 context 구성 뒤 `NotebookRepo.init(zConf, noteParser)`를 호출합니다. 현재 소스에서는 이 호출의 `IOException`을 catch해 로그로 남기지만 `startZeppelin()`을 즉시 중단하지 않고 다음 단계로 진행합니다. 따라서 Repository 초기화 실패가 항상 프로세스 종료를 뜻하지는 않습니다.

`runNoteOnStart()`에 Note run ID가 설정되어 있으면 지정된 Note의 Paragraph를 실행할 수 있습니다. 일반적인 서버 시작에서는 이 설정이 비어 있습니다.

그 다음 Notebook·Search·Scheduler를 ServiceLocator에서 직접 요청합니다. Notebook의 lazy 생성을 시작 시점으로 당기는 이유는 Paragraph recovery와 cron 초기화가 첫 사용자 요청까지 지연되지 않게 하기 위해서입니다. 이후 `notebook.initNotebook()`과 `notebook.recoveryIfNecessary()`를 호출합니다. recovery를 생성자에서 하지 않는 이유는 소스 주석상 deadlock을 피하기 위해서입니다.

— [NotebookRepo 초기화와 시작 시 Note 실행](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L238-L265) (확인: 2026-09-13)

## 6. `jettyWebServer.start()`에서 실제 서버를 시작합니다

```text
start() 이전
  └─ 설정·객체·handler·context·Notebook 초기화 준비

start() 호출
  └─ Jetty가 Connector·WebAppContext·Servlet 생명주기를 시작

start() 이후
  └─ construction error 확인 후 join()으로 대기
```

`start()`에서 예외가 나면 `shutdown(-1)`을 호출합니다. 정상 shutdown에서는 Jetty를 멈추고 Notebook을 닫습니다. InterpreterSettingManager는 recovery 설정이 꺼진 경우에 닫힙니다.

— [Jetty start](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L267-L277), [shutdown](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L354-L379) (확인: 2026-09-13)

## 7. 시작 직후 오류를 확인하고 프로세스를 유지합니다

Jetty의 `start()`가 반환되어도 모든 초기화가 성공했다는 뜻은 아닙니다. 뒤에서 `ImmediateErrorHandlerImpl.waitForAtLeastOneConstructionError(5000)`으로 construction error를 확인합니다. 오류가 있으면 로그를 남기고 `shutdown(-1)`을 호출합니다. 오류가 없고 Jetty가 stopping/stopped 상태가 아니면 `jettyWebServer.join()`으로 Jetty 생명주기가 끝날 때까지 main thread를 기다립니다.

```java
List<ErrorData> errorDatas = handler.waitForAtLeastOneConstructionError(5000);
jettyWebServer.join();
```

따라서 서버가 계속 실행되는 이유는 `main()`이 직접 무한 루프를 돌기 때문이 아니라 Jetty의 종료를 기다리기 때문입니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L279-L306) (확인: 2026-09-13)

## 전체 흐름

```text
bin/zeppelin-daemon.sh
  │ main class·classpath 지정
  ▼
ZeppelinServer.main()
  ├─ ZeppelinConfiguration.load()
  ├─ new ZeppelinServer(zConf)
  │    ├─ Jetty·Connector 구성
  │    ├─ HK2 ServiceLocator 생성
  │    └─ ConfigStorage 생성
  └─ server.startZeppelin()
       ├─ metrics·handler·WebAppContext 구성
       ├─ HK2 서비스 binding
       ├─ NotebookRepo.init()
       │    └─ IOException은 기록 후 다음 단계 진행
       ├─ 시작 시 Note 처리
       ├─ Notebook·Search·Scheduler eager initialization
       ├─ Notebook 초기화와 recovery
       ├─ jettyWebServer.start()
       ├─ construction error 확인
       └─ jettyWebServer.join()
```

## 이 흐름에서 가장 헷갈리는 지점

### `new ZeppelinServer()`가 서버를 띄우지 않습니다

생성자는 Jetty 객체와 Connector를 구성할 뿐입니다. HTTP endpoint가 실제로 bind/listen하고 WebAppContext 생명주기를 시작하는 기준점은 `jettyWebServer.start()`입니다.

### `start()`가 반환되어도 성공이 확정되지 않습니다

Jetty start 예외와 별도로 construction error 확인 단계가 있습니다. 시작 성공 여부는 `start()`의 반환만이 아니라 그 뒤 오류 확인까지 포함해 판단해야 합니다.

### Notebook은 완전히 lazy하지 않습니다

서비스 binding은 지연 생성될 수 있지만 `startZeppelin()`은 Notebook·Search·Scheduler를 직접 요청하고 Notebook 초기화와 recovery를 시작합니다. 첫 페이지를 열 때까지 모든 초기화가 미뤄진다고 이해하면 현재 소스와 맞지 않습니다.

## breakpoint 순서

1. `ZeppelinConfiguration.load()` — 설정 확인
2. `ZeppelinServer` 생성자 — Jetty·ServiceLocator 확인
3. `ServiceLocatorUtilities.bind()` — 구현체 선택 확인
4. `repo.init()`·`notebook.initNotebook()`·`recoveryIfNecessary()` — 저장소와 Notebook 상태 확인
5. `jettyWebServer.start()` — 실제 서버 시작 실패 확인
6. `waitForAtLeastOneConstructionError()` — start 이후 비동기 construction error 확인

## 확인하지 못한 것

- 배포 방식별 최종 classpath와 `ZEPPELIN_RUNNER` 값은 확인하지 않았습니다 — 스크립트의 main class 지정과 실행 경계까지만 추적했습니다.
- `Notebook.initNotebook()` 내부의 모든 비동기 작업 순서는 확인하지 않았습니다 — `ZeppelinServer`가 호출하는 경계까지만 다뤘습니다.
- 실제 construction error 발생 조건은 재현하지 않았습니다 — Zeppelin 프로세스를 실행하지 않고 소스 호출 관계만 확인했습니다.

*작성일: 2026-09-13*
