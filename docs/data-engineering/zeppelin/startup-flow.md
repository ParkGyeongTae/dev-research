---
sidebar_position: 2
---

# Apache Zeppelin은 시작할 때 무엇을 하는가

> 원문 — [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java), [ZeppelinConfiguration.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java)
>
> 확인 날짜 — 2026-09-10 (Apache Zeppelin 소스 커밋 `2f403f36b1b23183e2cff31b4024d9b85173bfb2` 기준)
>
> 검증 상태 — 로컬 소스 코드를 읽어 호출 관계를 추적했습니다. 실제 Zeppelin 프로세스를 실행한 로그는 포함하지 않았습니다.

## 결론부터 말하면

`ZeppelinServer.main()`은 Apache Zeppelin의 **Java 프로세스 진입점**이 맞습니다. 다만 `main()` 자체가 서버를 모두 구성하는 것은 아닙니다.

```text
Zeppelin 실행 스크립트
  ↓
ZeppelinServer.main()
  ├─ ZeppelinConfiguration.load()
  ├─ new ZeppelinServer(zConf)
  │    ├─ Prometheus registry 준비
  │    ├─ Jetty Server·Connector 구성
  │    ├─ HK2 ServiceLocator 생성
  │    └─ ConfigStorage 생성
  └─ server.startZeppelin()
       ├─ Metrics·HK2 서비스 바인딩
       ├─ WebAppContext·REST·WebSocket 구성
       ├─ NotebookRepo·Notebook 초기화와 복구
       ├─ Jetty start()
       ├─ 시작 중 construction error 확인
       └─ Jetty join()으로 프로세스 유지
```

이 흐름에서 핵심 경계는 다음과 같습니다.

- `main()`은 설정을 만들고 `ZeppelinServer`를 생성한 뒤 `startZeppelin()`을 호출합니다.
- 생성자는 **서버 객체의 기반 자원**을 만들지만 Jetty를 실제로 시작하지는 않습니다.
- `startZeppelin()`은 의존성 주입, 웹 애플리케이션, Notebook, 검색·스케줄러를 준비한 뒤 마지막에 `jettyWebServer.start()`를 호출합니다.
- Jetty가 시작된 뒤에도 `main()`은 끝나지 않고 `jettyWebServer.join()`을 통해 서버 스레드를 기다립니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L309-L315) (확인: 2026-09-10)

## 0. JVM은 어떻게 `main()`까지 오는가

배포된 Zeppelin을 `bin/zeppelin-daemon.sh`로 시작하면 스크립트가 다음 클래스를 Java main class로 지정합니다.

```bash
ZEPPELIN_MAIN=org.apache.zeppelin.server.ZeppelinServer
```

그 뒤 classpath를 구성하고 다음 형태로 JVM을 실행합니다.

```bash
$ZEPPELIN_RUNNER $JAVA_OPTS \
  -cp $ZEPPELIN_CLASSPATH_OVERRIDES:$ZEPPELIN_CLASSPATH \
  org.apache.zeppelin.server.ZeppelinServer
```

따라서 “처음 진입점”을 운영 프로세스 관점에서 말하면 `zeppelin-daemon.sh`가 Java 프로세스를 띄우는 단계가 먼저이고, Zeppelin 서버 애플리케이션 관점의 첫 Java 메서드가 `ZeppelinServer.main()`입니다. `main(String[] args)`의 `args`는 현재 구현에서 사용하지 않습니다.

