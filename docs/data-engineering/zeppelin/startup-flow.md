---
sidebar_position: 2
---

# Apache Zeppelin은 시작할 때 무엇을 하는가

> 원문 — [ZeppelinServer.java](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java), [ZeppelinConfiguration.java](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java), [bin/zeppelin.sh](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/bin/zeppelin.sh), [bin/zeppelin-daemon.sh](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/bin/zeppelin-daemon.sh), [bin/common.sh](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/bin/common.sh)
>
> 확인 날짜 — 2026-09-18

## 결론부터 말하면

`ZeppelinServer.main()`은 Java 프로세스의 진입점이지만 서버 초기화의 대부분은 `startZeppelin()` 안에서 일어납니다. 생성자는 Jetty·ServiceLocator·ConfigStorage를 구성하고, `startZeppelin()`은 서비스·웹 애플리케이션·Notebook을 준비한 뒤 `jettyWebServer.start()`에서 실제 Jetty 생명주기를 시작합니다.

```text
bin/zeppelin.sh (foreground) 또는 bin/zeppelin-daemon.sh (background)
  ↓
ZeppelinServer.main()                                       L309-L315
  ├─ ZeppelinConfiguration.load()
  ├─ new ZeppelinServer(zConf)                               L147-L158
  │    ├─ Prometheus registry 선택
  │    ├─ Jetty Server·Connector 구성  (setupJettyServer)     L381-L430
  │    ├─ HK2 ServiceLocator 생성
  │    └─ ConfigStorage 생성
  └─ server.startZeppelin()                                  L160-L307
       ├─ initMetrics() · TimedHandler · ContextHandlerCollection   L161-L171
       ├─ HK2 서비스 binding                                  L174-L223
       ├─ WebAppContext(new UI / classic UI) 구성·초기화      L225-L236
       ├─ NotebookRepo.init()   ← IOException은 기록만 하고 계속  L238-L246
       ├─ initJMX()                                          L248
       ├─ runNoteOnStart()                                   L250
       ├─ Runtime.addShutdownHook(this::shutdown)            L251
       ├─ Notebook·Search·Scheduler eager 조회                L253-L261
       ├─ notebook.initNotebook() · recoveryIfNecessary()    L263-L265
       ├─ jettyWebServer.start()                             L272-L277
       ├─ construction error 확인                             L280-L294
       └─ jettyWebServer.join()                              L296-L306
```

> **이전 판 정정** — 이전 판은 HK2 binding이 WebAppContext 구성 **뒤에** 오는 것처럼 서술했습니다. 실제 소스에서는 HK2 binding(L174)이 WebAppContext 구성(L225)보다 **먼저** 실행됩니다. 순서가 중요한 이유는 아래 4절에서 다룹니다.