— [zeppelin-daemon.sh](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/bin/zeppelin-daemon.sh#L51-L57), [zeppelin-daemon.sh의 Java 실행](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/bin/zeppelin-daemon.sh#L198-L207) (확인: 2026-09-10)

## 1. `main()` — 설정을 읽고 서버 생명주기를 소유한다

현재 `main()`의 코드는 짧습니다.

```java
public static void main(String[] args) throws Exception {
  ZeppelinConfiguration zConf = ZeppelinConfiguration.load();
  zConf.printShortInfo();
  try (ZeppelinServer server = new ZeppelinServer(zConf)) {
    server.startZeppelin();
  }
}
```

순서는 세 단계입니다.

1. `ZeppelinConfiguration.load()`로 설정 객체를 만듭니다.
2. `printShortInfo()`로 host, port, context path, Zeppelin version을 로그에 남깁니다.
3. `try-with-resources`로 `ZeppelinServer`를 생성하고 `startZeppelin()`을 호출합니다.

세 번째 단계가 중요한 이유는 `ZeppelinServer`가 `AutoCloseable`이기 때문입니다. `startZeppelin()`이 반환되거나 예외가 처리된 뒤 try 블록을 빠져나가면 `close()`가 호출되고, `close()`는 `shutdown()`을 호출합니다. 즉 `main()`은 서버를 시작하는 코드이면서, 서버 객체의 종료 책임도 함께 소유합니다.

### 설정 파일을 읽는 시점

`ZeppelinConfiguration.load()`는 인자를 넘기지 않으므로 내부적으로 기본 파일명인 `zeppelin-site.xml`을 사용합니다. 설정 로더는 `conf` 경로와 classpath를 사용해 XML을 찾고, XML의 각 `name`·`value`를 내부 `properties` 맵에 넣습니다.

그 후 각 설정 getter는 환경 변수, Java system property, 설정 파일 값, 기본값의 순서를 적용합니다. 소스의 클래스 주석도 설정 소스 우선순위를 다음처럼 적고 있습니다.

```text
environment variables > system properties > configuration file
```

예를 들어 `zConf.getServerPort()`는 `startZeppelin()`이 Connector를 만들 때 평가됩니다. 따라서 포트 설정은 단순히 `main()` 시작 시 한 번 출력되는 값이 아니라, 이후 Jetty Connector 구성에 사용되는 값입니다.

— [ZeppelinConfiguration.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L88-L145), [설정값 조회 로직](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L206-L311) (확인: 2026-09-10)

## 2. 생성자 — Jetty를 “구성”하지만 아직 “시작”하지 않는다

`new ZeppelinServer(zConf)`는 내부적으로 두 인자를 받는 생성자를 호출합니다.

```java
public ZeppelinServer(ZeppelinConfiguration zConf) throws IOException {
  this(zConf, DEFAULT_SERVICE_LOCATOR_NAME);
}
```

두 인자 생성자는 다음 네 가지를 준비합니다.

### 2.1 Prometheus registry 선택

`zConf.isPrometheusMetricEnabled()`가 true이면 `PrometheusMeterRegistry`를 만들고, 아니면 빈 `Optional`을 보관합니다. 이 시점에는 아직 모든 JVM·Jetty 메트릭을 등록하지 않습니다. 실제 공통 메트릭 등록은 `startZeppelin()` 첫 부분의 `initMetrics()`에서 일어납니다.

### 2.2 Jetty Server와 Connector 구성

`setupJettyServer()`는 계측된 Jetty thread pool을 만들고 `new Server(threadPool)`을 생성합니다. 이어서 `initServerConnector(server)`가 HTTP 또는 HTTPS Connector를 만들어 Server에 추가합니다.

```text
setupJettyServer()
  ├─ InstrumentedQueuedThreadPool 생성
  ├─ new Server(threadPool)
  └─ initServerConnector(server)
       ├─ SSL 사용: HTTPS Connector + SSL Context
       └─ SSL 미사용: HTTP Connector
```

Connector에는 설정에서 읽은 host와 port가 들어가며 idle timeout은 현재 코드에서 30초로 설정됩니다. 하지만 이 단계에서 소켓이 listen 상태가 되는 것은 아닙니다. 실제 시작은 나중에 `startZeppelin()`의 `jettyWebServer.start()`에서 일어납니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L147-L158), [Jetty 구성](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L381-L430) (확인: 2026-09-10)

### 2.3 HK2 ServiceLocator 생성