— [ZeppelinServer.java#L160-L315](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L160-L315) (확인: 2026-09-18)

## 실행 환경과 버전 범위

```text
레포:   /Users/pgt0409/Desktop/git/zeppelin-pgt
브랜치: upstream-master
커밋:   e816bf1b76b50282cc32b284cdb8755f932f657e (2026-09-14)
버전:   0.13.0-SNAPSHOT
확인 범위: ZeppelinServer.java (653줄), ZeppelinConfiguration.java (1305줄),
           bin/zeppelin.sh, bin/zeppelin-daemon.sh, bin/common.sh
확인 날짜: 2026-09-18
```

이 커밋은 릴리스 태그가 아닌 `master`의 커밋이고 버전은 0.13.0-SNAPSHOT입니다. 따라서 공식 `latest` 문서(0.12.0)나 최신 릴리스(0.12.1)와 모든 구현이 일치한다고 단정하지 않습니다. 로컬 Zeppelin을 기동하지 않았으므로 실제 시작 로그·포트 bind·비동기 초기화 시간은 기록하지 않았습니다.

## 0. JVM은 어떻게 `main()`까지 오는가

진입 스크립트는 **두 개**이며 프로세스 모델이 다릅니다.

| 스크립트 | 실행 방식 | 해당 줄 |
| --- | --- | --- |
| `bin/zeppelin.sh` | `exec`로 현재 셸을 대체, **foreground** | L139 |
| `bin/zeppelin-daemon.sh start` | `nohup … &`로 **background**, PID 파일 기록 | L206 |
| `bin/zeppelin-daemon.sh upstart` | foreground. 서비스 관리자가 직접 감독할 때 사용 | L188 |

세 경로 모두 같은 main class를 지정합니다.

```bash
# bin/zeppelin-daemon.sh L56
ZEPPELIN_MAIN=org.apache.zeppelin.server.ZeppelinServer

# bin/zeppelin-daemon.sh L206 (start)
nohup nice -n $ZEPPELIN_NICENESS $ZEPPELIN_RUNNER $JAVA_OPTS \
  -cp $ZEPPELIN_CLASSPATH_OVERRIDES:$ZEPPELIN_CLASSPATH $ZEPPELIN_MAIN \
  >> "${ZEPPELIN_OUTFILE}" 2>&1 < /dev/null &

# bin/zeppelin.sh L139 (foreground)
exec $ZEPPELIN_RUNNER $JAVA_OPTS \
  -cp $ZEPPELIN_CLASSPATH_OVERRIDES:${ZEPPELIN_CLASSPATH} $ZEPPELIN_SERVER "$@"
```

JVM보다 먼저 실행되는 검사가 하나 있습니다. 세 스크립트 모두 `check_java_version`을 호출하고, 이 함수는 major version이 11 미만이면 `exit 1`로 중단합니다.

```bash
# bin/common.sh L72-L84
if [ "$JVM_VERSION" -lt 11 ]; then
    echo "Apache Zeppelin requires either Java 11 or newer"
    exit 1;
fi
```

따라서 운영 프로세스 관점의 첫 단계는 실행 스크립트이고, Java 애플리케이션 관점의 첫 메서드는 `ZeppelinServer.main()`입니다. `zeppelin.sh`는 `"$@"`로 인자를 넘기지만 현재 소스의 `main(String[] args)`는 `args`를 사용하지 않습니다.

— [zeppelin-daemon.sh#L56](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/bin/zeppelin-daemon.sh#L56), [#L206](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/bin/zeppelin-daemon.sh#L206), [zeppelin.sh#L139](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/bin/zeppelin.sh#L139), [common.sh#L72-L84](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/bin/common.sh#L72-L84) (확인: 2026-09-18)

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

`ZeppelinConfiguration.load()`로 설정을 만들고, `printShortInfo()`로 host·port·context path·버전을 출력한 뒤 `ZeppelinServer`를 생성하고 `startZeppelin()`을 호출합니다. `ZeppelinServer`가 `AutoCloseable`이므로 try 블록을 빠져나가면 `close()` → `shutdown(0)` 경로가 실행됩니다.

### 설정값 우선순위 — 이전 판의 미확인 항목을 해소했습니다

이전 판은 "getter가 환경 변수·system property·설정 파일·기본값을 적용하는 구체적인 순서는 항목별 구현을 확인해야 한다"고 남겨 두었습니다. 실제로는 **항목별로 다르지 않고 타입별 getter 한 곳에서 일괄 구현**되어 있습니다.

```java
// ZeppelinConfiguration.java L213-L225
public static Optional<String> getStaticString(String envName, String propertyName) {
  if (envConfig.containsKey(envName))   return Optional.of(envConfig.getString(envName));
  if (sysConfig.containsKey(propertyName)) return Optional.of(sysConfig.getString(propertyName));
  return Optional.empty();
}
public String getString(String envName, String propertyName, String defaultValue) {
  return getStaticString(envName, propertyName)
      .orElseGet(() -> getStringValue(propertyName, defaultValue));
}
```

`getInt`, `getLong`, `getFloat`, `getBoolean`도 같은 모양입니다. 정리하면 다음 순서입니다.

```text
1. 환경 변수      — ConfVars의 enum 이름       예: ZEPPELIN_SERVER_PORT
2. system property — ConfVars의 varName        예: -Dzeppelin.server.port=…
3. zeppelin-site.xml — loadXMLConfig()가 properties 맵에 채운 값
4. ConfVars의 기본값
```

1번과 2번의 키가 **서로 다른 이름**이라는 점이 실수하기 쉬운 지점입니다. 환경 변수는 `ZEPPELIN_SERVER_PORT`, system property는 `zeppelin.server.port`입니다.

설정 파일은 `ZeppelinLocationStrategy`와 `ClasspathLocationStrategy`를 조합해 `conf/` 경로와 classpath에서 `zeppelin-site.xml`을 찾습니다. 파일이 없으면 예외를 warn 로그로만 남기고 기본값으로 진행합니다.

— [ZeppelinConfiguration.java#L98-L134](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L98-L134), [#L205-L248](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L205-L248) (확인: 2026-09-18)

## 2. 생성자 — Jetty를 구성하지만 시작하지는 않습니다

`new ZeppelinServer(zConf)`는 다음을 준비합니다.

- Prometheus metric이 켜져 있으면 `PrometheusMeterRegistry`를 선택합니다.
- `setupJettyServer()` — `InstrumentedQueuedThreadPool`과 `Server`를 만들고 `initServerConnector()`로 HTTP 또는 HTTPS Connector를 붙입니다.
- HK2의 `shared-locator` ServiceLocator를 생성합니다.
- `ConfigStorage.createConfigStorage(zConf)`로 설정 저장소를 만듭니다.

Connector에 host·port·idle timeout(하드코딩된 30초)이 설정되지만 이 단계에서 소켓이 listen 상태가 되는 것은 아닙니다. 실제 Jetty 시작은 뒤의 `jettyWebServer.start()`에서 일어납니다.

```java
// ZeppelinServer.java L423-L429
int timeout = 1000 * 30;
connector.setIdleTimeout(timeout);
connector.setHost(zConf.getServerAddress());
```

SSL이 켜져 있으면 port는 `zeppelin.server.ssl.port`, 꺼져 있으면 `zeppelin.server.port`를 씁니다. keystore는 PEM 파일(`getPemKeyFile`/`getPemCertFile`)이 모두 지정되어 있으면 PEM 경로를, 아니면 keystore 경로를 사용합니다.

— [ZeppelinServer.java#L147-L158](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L147-L158), [#L381-L430](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L381-L430) (확인: 2026-09-18)

## 3. metrics와 handler tree를 준비합니다

`initMetrics()`는 JMX가 켜져 있으면 `JmxMeterRegistry`를, Prometheus가 켜져 있으면 해당 registry를 등록하고 이어서 ClassLoader·JvmMemory·JvmThread·FileDescriptor·Processor·Uptime·JVMInfo 메트릭을 global registry에 bind합니다.

그 다음 `TimedHandler` → `ContextHandlerCollection` 순서로 Jetty handler tree를 조립하고, HK2에 immediate scope와 `ImmediateErrorHandlerImpl`을 등록합니다. 이 error handler는 7절에서 다시 등장합니다.

— [ZeppelinServer.java#L160-L171](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L160-L171), [#L338-L352](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L338-L352) (확인: 2026-09-18)

## 4. HK2에 서버 서비스를 binding합니다

`ServiceLocatorUtilities.bind()` 안에서 Interpreter, Notebook, 인증·권한, Connection, Job, Plugin, Helium 등의 서비스를 등록합니다. `bindAsContract(...).in(Singleton.class)`는 binding을 Singleton으로 등록한다는 뜻이며, 모든 객체가 이 순간 즉시 생성된다고 단정할 수는 없습니다.

**이 단계가 WebAppContext 구성보다 먼저 와야 하는 이유**는 5절의 `NotebookRepo`와 Notebook 조회가 모두 `sharedServiceLocator`에서 서비스를 꺼내기 때문입니다. binding이 끝나야 그 조회가 성립합니다.

설정에 따라 구현체가 달라지는 지점은 두 곳입니다.

```text
zConf.isZeppelinNotebookCronEnable()
  ├─ true  → QuartzSchedulerService
  └─ false → NoSchedulerService

ConfVars.ZEPPELIN_SEARCH_ENABLE (zeppelin.search.enable, 기본 true)
  ├─ false → NoSearchService
  └─ true
       ├─ zeppelin.search.semantic.enable true  → EmbeddingSearch
       └─ false (기본)                          → LuceneSearch
```

### cron scheduler에는 조건이 하나 더 있습니다

이전 판은 `ZEPPELIN_NOTEBOOK_CRON_ENABLE`만 켜면 `QuartzSchedulerService`가 선택되는 것처럼 적었습니다. 실제 구현은 **AND 조건**입니다.

```java
// ZeppelinConfiguration.java L843-L845
public boolean isZeppelinNotebookCronEnable() {
  return getBoolean(ConfVars.ZEPPELIN_NOTEBOOK_CRON_ENABLE) && isAuthenticationEnabled();
}

// ZeppelinConfiguration.java L620-L627
public String getShiroPath() {
  String shiroPath = getAbsoluteDir(String.format("%s/shiro.ini", getConfDir()));
  return new File(shiroPath).exists() ? shiroPath : StringUtils.EMPTY;
}
public boolean isAuthenticationEnabled() {
  return !StringUtils.isBlank(getShiroPath());
}
```

즉 `zeppelin.notebook.cron.enable=true`로 설정해도 **`conf/shiro.ini` 파일이 존재하지 않으면** `NoSchedulerService`가 binding되고 예약 실행은 동작하지 않습니다. 설정만 보고 "cron을 켰는데 왜 안 도는가"를 조사하면 원인을 찾지 못합니다. 확인 순서는 설정값이 아니라 파일 존재 여부부터입니다.

— [ZeppelinServer.java#L174-L223](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L174-L223), [ZeppelinConfiguration.java#L620-L627](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L620-L627), [#L843-L845](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/conf/ZeppelinConfiguration.java#L843-L845) (확인: 2026-09-18)

## 5. 두 개의 웹 애플리케이션을 구성합니다

`setupWebAppContext()`를 new UI와 classic UI에 대해 각각 호출합니다. 어느 쪽이 root context path를 차지하는지는 `zeppelin.default.ui`(기본 `new`)가 정합니다.

```text
zeppelin.default.ui = new (기본)
  new UI     → zConf.getServerContextPath()   (보통 "/")
  classic UI → "/classic"

zeppelin.default.ui = classic
  new UI     → "/new"
  classic UI → zConf.getServerContextPath()
```

여기서 기본 빌드와 맞물리는 사실이 하나 있습니다. **classic UI 모듈 `zeppelin-web`은 `-Pweb-classic` profile에서만 빌드**되므로 기본 빌드에서는 `zeppelin-web/dist`가 존재하지 않습니다. 그래도 서버가 뜨는 이유는 다음 한 줄입니다.

```java
// ZeppelinServer.java L592
webApp.setThrowUnavailableOnStartupException(shouldExist);
```

`shouldExist`는 "그 UI가 기본 UI인가"입니다. 기본 UI가 아닌 쪽은 WAR가 없어도 시작 예외를 던지지 않습니다. 즉 기본 설정에서 `/classic`은 조용히 동작하지 않는 상태가 됩니다.

`initWebApp()`이 각 context에 붙이는 endpoint는 다음과 같습니다.

| 경로 | 내용 | 붙는 조건 |
| --- | --- | --- |
| `/api/*` | Jersey `ServletContainer` (REST API) | 항상 |
| `/api/*` | `ShiroFilter` + `EnvironmentLoaderListener` | `conf/shiro.ini`가 있을 때만 |
| `/metrics` | `PrometheusServlet` | `promMetricRegistry`가 있을 때만 |
| `/health/readiness` | `HealthCheckServlet` | 항상 |
| `/health/liveness` | `HealthCheckServlet` | 항상 |
| `/ping` | `PingServlet` | 항상 |
| `/ws` | Notebook WebSocket endpoint | 항상 |
| `/index.html` | `IndexHtmlServlet` | 항상 |
| `/*` | `CorsFilter` | 항상 |

`/api/*`의 Shiro 필터도 `conf/shiro.ini` 존재 여부에 달려 있다는 점이 4절의 cron 조건과 같은 뿌리입니다. 이 파일 하나가 **인증·REST 권한·cron scheduler**를 동시에 좌우합니다.

— [ZeppelinServer.java#L225-L236](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L225-L236), [#L556-L643](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L556-L643) (확인: 2026-09-18)

## 6. Notebook 저장소와 시작 시 작업을 준비합니다

웹 context 구성 뒤 `NotebookRepo.init(zConf, noteParser)`를 호출합니다. 현재 소스에서는 이 호출의 `IOException`을 catch해 로그로 남기지만 `startZeppelin()`을 즉시 중단하지 않고 다음 단계로 진행합니다. 따라서 Repository 초기화 실패가 항상 프로세스 종료를 뜻하지는 않습니다.

```java
try {
  repo.init(zConf, noteParser);
} catch (IOException e) {
  LOGGER.error("Failed to init NotebookRepo", e);   // 중단하지 않습니다
}
```

이어서 `initJMX()`가 JMX가 켜져 있으면 Jetty `ConnectorServer`를 bean으로 추가하고, `runNoteOnStart()`가 실행되며, `Runtime.addShutdownHook(new Thread(this::shutdown))`으로 shutdown hook이 등록됩니다.

### `runNoteOnStart()`는 서버를 종료시킬 수도 있습니다

`zeppelin.notebook.run.id`가 설정되어 있으면 해당 Note의 모든 Paragraph를 `runAllParagraphs()`로 실행합니다. 그리고 `zeppelin.notebook.run.autoshutdown`의 **기본값이 `true`**이므로, 실행이 끝나면 그대로 `shutdown(success ? 0 : 1)`을 호출합니다.

```java
// ZeppelinServer.java L451-L466
boolean success = notebookService.runAllParagraphs(noteIdToRun, null, serviceContext, …);
if (zConf.getNotebookRunAutoShutdown()) {
  shutdown(success ? 0 : 1);
}
```

즉 이 설정을 켜면 Zeppelin은 상주 서버가 아니라 **Note 하나를 실행하고 종료하는 batch 실행기**가 됩니다. 실행 주체는 `zeppelin.notebook.run.servicecontext`(base64로 인코딩된 JSON)가 없으면 `AuthenticationInfo.ANONYMOUS`입니다. 일반적인 서버 시작에서는 `zeppelin.notebook.run.id`가 비어 있어 이 경로 전체가 건너뛰어집니다.

그 다음 Notebook·Search·Scheduler를 ServiceLocator에서 직접 요청합니다. Notebook의 lazy 생성을 시작 시점으로 당기는 이유는 Paragraph recovery와 cron 초기화가 첫 사용자 요청까지 지연되지 않게 하기 위해서라고 소스 주석이 밝히고 있습니다. 이후 `notebook.initNotebook()`과 `notebook.recoveryIfNecessary()`를 호출합니다. recovery를 생성자에서 하지 않는 이유도 주석상 deadlock 회피입니다.

— [ZeppelinServer.java#L238-L265](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L238-L265), [#L432-L471](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L432-L471) (확인: 2026-09-18)

## 7. `jettyWebServer.start()`에서 실제 서버를 시작합니다

```text
start() 이전
  └─ 설정·객체·handler·context·Notebook 초기화 준비

start() 호출
  └─ Jetty가 Connector·WebAppContext·Servlet 생명주기를 시작

start() 이후
  └─ construction error 확인 후 join()으로 대기
```

`start()`에서 예외가 나면 `shutdown(-1)`을 호출합니다. `shutdown(int exitCode)`는 `duringShutdown` `AtomicBoolean`으로 중복 실행을 막고, Jetty를 멈춘 뒤 Notebook을 닫습니다. `InterpreterSettingManager`는 **recovery가 꺼져 있을 때만** 닫힙니다. recovery가 켜져 있으면 Interpreter 프로세스를 살려 둔 채 서버만 내려가고, 재시작 시 다시 붙게 됩니다.

```java
// ZeppelinServer.java L361-L366
if (sharedServiceLocator != null) {
  if (!zConf.isRecoveryEnabled()) {
    sharedServiceLocator.getService(InterpreterSettingManager.class).close();
  }
  sharedServiceLocator.getService(Notebook.class).close();
}
```

`exitCode`가 0이 아닐 때만 `System.exit(exitCode)`를 호출합니다.

— [ZeppelinServer.java#L267-L277](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L267-L277), [#L354-L379](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L354-L379) (확인: 2026-09-18)

## 8. 시작 직후 오류를 확인하고 프로세스를 유지합니다

Jetty의 `start()`가 반환되어도 모든 초기화가 성공했다는 뜻은 아닙니다. 뒤에서 `ImmediateErrorHandlerImpl.waitForAtLeastOneConstructionError(5000)`으로 HK2 immediate service의 생성 오류를 최대 5초 기다려 확인합니다. 오류가 있으면 각각 로그로 남기고 `shutdown(-1)`을 호출합니다.

```java
// ZeppelinServer.java L281-L288
List<ErrorData> errorDatas = handler.waitForAtLeastOneConstructionError(5000);
for (ErrorData errorData : errorDatas) {
  LOGGER.error("Error in Construction", errorData.getThrowable());
}
if (!errorDatas.isEmpty()) {
  LOGGER.error("{} error(s) while starting - Termination", errorDatas.size());
  shutdown(-1);
}
```

오류가 없고 Jetty가 stopping/stopped 상태가 아니면 `jettyWebServer.join()`으로 Jetty 생명주기가 끝날 때까지 main thread를 기다립니다. 따라서 서버가 계속 실행되는 이유는 `main()`이 직접 무한 루프를 돌기 때문이 아니라 Jetty의 종료를 기다리기 때문입니다.

— [ZeppelinServer.java#L279-L307](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/server/ZeppelinServer.java#L279-L307) (확인: 2026-09-18)

## 이 흐름에서 가장 헷갈리는 지점

### `new ZeppelinServer()`가 서버를 띄우지 않습니다

생성자는 Jetty 객체와 Connector를 구성할 뿐입니다. HTTP endpoint가 실제로 bind/listen하고 WebAppContext 생명주기를 시작하는 기준점은 `jettyWebServer.start()`입니다.

### `start()`가 반환되어도 성공이 확정되지 않습니다

Jetty start 예외와 별도로 construction error 확인 단계가 있습니다. 시작 성공 여부는 `start()`의 반환만이 아니라 그 뒤 5초의 오류 확인까지 포함해 판단해야 합니다.

### Notebook은 완전히 lazy하지 않습니다

서비스 binding은 지연 생성될 수 있지만 `startZeppelin()`은 Notebook·Search·Scheduler를 직접 요청하고 Notebook 초기화와 recovery를 시작합니다. 첫 페이지를 열 때까지 모든 초기화가 미뤄진다고 이해하면 현재 소스와 맞지 않습니다.

### `conf/shiro.ini` 하나가 세 가지를 동시에 바꿉니다

이 파일의 존재 여부가 `isAuthenticationEnabled()`의 유일한 판정 기준이고, 그 결과가 **REST API의 Shiro 필터**, **cron scheduler 구현체 선택**, 그리고 인증 사용자 식별에 모두 반영됩니다. 세 증상이 함께 나타나면 원인은 대체로 하나입니다.

### 설정을 바꿨는데 반영되지 않으면 우선순위를 봐야 합니다

`zeppelin-site.xml`을 고쳐도 같은 항목의 환경 변수나 `-D` system property가 있으면 그쪽이 이깁니다. 우선순위는 환경 변수 > system property > 설정 파일 > 기본값이며, 앞의 둘은 키 이름 자체가 다릅니다.

## breakpoint 순서

1. `ZeppelinConfiguration.load()` — 설정 확인. 값이 예상과 다르면 `getStaticString()`에 breakpoint를 걸어 어느 소스에서 왔는지 확인합니다.
2. `ZeppelinServer` 생성자 — Jetty·ServiceLocator 확인
3. `ServiceLocatorUtilities.bind()` — SchedulerService·SearchService 구현체 선택 확인
4. `setupWebAppContext()` — 어느 UI가 root를 차지하는지, WAR 경로가 존재하는지 확인
5. `repo.init()` · `notebook.initNotebook()` · `recoveryIfNecessary()` — 저장소와 Notebook 상태 확인
6. `jettyWebServer.start()` — 실제 서버 시작 실패 확인
7. `waitForAtLeastOneConstructionError()` — start 이후 비동기 construction error 확인

## 확인하지 못한 것

- 배포 방식별 최종 classpath와 `ZEPPELIN_RUNNER` 값은 확인하지 않았습니다 — 스크립트의 main class 지정, Java 버전 검사, 실행 경계까지만 추적했습니다.
- `Notebook.initNotebook()` 내부의 비동기 작업 순서는 확인하지 않았습니다 — `ZeppelinServer`가 호출하는 경계까지만 다뤘습니다.
- 실제 construction error 발생 조건은 재현하지 않았습니다 — Zeppelin 프로세스를 실행하지 않고 소스 호출 관계만 확인했습니다.
- `zeppelin.notebook.run.id` batch 실행 경로는 실제로 돌려 보지 않았습니다 — `runNoteOnStart()`의 코드 경로와 기본값만 확인했습니다.
- `isRecoveryEnabled()`가 켜진 상태에서 재시작했을 때 Interpreter 프로세스가 실제로 재연결되는지는 확인하지 않았습니다 — shutdown 분기 코드까지만 읽었습니다.

*작성일: 2026-09-13 · 개정일: 2026-09-18 (커밋 `2f403f36b` → `e816bf1b7` 재대조, 실행 순서·cron 조건 정정)*