`ServiceLocatorFactory`로 `shared-locator`라는 이름의 HK2 ServiceLocator를 만듭니다. 이 객체는 이후 `startZeppelin()`에서 Notebook, Interpreter, 인증, REST 서비스 등을 등록하고 가져오는 의존성 주입 컨테이너 역할을 합니다.

### 2.4 ConfigStorage 생성

마지막으로 `ConfigStorage.createConfigStorage(zConf)`를 호출해 설정 저장소를 준비합니다. 이 객체는 이후 HK2 binding에서 `ConfigStorage`로 등록되어 서비스들이 주입받을 수 있게 됩니다.

생성자의 결과는 “웹 서버가 사용자 요청을 받을 준비가 끝났다”가 아닙니다. 정확히는 **시작 과정에서 사용할 핵심 객체와 Jetty의 정적 구성만 만들어진 상태**입니다.

## 3. `startZeppelin()` 1단계 — 메트릭과 요청 처리 뼈대

`startZeppelin()`은 먼저 `initMetrics()`를 호출합니다.

- JMX가 켜져 있으면 `JmxMeterRegistry`를 추가합니다.
- Prometheus registry가 생성되어 있으면 global registry에 추가합니다.
- ClassLoader, JVM memory, JVM thread, file descriptor, processor, uptime 메트릭을 등록합니다.
- Zeppelin 자체 JVM 정보도 `JVMInfoBinder`로 등록합니다.

그 다음 Jetty의 handler 트리를 다음처럼 만듭니다.

```text
jettyWebServer
  └─ TimedHandler
       └─ ContextHandlerCollection
            ├─ new UI WebAppContext
            └─ classic UI WebAppContext
```

`TimedHandler`는 요청 처리 시간을 측정하는 바깥 handler이고, `ContextHandlerCollection`은 여러 웹 애플리케이션 context를 묶는 컨테이너입니다. 이 시점 역시 Jetty가 아직 start되지 않았으므로 handler와 context를 등록하는 단계입니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L160-L171), [메트릭 초기화](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L338-L351) (확인: 2026-09-10)

## 4. `startZeppelin()` 2단계 — HK2에 서버 서비스를 등록

`ServiceLocatorUtilities.bind()` 안에서 서버가 사용할 객체들을 HK2에 등록합니다. 예를 들면 다음과 같습니다.

- `InterpreterFactory`, `InterpreterSettingManager`, `InterpreterService`
- `NotebookRepo`, `Notebook`, `NoteManager`, `NotebookService`
- `AuthenticationService`, `AuthorizationService`, `Credentials`
- `ConnectionManager`, `NotebookServer`, `JobManagerService`
- `PluginManager`, `Helium`, `HeliumApplicationFactory`

여기서 모든 객체가 즉시 생성되는 것은 아닙니다. `bindAsContract(...).in(Singleton.class)`는 해당 타입을 Singleton으로 관리하도록 binding을 등록하는 의미이고, 실제 인스턴스 생성 시점은 HK2가 서비스를 요청받는 시점과 객체의 eager/lazy 설정에 영향을 받습니다.

조건에 따라 binding 대상도 달라집니다.

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

즉 설정은 나중에 서비스가 실행될 때만 영향을 주는 것이 아니라, 시작 중에 어떤 구현체를 의존성 주입할지 결정합니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L174-L223) (확인: 2026-09-10)

## 5. `startZeppelin()` 3단계 — 두 UI와 웹 엔드포인트 구성

현재 코드는 new UI와 classic UI를 모두 `WebAppContext`로 준비하지만, 기본 UI 설정에 따라 실제 기본 context path와 존재 여부를 다르게 설정합니다.

```text
기본 UI가 new인 경우
  new UI     → 설정된 server context path
  classic UI → /classic

기본 UI가 classic인 경우
  new UI     → /new
  classic UI → 설정된 server context path
```

각 WebAppContext에는 다음이 붙습니다.

- WAR 또는 개발 중인 디렉터리의 resource base
- `/index.html`을 처리하는 `IndexHtmlServlet`
- 모든 요청에 적용되는 `CorsFilter`
- REST API `/api/*`
- Prometheus `/metrics` — registry가 활성화된 경우
- readiness·liveness `/health/readiness`, `/health/liveness`
- `/ping`
- Notebook WebSocket `/ws`

`initWebApp()`은 ServletContext에 shared ServiceLocator를 attribute로 넣고 REST·Prometheus·health·Notebook 서버를 설정합니다. 중요한 점은 아직 요청이 처리되는 것이 아니라, Jetty가 시작했을 때 사용할 웹 애플리케이션 구조를 조립한다는 것입니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L225-L236), [WebAppContext 구성](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L570-L643) (확인: 2026-09-10)

## 6. Notebook 저장소와 부가 서비스 초기화

웹 context를 구성한 뒤 `NotebookRepo`와 `NoteParser`를 ServiceLocator에서 가져와 `repo.init(zConf, noteParser)`를 호출합니다. Notebook을 어디에 저장하고 어떤 형식으로 읽을지 준비하는 단계입니다. 초기화에서 `IOException`이 발생하면 오류를 로그에 남기지만 `startZeppelin()`은 즉시 종료하지 않고 다음 단계로 진행합니다.

이 동작은 “NotebookRepo 초기화 실패가 항상 프로세스 종료로 이어진다”는 뜻이 아닙니다. 현재 `ZeppelinServer.java`에서 해당 예외는 catch되어 로그로 처리됩니다. 실제로 서비스가 사용 가능한지는 이후의 요청 처리나 추가 초기화 결과까지 확인해야 합니다.

그 다음 JMX를 설정하고, `runNoteOnStart()`를 호출합니다.

`runNoteOnStart()`에 Notebook run ID 설정이 있으면 지정된 Note의 모든 Paragraph를 실행합니다. service context가 없으면 `ANONYMOUS`를 사용하고, 실행 후 `notebookRunAutoShutdown`이 켜져 있으면 성공 여부에 따라 0 또는 1로 종료합니다. 일반적인 서버 시작에서는 Note run ID가 비어 있으므로 이 분기는 실행되지 않습니다.

— [NotebookRepo 초기화와 시작 시 Note 실행](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L238-L251), [runNoteOnStart](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L432-L471) (확인: 2026-09-10)

## 7. Notebook·Search·Scheduler를 의도적으로 깨운다

다음 코드는 ServiceLocator에서 `Notebook`, `SearchService`, `SchedulerService`를 직접 요청합니다.

```java
Notebook notebook = ServiceLocatorUtilities.getService(
    sharedServiceLocator, Notebook.class.getName());
ServiceLocatorUtilities.getService(sharedServiceLocator, SearchService.class.getName());
ServiceLocatorUtilities.getService(sharedServiceLocator, SchedulerService.class.getName());
```

주석이 설명하듯 `Notebook`은 원래 사용자가 브라우저에서 Zeppelin을 열 때까지 lazy하게 생성될 수 있습니다. 하지만 그렇게 두면 Paragraph recovery와 cron job 초기화가 첫 사용자 요청까지 지연됩니다. 그래서 시작 과정에서 객체를 미리 요청해 초기화를 앞당깁니다.

이후 다음 두 작업을 수행합니다.

1. `notebook.initNotebook()` — Notebook의 초기화 작업을 시작합니다. 소스 주석은 Notes 초기화가 비동기라고 설명합니다.
2. `notebook.recoveryIfNecessary()` — 이전 실행의 복구가 필요한지 확인하고 복구합니다.

복구를 `Notebook` 생성자에서 하지 않는 이유도 소스 주석에 적혀 있습니다. 생성자에서 수행하면 deadlock이 발생할 수 있으므로, 객체를 얻은 다음 별도 단계에서 recovery를 호출합니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L253-L265) (확인: 2026-09-10)

## 8. `jettyWebServer.start()` — 실제 서버 시작

이제야 다음 코드가 실행됩니다.

```java
try {
  jettyWebServer.start();
} catch (Exception e) {
  LOGGER.error("Error while running jettyServer", e);
  shutdown(-1);
}
```

이 호출을 기준으로 앞 단계와 뒤 단계를 나눠 읽으면 이해하기 쉽습니다.

```text
start() 이전
  └─ 설정·객체·handler·context·Notebook 초기화 준비

start() 호출
  └─ Jetty가 Connector·WebAppContext·Servlet 생명주기를 시작

start() 이후
  └─ construction error 확인 후 join()으로 대기
```

`start()`에서 예외가 나면 `shutdown(-1)`을 호출합니다. `shutdown()`은 Jetty를 멈추고, recovery 설정이 꺼져 있으면 `InterpreterSettingManager`를 닫고, `Notebook`을 닫습니다. 종료 코드가 0이 아니면 `System.exit(exitCode)`도 호출합니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L267-L277), [shutdown](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L354-L375) (확인: 2026-09-10)

## 9. 시작 직후 오류를 확인하고 프로세스를 유지한다

Jetty의 `start()`가 반환되었다고 모든 초기화가 성공했다는 뜻은 아닙니다. 코드 바로 뒤에서 `ImmediateErrorHandlerImpl`에 construction error가 있는지 최대 5초 동안 기다립니다.

```java
List<ErrorData> errorDatas = handler.waitForAtLeastOneConstructionError(5000);
```

오류가 하나라도 있으면 모두 로그로 출력하고 `shutdown(-1)`을 호출합니다. 대기 중 interrupt가 발생하면 정상 종료 경로인 `shutdown()`을 호출하고 현재 thread의 interrupt 상태를 복구합니다.

오류가 없고 Jetty도 stopping/stopped 상태가 아니면 마지막으로 다음을 실행합니다.

```java
jettyWebServer.join();
```

`join()`은 Jetty 스레드가 끝날 때까지 현재 main thread를 기다리게 합니다. 따라서 서버가 계속 실행되는 이유는 `main()`이 무한 루프를 직접 돌기 때문이 아니라, Jetty의 생명주기 종료를 기다리기 때문입니다.

— [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L279-L306) (확인: 2026-09-10)

## 전체 흐름을 한 번에 다시 그리면

```text
bin/zeppelin-daemon.sh
  │  Java classpath와 main class 지정
  ▼
ZeppelinServer.main()
  │
  ├─ ZeppelinConfiguration.load()
  │    └─ zeppelin-site.xml 탐색·적재
  │
  ├─ zConf.printShortInfo()
  │
  ├─ new ZeppelinServer(zConf)
  │    ├─ Prometheus registry 선택
  │    ├─ Jetty thread pool·HTTP/HTTPS connector 구성
  │    ├─ HK2 shared ServiceLocator 생성
  │    └─ ConfigStorage 생성
  │
  └─ server.startZeppelin()
       ├─ Metrics registry와 JVM/시스템 메트릭 등록
       ├─ TimedHandler → ContextHandlerCollection 구성
       ├─ HK2 서비스 binding
       │    ├─ Notebook·Interpreter·Auth·Job 서비스
       │    ├─ Scheduler 구현 선택
       │    └─ Search 구현 선택
       ├─ new/classic WebAppContext 구성
       │    ├─ REST API
       │    ├─ health·ping·Prometheus endpoint
       │    └─ Notebook WebSocket
       ├─ NotebookRepo 초기화
       ├─ 시작 시 실행할 Note 처리
       ├─ shutdown hook 등록
       ├─ Notebook·Search·Scheduler eager initialization
       ├─ Notebook 초기화와 recovery
       ├─ jettyWebServer.start()
       ├─ construction error 확인
       └─ jettyWebServer.join()
```

## 이 흐름에서 가장 헷갈리는 지점

### `main()`이 진입점이지만 초기화의 중심은 `startZeppelin()`입니다

`main()`만 읽으면 설정을 읽고 서버를 생성한 뒤 메서드 하나를 호출하는 것처럼 보입니다. 실제 서버 초기화의 대부분은 `startZeppelin()` 안에 있습니다. 따라서 디버깅할 때는 다음 순서로 breakpoint를 잡는 것이 좋습니다.

1. `ZeppelinConfiguration.load()` — 어떤 설정이 읽히는지 확인합니다.
2. `ZeppelinServer` 생성자 — Jetty와 ServiceLocator가 만들어지는지 확인합니다.
3. `ServiceLocatorUtilities.bind()` — 어떤 구현체가 선택되는지 확인합니다.
4. `repo.init()`·`notebook.initNotebook()`·`recoveryIfNecessary()` — 저장소와 Notebook 상태를 확인합니다.
5. `jettyWebServer.start()` — 실제 서버 시작 실패를 확인합니다.
6. `waitForAtLeastOneConstructionError()` — start 이후 비동기 construction error를 확인합니다.

### `new ZeppelinServer()`가 서버를 띄우지 않습니다

생성자는 Jetty 객체와 Connector를 구성할 뿐입니다. 서버가 실제로 bind/listen하고 WebAppContext의 생명주기를 시작하는 지점은 `jettyWebServer.start()`입니다. 이 차이는 테스트 코드에서 특히 중요합니다. 생성자 호출만으로 HTTP endpoint가 열렸다고 가정하면 테스트가 실제 서버 상태를 검증하지 못할 수 있습니다.

### `jettyWebServer.start()`가 반환되어도 성공이 확정되지 않습니다

현재 구현은 Jetty start 예외를 처리한 뒤에도 construction error를 별도로 확인합니다. 즉 시작 성공 여부는 “`start()`가 예외 없이 반환됐는가” 하나만으로 판단하지 않고, 이후 `ImmediateErrorHandlerImpl`의 오류 확인까지 포함해서 판단해야 합니다.

### Notebook은 완전히 lazy하지 않습니다

서비스 binding 자체는 지연 생성될 수 있지만, `startZeppelin()`은 Notebook·Search·Scheduler를 직접 요청하고 Notebook 초기화·복구를 시작합니다. 따라서 사용자가 첫 페이지를 열 때까지 모든 Notebook 초기화가 미뤄진다고 이해하면 현재 코드와 맞지 않습니다.

## 실행 환경

이번 문서는 `/Users/pgt0409/Desktop/git/zeppelin`의 다음 소스 상태를 읽어 작성했습니다.

```text
commit: 2f403f36b1b23183e2cff31b4024d9b85173bfb2
확인 날짜: 2026-09-10
확인 범위: ZeppelinServer.java, ZeppelinConfiguration.java, bin/zeppelin-daemon.sh
```

소스 저장소에는 이 문서와 무관한 추적되지 않은 `zeppelin-zengine/` 디렉터리가 있었으며, 변경하지 않았습니다. 로컬 Zeppelin을 빌드하거나 실행하지 않았으므로 실제 시작 로그·포트 bind·비동기 초기화 시간은 기록하지 않았습니다.

## 확인하지 못한 것

- 실제 배포 방식별 classpath와 `ZEPPELIN_RUNNER`의 최종 값은 확인하지 못했습니다 — 이번 추적은 `zeppelin-daemon.sh`에서 `ZeppelinServer`를 main class로 지정하고 실행하는 지점까지만 확인했습니다.
- `Notebook.initNotebook()` 내부의 모든 비동기 작업 순서는 확인하지 않았습니다 — 이 문서는 `ZeppelinServer`가 호출하는 경계까지만 다룹니다.
- 실제 `ImmediateErrorHandlerImpl`에 기록되는 오류의 발생 조건은 재현하지 않았습니다 — Zeppelin 프로세스를 실행하지 않고 소스 호출 관계만 확인했습니다.

*작성일: 2026-09-10*
