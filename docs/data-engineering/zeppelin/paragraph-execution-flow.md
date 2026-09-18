---
sidebar_position: 3
---

# Apache Zeppelin에서 Paragraph 하나는 어떻게 실행되는가

> 원문 — Apache Zeppelin 소스 커밋 [`e816bf1b7`](https://github.com/apache/zeppelin/tree/e816bf1b76b50282cc32b284cdb8755f932f657e), 레포 내 문서 [docs/usage/interpreter/interpreter_binding_mode.md](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/docs/usage/interpreter/interpreter_binding_mode.md)
>
> 확인 날짜 — 2026-09-18 (릴리스 태그가 아닌 `master`의 위 커밋 기준입니다. 이전 판은 커밋 `2f403f36b` 기준이었고 그 사이 `NotebookServer.java`·`NotebookService.java`가 변경되었습니다.)
>
> 검증 상태 — 로컬 소스 코드를 읽어 호출 관계와 줄 번호를 추적했습니다. Zeppelin을 실제로 실행해 WebSocket 패킷·프로세스 목록·Thrift 통신을 관측하지는 않았습니다.

## 결론부터 말하면

현재 소스의 remote interpreter 경로에서는 사용자가 Paragraph의 Run을 눌러도 Zeppelin 서버 JVM이 사용자 코드를 직접 실행하지 않습니다. 서버는 Paragraph 실행 상태와 `InterpreterContext`를 준비한 뒤, 별도 Interpreter 프로세스에 Thrift RPC로 실행을 요청합니다.

그리고 **scheduler가 두 번 등장합니다.** 이것이 이 흐름에서 가장 오해하기 쉬운 부분입니다.

```text
브라우저
  │ WebSocket: RUN_PARAGRAPH
  ▼
NotebookServer.onMessage()                              L443
  └─ runParagraph()                                     L1618-L1655
       ▼
NotebookService.runParagraph()                          L439-L514
  ├─ Permission.RUNNER 확인
  ├─ text·title·params·config 반영 (personalized 분기 있음)
  ├─ Note 저장
  └─ Note.run(..., blocking=false)                      L774-L785
       ▼
Paragraph.execute()                                     L330-L382
  └─ ① 서버 JVM의 Interpreter scheduler에 제출
       ▼
Paragraph.jobRun()                                      L394-L501
  ├─ Interpreter Setting READY 확인 + Interpreter 권한 재확인
  ├─ form 주입 · InterpreterContext 생성
  └─ interpreter.interpret(script, context)
       ▼
RemoteInterpreter.interpret()                           L204-L245
  ├─ 필요하면 Interpreter JVM 확보
  └─ Thrift interpret(sessionId, className, script, ctx)
       ▼   ── TCP / Thrift 경계 ──
RemoteInterpreterServer.interpret()                     L507-L579
  └─ ② Interpreter JVM 안의 scheduler에 InterpretJob 제출
       후 jobListener.wait(1000) 루프로 완료 대기
       ▼
RemoteInterpreterServer$InterpretJob.jobRun()           L796-L826
  └─ 진짜 interpreter.interpret(script, context)
```

핵심 경계는 다음 네 가지입니다.

- WebSocket 요청은 실행 자체가 아니라 서버에 실행 작업을 등록하는 진입점입니다.
- `Paragraph.execute()`는 Paragraph를 **서버 JVM의** scheduler에 제출하고, 실제 호출은 `jobRun()`에서 일어납니다.
- `RemoteInterpreter`는 서버 JVM의 프록시이며, 실제 언어 런타임은 remote Interpreter 프로세스 뒤에 있습니다.
- `RemoteInterpreterServer.interpret()`조차 직접 실행하지 않습니다. **Interpreter JVM 안에 두 번째 scheduler가 있습니다.**

## 실행 환경과 범위

```text
레포:   /Users/pgt0409/Desktop/git/zeppelin-pgt
브랜치: upstream-master
커밋:   e816bf1b76b50282cc32b284cdb8755f932f657e (2026-09-14)
버전:   0.13.0-SNAPSHOT
확인 날짜: 2026-09-18

범위: NotebookServer.java, NotebookService.java, Note.java, Paragraph.java,
      InterpreterSetting.java, ManagedInterpreterGroup.java,
      RemoteInterpreter.java, RemoteInterpreterProcess.java,
      ExecRemoteInterpreterProcess.java, RemoteInterpreterServer.java,
      RemoteInterpreterEventClient.java,
      RemoteInterpreterService.thrift, RemoteInterpreterEventService.thrift
```

아래 줄 번호는 모두 위 커밋 기준으로 다시 확인한 값입니다. 실행 가능한 Zeppelin 배포본을 기동하지 않았으므로 실제 스레드 이름·포트·PID·실행 시간은 확인하지 않았습니다.

## 1. WebSocket 메시지가 실행 요청으로 분기됩니다

`NotebookServer.onMessage()`는 WebSocket 문자열을 `Message`로 역직렬화한 뒤 `receivedMessage.op`을 기준으로 분기합니다. `RUN_PARAGRAPH`를 받으면 `runParagraph(conn, context, receivedMessage)`를 호출합니다.

```java
// NotebookServer.java L443-L445
case RUN_PARAGRAPH:
  runParagraph(conn, context, receivedMessage);
  break;
```

메시지에서 읽는 필드는 `id`(paragraphId), `paragraph`(본문), `title`, `params`, `config`입니다. noteId는 메시지가 아니라 **연결 자체**에서 가져옵니다(`connectionManager.getAssociatedNoteId(conn)`). 따라서 메시지가 곧바로 Interpreter에 전달되는 것이 아니라 Note·인증 정보·권한·Paragraph가 서버에서 먼저 결합됩니다.

### 성공 콜백에서 Paragraph가 하나 추가될 수 있습니다

`onSuccess` 안에 UI 편의 로직이 들어 있습니다. 실행한 Paragraph가 **Note의 마지막 Paragraph이고 본문이 비어 있지 않으면** 새 Paragraph를 하나 추가하고 브로드캐스트합니다.

```java
// NotebookServer.java L1642-L1649
boolean isTheLastParagraph = p.getNote().isLastParagraph(paragraphId);
if (!(StringUtils.isEmpty(p.getText()) || StringUtils.isEmpty(p.getScriptText()))
    && isTheLastParagraph) {
  Paragraph newPara = p.getNote().addNewParagraph(p.getAuthenticationInfo());
  broadcastNewParagraph(p.getNote(), newPara, fromMessage.msgId);
}
```

즉 "마지막 칸을 실행하면 빈 칸이 하나 생긴다"는 UI 동작은 프런트엔드가 아니라 서버의 이 분기에서 나옵니다.

— [NotebookServer.java#L1618-L1655](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/socket/NotebookServer.java#L1618-L1655) (확인: 2026-09-18)

## 2. `NotebookService`가 실행 전 상태를 확정합니다

`NotebookService.runParagraph()`는 다음 순서로 확인하고 갱신합니다.

1. `note == null` — 로그만 남기고 `false` 반환
2. `checkPermission(..., Permission.RUNNER, ...)` — 실패 시 `false`
3. Paragraph 존재 확인 — 없으면 `ParagraphNotFoundException`으로 `onFailure`
4. `failIfDisabled && !p.isEnabled()` — WebSocket 경로는 `failIfDisabled=false`로 호출되므로 이 분기를 타지 않습니다
5. 본문·제목·인증 정보·params·config 반영
6. `notebook.saveNote()` → `note.run(..., blocking, user)` → `callback.onSuccess()`

### personalized mode는 두 번 갱신합니다

Note가 personalized mode이면 master Paragraph와 사용자별 Paragraph를 나눠 다룹니다.

```java
// NotebookService.java L473-L499 (요약)
if (!note.isPersonalizedMode()
    || authorizationService.isOwner(note.getId(), context.getUserAndRoles())) {
  // 소유자이거나 personalized가 아닐 때만 master Paragraph를 갱신
  p.setText(text); p.setTitle(title); …
}
if (note.isPersonalizedMode()) {
  p = p.getUserParagraph(context.getAutheInfo().getUser());
  p.setText(text); p.setTitle(title); …
}
```

주석에 따르면 의도는 "새 사용자가 소유자의 변경을 물려받되, 비소유자의 변경은 자기 사본에만 남게 한다"입니다.

### 예외가 나면 callback이 호출되지 않습니다

`note.run()`이 던진 예외는 `callback.onFailure`로 가지 않습니다. Paragraph의 결과와 상태를 직접 `ERROR`로 설정하고 `false`를 반환합니다.

```java
// NotebookService.java L506-L513
} catch (Exception ex) {
  LOGGER.error("Exception from run", ex);
  p.setReturn(new InterpreterResult(InterpreterResult.Code.ERROR, ex.getMessage()), ex);
  p.setStatus(Job.Status.ERROR);
  // don't call callback.onFailure, we just need to display the error message
  // in paragraph result section instead of pop up the error window.
  return false;
}
```

따라서 **오류 팝업이 뜨지 않았다는 것이 실행이 성공했다는 뜻이 아닙니다.** 결과 영역에만 표시되는 실패 경로가 따로 있습니다.

### `blocking=false`의 의미

WebSocket 경로는 `blocking=false`로 호출됩니다. 따라서 `onSuccess` 호출은 사용자 코드가 성공적으로 끝났다는 뜻이 아니라, 실행 요청을 등록하는 서비스 호출이 성공했다는 뜻으로 해석해야 합니다. 사용자 코드의 최종 `FINISHED`·`ERROR` 상태는 이후 Paragraph 작업과 listener를 통해 반영됩니다.

— [NotebookService.java#L439-L514](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/service/NotebookService.java#L439-L514) (확인: 2026-09-18)

## 3. `Paragraph.execute()`가 서버 JVM의 scheduler에 제출합니다

`Note.run()`은 personalized mode이면 사용자별 Paragraph로 바꾼 뒤 listener를 설정하고 `p.execute(interpreterGroupId, blocking)`을 호출합니다.

```java
// Note.java L774-L785
public boolean run(String paragraphId, String interpreterGroupId,
                   boolean blocking, String ctxUser) {
  Paragraph p = getParagraph(paragraphId);
  if (isPersonalizedMode() && ctxUser != null)
    p = p.getUserParagraph(ctxUser);
  p.setListener(this.paragraphJobListener);
  return p.execute(interpreterGroupId, blocking);
}
```

`Paragraph.execute()`는 Interpreter를 찾고 Interpreter Setting의 config를 병합한 뒤 이전 결과를 지우고 상태를 `PENDING`으로 바꿉니다.

```java
// Paragraph.java L341-L360 (요약)
setResult(null);
cleanOutputBuffer();
cleanRuntimeInfos();
setStatus(Status.PENDING);

if (shouldSkipRunParagraph()) {          // 빈 Paragraph
  setStatus(Job.Status.FINISHED);
  return true;
}
if (isEnabled()) {
  interpreter.getScheduler().submit(this);
} else {                                  // 비활성화된 Paragraph
  setStatus(Job.Status.FINISHED);
  return true;
}
```

빈 Paragraph나 비활성화된 Paragraph는 Interpreter를 호출하지 않고 `FINISHED`로 끝납니다. **즉 `FINISHED`가 반드시 "코드가 돌았다"는 뜻은 아닙니다.**

`blocking=true`인 경우의 대기는 100ms 폴링 루프입니다.

```java
// Paragraph.java L363-L374
if (blocking) {
  while (!getStatus().isCompleted()) {
    Thread.sleep(100);
  }
  return getStatus() == Status.FINISHED;
} else {
  return true;
}
```

WebSocket 경로의 `blocking=false`에서는 제출 직후 `true`를 반환합니다.

— [Note.java#L774-L785](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/notebook/Note.java#L774-L785), [Paragraph.java#L330-L382](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/notebook/Paragraph.java#L330-L382) (확인: 2026-09-18)

## 4. `jobRun()`에서 실행 컨텍스트와 script를 만듭니다

Scheduler가 Paragraph 작업을 실행하면 `Paragraph.jobRun()`이 호출됩니다.

### 권한 검사가 여기서 한 번 더 있습니다

2절의 `Permission.RUNNER`는 **Note에 대한** 권한입니다. `jobRun()`에는 **Interpreter Setting에 대한** 별도 검사가 있습니다.

```java
// Paragraph.java L408-L420
if (interpreterSetting.getStatus() != InterpreterSetting.Status.READY) {
  throw new RuntimeException(String.format(
      "Interpreter Setting '%s' is not ready, its status is %s",
      interpreterSetting.getName(), interpreterSetting.getStatus()));
}
if (this.user != null) {
  if (subject != null && !interpreterSetting.isUserAuthorized(subject.getUsersAndRoles())) {
    return new InterpreterResult(Code.ERROR,
        String.format("%s has no permission for %s", subject.getUser(), intpText));
  }
}
```

두 검사는 시점도 실패 방식도 다릅니다. Note 권한 실패는 즉시 `false` 반환이고, Interpreter 권한 실패는 scheduler 실행 중의 `InterpreterResult(ERROR)`입니다.

### form 주입과 Context 생성

`form=simple`이면 본문에서 입력값을 추출해 Note·Paragraph 파라미터로 치환합니다. 그다음 `InterpreterContext`를 만듭니다. Context에는 Note·Paragraph 정보, 사용자 인증, local properties, GUI, Angular object registry, ResourcePool 등이 포함됩니다.

```java
// Paragraph.java L457-L475 (요약)
InterpreterContext context = getInterpreterContext();
InterpreterContext.set(context);

boolean shouldInjectCredentials = …;   // Constants.INJECT_CREDENTIALS
if (shouldInjectCredentials) {
  CredentialInjector credinjector = new CredentialInjector(creds);
  String code = credinjector.replaceCredentials(script);
  ret = interpreter.interpret(code, context);
  ret = credinjector.hidePasswords(ret);
} else {
  ret = interpreter.interpret(script, context);
}
```

Credential injection 여부는 Interpreter property와 Paragraph local property 양쪽에서 읽으며, local property가 우선합니다. 반환 결과에서는 비밀번호를 가립니다.

따라서 Paragraph는 단순한 문자열 실행기가 아닙니다. 실행 주체·Note·Paragraph·GUI·credential 정보가 실행 직전에 Context로 묶입니다.

— [Paragraph.java#L394-L501](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/notebook/Paragraph.java#L394-L501) (확인: 2026-09-18)

## 5. 필요하면 Interpreter 프로세스를 확보합니다

`RemoteInterpreter.interpret()`은 먼저 `getOrCreateInterpreterProcess()`를 호출합니다. 이미 프로세스 핸들이 있으면 재사용하고, 없으면 `ManagedInterpreterGroup`에 생성을 위임합니다.

```java
// RemoteInterpreter.java L214-L222
try {
  interpreterProcess = getOrCreateInterpreterProcess();
} catch (IOException e) {
  throw new InterpreterException(e);
}
if (!interpreterProcess.isRunning()) {
  return new InterpreterResult(InterpreterResult.Code.ERROR,
          "Interpreter process is not running\n" + interpreterProcess.getErrorMessage());
}
```

### binding mode는 여기가 아니라 식별자 계산에서 갈립니다 — 이전 판의 미확인 항목

이전 판은 "`ManagedInterpreterGroup.getOrCreateInterpreterProcess()` 내부의 binding mode 분기는 확인하지 않았다"고 남겨 두었습니다. 확인 결과 **그 메서드에는 binding mode 분기가 아예 없습니다.** group 하나당 프로세스는 언제나 하나입니다.

```java
// ManagedInterpreterGroup.java L69-L83
synchronized (interpreterProcessCreationLock) {
  if (remoteInterpreterProcess == null) {
    remoteInterpreterProcess = interpreterSetting.createInterpreterProcess(id, userName, properties);
    remoteInterpreterProcess.start(userName);
    remoteInterpreterProcess.init(zConf, …);
    getInterpreterSetting().getRecoveryStorage().onInterpreterClientStart(remoteInterpreterProcess);
  }
  return remoteInterpreterProcess;
}
```

분기는 그보다 위, **`InterpreterSetting`이 두 개의 식별자를 계산하는 지점**에 있습니다.

```java
// InterpreterSetting.java L405-L431 — 어떤 JVM인가
if (getOption().isIsolated()) {
  if (option.perUserIsolated()) keys.add(executionContext.getUser());
  if (option.perNoteIsolated()) keys.add(executionContext.getNoteId());
} else {
  keys.add(SHARED_PROCESS);          // "shared_process"
}
return id + "-" + StringUtils.join(keys, "-");

// InterpreterSetting.java L433-L448 — 그 JVM 안 어떤 session인가
if (option.perNoteScoped() && option.perUserScoped()) key = user + ":" + noteId;
else if (option.perUserScoped())                      key = user;
else if (option.perNoteScoped())                      key = noteId;
else                                                  key = SHARED_SESSION;  // "shared_session"
```

정리하면 다음과 같습니다.

| mode | group id | session id | 결과 |
| --- | --- | --- | --- |
| `shared` | `<id>-shared_process` | `shared_session` | JVM 1개, session 1개 |
| `scoped` | `<id>-shared_process` | `<user>` 또는 `<noteId>` 또는 `<user>:<noteId>` | **JVM 1개**, session 여러 개 |
| `isolated` | `<id>-<user>` / `<id>-<noteId>` | 위와 동일 | JVM 여러 개 |

`isolated`는 group id가 달라지므로 서로 다른 `ManagedInterpreterGroup` 객체가 되고, 그래서 프로세스가 갈립니다. `scoped`는 group id가 같으므로 **프로세스 격리가 아닙니다.**

이 `sessionId`는 `createInterpreters()`에서 `RemoteInterpreter` 생성자로 전달되고, 다음 절의 Thrift 호출 첫 인자로 그대로 나갑니다. 즉 6절에서 보이는 `sessionId`의 정체가 바로 이 값입니다.

— [RemoteInterpreter.java#L100-L107](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreter.java#L100-L107), [ManagedInterpreterGroup.java#L66-L91](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/ManagedInterpreterGroup.java#L66-L91), [InterpreterSetting.java#L405-L448](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/InterpreterSetting.java#L405-L448), [#L831-L845](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/InterpreterSetting.java#L831-L845) (확인: 2026-09-18)

## 6. 서버 JVM에서 Thrift `interpret()`을 호출합니다

프로세스가 실행 중이면 서버는 `RemoteInterpreterProcess.callRemoteFunction()`을 통해 다음 RPC를 호출합니다.

```thrift
// RemoteInterpreterService.thrift L100
RemoteInterpreterResult interpret(
  1: string sessionId,
  2: string className,
  3: string st,
  4: RemoteInterpreterContext interpreterContext
) throws (1: InterpreterRPCException ex);
```

> **이전 판 정정** — 이전 판은 이 선언의 위치를 `RemoteInterpreterService.thrift#L8-L18`로 인용했습니다. 그 범위는 Apache 라이선스 헤더입니다. 실제 `service RemoteInterpreterService` 블록은 L93부터이고 `interpret()`은 **L100**입니다.

서버가 보내는 것은 script 문자열만이 아닙니다. 5절에서 계산된 `sessionId`, Interpreter class name, 변환된 `InterpreterContext`가 함께 나갑니다. 반환값에는 실행 결과뿐 아니라 원격에서 갱신된 `config`와 `gui`/`noteGui`도 들어 있고, 서버는 이것으로 로컬 Context를 덮어씁니다.

Thrift client는 Interpreter 프로세스의 host·port에 `TSocket`과 `TBinaryProtocol`로 연결합니다. 그리고 매번 새로 연결하는 것이 아니라 **`PooledRemoteClient`로 풀링**합니다.

```java
// RemoteInterpreterProcess.java L60-L69
this.remoteClient = new PooledRemoteClient<>(() -> {
  TSocket transport = new TSocket(getHost(), getPort());
  transport.open();
  TProtocol protocol = new TBinaryProtocol(transport);
  return new Client(protocol);
}, connectionPoolSize);
```

따라서 이 경로의 실행 통신은 HTTP 요청이 아니라 별도의 Thrift TCP 연결이고, 연결 수는 `connectionPoolSize`로 제한됩니다.

— [RemoteInterpreter.java#L204-L245](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreter.java#L204-L245), [RemoteInterpreterProcess.java#L51-L70](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterProcess.java#L51-L70), [RemoteInterpreterService.thrift#L93-L104](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-interpreter/src/main/thrift/RemoteInterpreterService.thrift#L93-L104) (확인: 2026-09-18)

## 7. 새 Interpreter JVM은 서버에 스스로 등록합니다

로컬 실행 방식에서 `ExecRemoteInterpreterProcess.start()`는 `interpreterRunner`를 실행하며 다음 인자를 넘깁니다.

```text
-d <interpreter dir>          getInterpreterDir()
-c <event server host>        getIntpEventServerHost()
-p <event server port>        intpEventServerPort
-r <port range>               getInterpreterPortRange()
-i <interpreter group id>     getInterpreterGroupId()
-u <user>                     impersonation이 켜져 있고 anonymous가 아닐 때만
-l <local repo dir>           getLocalRepoDir()
-g <interpreter setting name> getInterpreterSettingName()
```

launch 후에는 `waitForReady(getConnectTimeout())`로 기다리고, timeout이면 `zeppelin.interpreter.connect.timeout`을 올리라는 안내가 포함된 `IOException`을 던집니다.

### 등록은 비동기이고, 실패하면 프로세스가 스스로 내려갑니다

Interpreter 프로세스 안의 `RemoteInterpreterServer`는 별도 `RegisterRunnable` 스레드에서 등록을 진행합니다. 자기 Thrift 서버가 실제로 serving 상태가 될 때까지 1초 간격으로 기다린 뒤 등록합니다.

```java
// RemoteInterpreterServer.java L584-L610 (요약)
while (!Thread.currentThread().isInterrupted() && server != null && !server.isServing()) {
  Thread.sleep(1000);
}
RegisterInfo registerInfo = new RegisterInfo(host, port, interpreterGroupId);
try {
  intpEventClient = new RemoteInterpreterEventClient(intpEventServerHost, intpEventServerPort, 10);
  intpEventClient.registerInterpreterProcess(registerInfo);
} catch (Exception e) {
  LOGGER.error("Error while registering interpreter: {}, cause: {}", registerInfo, e);
  shutdown();                 // 등록 실패 = 프로세스 종료
}
```

이 등록으로 서버는 RPC를 받을 host·port를 알게 됩니다. **방향에 주의해야 합니다.** 서버가 Interpreter를 찾아가는 것이 아니라 Interpreter가 서버의 event server 포트로 찾아옵니다. 그래서 event server host·port를 프로세스 인자(`-c`, `-p`)로 넘기는 것입니다.

이후 서버는 `init()`, `createInterpreter()`, `open()`을 호출한 뒤 `interpret()`을 호출합니다.

— [ExecRemoteInterpreterProcess.java#L62-L109](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/ExecRemoteInterpreterProcess.java#L62-L109), [RemoteInterpreterServer.java#L581-L610](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-interpreter/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterServer.java#L581-L610) (확인: 2026-09-18)

## 8. 원격 서버에는 두 번째 scheduler가 있습니다

여기가 이전 판에서 가장 크게 단순화되어 있던 부분입니다. 이전 판은 `RemoteInterpreterServer.interpret()`이 "실제 `Interpreter.interpret()`를 호출한다"고만 적었습니다. 실제로는 **직접 호출하지 않습니다.**

```java
// RemoteInterpreterServer.java L537-L559 (요약)
Scheduler scheduler = intp.getScheduler();
InterpretJobListener jobListener = new InterpretJobListener();
interpretJob = new InterpretJob(context.getParagraphId(),
        "RemoteInterpretJob_" + System.currentTimeMillis(),
        jobListener, intp, st, context);
runningJobs.put(context.getParagraphId(), interpretJob);
scheduler.submit(interpretJob);

while (!interpretJob.isTerminated()) {
  synchronized (jobListener) {
    jobListener.wait(1000);
  }
}
```

Thrift 호출 스레드는 `InterpretJob`을 제출한 뒤 **1초 단위로 깨어나며 완료를 기다립니다.** 그동안 실제 실행은 Interpreter 프로세스 안의 scheduler 스레드에서 진행됩니다.

진짜 호출은 `InterpretJob.jobRun()` 안에 있고, 그 앞뒤로 interpreter hook이 처리됩니다.

```java
// RemoteInterpreterServer.java L823-L826
processInterpreterHooks(context.getNoteId());
processInterpreterHooks(null);
result = interpreter.interpret(script, context);
```

전체 그림은 다음과 같습니다.

```text
서버 JVM
  Paragraph.execute()
    └─ scheduler ①  (서버 JVM)
         └─ Paragraph.jobRun()
              └─ RemoteInterpreter.interpret()
                   └─ Thrift client.interpret(sessionId, …)
                         │ TCP / Thrift
                         ▼
Interpreter JVM
  RemoteInterpreterServer.interpret()
    └─ scheduler ②  (Interpreter JVM)  ← 이 계층이 이전 판에 없었습니다
         └─ InterpretJob.jobRun()
              ├─ interpreter hooks
              └─ 실제 Interpreter.interpret(script, context)
                   └─ InterpreterResult
```

**왜 이 구조가 중요한가.** scheduler가 두 개라는 것은 Paragraph가 큐에서 대기할 수 있는 지점도 두 곳이라는 뜻입니다. 서버에서 `PENDING`으로 보이는 Paragraph와 Interpreter 프로세스 안에서 대기 중인 job은 다른 큐입니다. 실행이 밀릴 때 어느 쪽 scheduler가 막혔는지 구분해야 합니다.

또 `runningJobs` 맵은 paragraphId를 키로 job을 보관하며, 완료 후 `resultCacheInSeconds` 뒤에 제거됩니다. `isRecover=true`로 들어온 요청은 새 job을 만들지 않고 이 맵에서 기존 job을 찾으며, 이미 사라졌으면 `"Job is finished, unable to recover it"` 오류를 반환합니다.

— [RemoteInterpreterServer.java#L507-L579](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-interpreter/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterServer.java#L507-L579), [#L796-L830](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-interpreter/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterServer.java#L796-L830) (확인: 2026-09-18)

## 9. 최종 결과와 중간 출력은 다른 경로입니다

최종 실행 결과는 `RemoteInterpreterService.interpret()`의 반환값으로 서버에 돌아옵니다. 반면 실행 중간 출력은 Interpreter가 서버의 `RemoteInterpreterEventService`를 별도로 호출해 전달합니다.

```text
최종 결과
  서버 → interpret() RPC → Interpreter          (서버가 client)
  서버 ← RemoteInterpreterResult ← Interpreter

중간 출력
  Interpreter
    → RemoteInterpreterEventService.appendOutput()   (Interpreter가 client)
    → Zeppelin 서버의 RemoteInterpreterEventServer
    → Paragraph output 갱신
    → WebSocket으로 브라우저에 전파
```

event service에는 출력 계열 외에도 등록·recovery·Paragraph 재실행 요청이 함께 정의되어 있습니다.

```thrift
// RemoteInterpreterEventService.thrift L111-L125
service RemoteInterpreterEventService {
  void registerInterpreterProcess(1: RegisterInfo registerInfo) …
  void unRegisterInterpreterProcess(1: string intpGroupId) …
  void appendOutput(1: OutputAppendEvent event) …
  void updateOutput(1: OutputUpdateEvent event) …
  void updateAllOutput(1: OutputUpdateAllEvent event) …
  void checkpointOutput(1: string noteId, 2: string paragraphId) …
  void runParagraphs(1: RunParagraphsEvent event) …
}
```

따라서 "모든 결과가 실행 종료 후 한 번에 내려온다"는 모델은 중간 출력을 설명하지 못합니다. 정확한 모델은 **최종 결과는 `interpret()` 응답으로, 중간 출력과 일부 상태 이벤트는 반대 방향 event RPC로 전달된다**는 것입니다.

### personalized mode에서 streaming 출력은 브로드캐스트되지 않습니다

이전 판 작성 이후 이 부분이 변경되었습니다. 현재 `NotebookServer.onOutputAppend()`·`onOutputUpdated()`·`onOutputClear()`는 Note가 personalized mode이면 **아무것도 하지 않고 반환합니다.**

```java
// NotebookServer.java onOutputUpdated (요약)
if (note.isPersonalizedMode()) {
  // Streaming events carry no owner. The shared outputBuffer is what checkpointOutput
  // saves as the shared result and what other users' paragraphs are cloned from, so
  // one user's output must not be written there.
  return null;
}
note.getParagraph(paragraphId).updateOutputBuffer(index, type, output);
connectionManager.broadcast(noteId, msg);
```

이유는 주석대로입니다. streaming event에는 실행 주체 정보가 없으므로, 공유 `outputBuffer`에 기록하면 한 사용자의 출력이 다른 사용자의 Paragraph 사본으로 새어 나갑니다. 그 대가로 personalized mode에서는 실시간 중간 출력이 보이지 않고 최종 결과만 표시됩니다.

— [RemoteInterpreterEventService.thrift#L111-L125](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-interpreter/src/main/thrift/RemoteInterpreterEventService.thrift#L111-L125), [RemoteInterpreterEventClient.java#L224-L235](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-interpreter/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterEventClient.java#L224-L235), [NotebookServer.java#L1767-L1850](https://github.com/apache/zeppelin/blob/e816bf1b76b50282cc32b284cdb8755f932f657e/zeppelin-server/src/main/java/org/apache/zeppelin/socket/NotebookServer.java#L1767-L1850) (확인: 2026-09-18)

## 이 흐름에서 가장 헷갈리는 지점

### scheduler는 하나가 아니라 둘입니다

서버 JVM과 Interpreter JVM에 각각 있습니다. Paragraph가 오래 걸릴 때 "코드가 느린 것"과 "큐에서 대기 중인 것"을 구분하려면 어느 쪽 scheduler인지부터 확인해야 합니다.

### `runParagraph()`의 성공과 사용자 코드의 성공은 다릅니다

WebSocket 경로는 `blocking=false`로 실행을 등록합니다. 게다가 `note.run()`의 예외는 `onFailure`를 호출하지 않고 Paragraph 상태만 `ERROR`로 바꿉니다. 콜백만 보고 판단하면 안 됩니다.

### `FINISHED`가 "코드가 실행됐다"는 뜻은 아닙니다

빈 Paragraph와 비활성화된 Paragraph는 Interpreter를 호출하지 않고 곧바로 `FINISHED`가 됩니다.

### `scoped`는 프로세스 격리가 아닙니다

group id가 `shared_process`로 같기 때문입니다. `scoped`가 나누는 것은 session id뿐이고 JVM은 공유됩니다. 프로세스 장애 격리가 필요하면 `isolated`를 써야 합니다.

### 권한 검사는 두 곳에 있습니다

Note에 대한 `Permission.RUNNER`는 `NotebookService`에서, Interpreter Setting에 대한 `isUserAuthorized`는 `Paragraph.jobRun()`에서 검사합니다. 실패 시점과 오류 표시 방식이 다릅니다.

### 서버와 Interpreter 통신은 단방향 요청-응답만이 아닙니다

실행 요청과 최종 결과는 서버가 Interpreter를 호출하는 방향이고, 프로세스 등록과 중간 출력은 Interpreter가 서버 event service를 호출하는 방향입니다. 장애 조사에서는 양쪽 포트와 로그를 모두 확인해야 합니다.

## 코드 추적을 다시 시작할 때의 breakpoint 순서

1. `NotebookServer.runParagraph()` — WebSocket 메시지의 진입점 (L1618)
2. `NotebookService.runParagraph()` — 권한·저장·blocking 설정 (L439)
3. `Note.run()` — Paragraph 실행 제출 (L774)
4. `Paragraph.execute()` — `PENDING` 전환과 **scheduler ①** 제출 (L330)
5. `Paragraph.jobRun()` — Interpreter 권한 재확인, Context와 최종 script 생성 (L394)
6. `InterpreterSetting.getInterpreterGroupId()` / `getInterpreterSessionId()` — binding mode 확인 (L405 / L433)
7. `RemoteInterpreter.interpret()` — 프로세스 확보와 RPC 호출 (L204)
8. `ExecRemoteInterpreterProcess.start()` — 로컬 Interpreter 프로세스 생성 (L62)
9. `RemoteInterpreterServer.interpret()` — **scheduler ②** 제출과 대기 루프 (L507)
10. `RemoteInterpreterServer$InterpretJob.jobRun()` — 실제 실행 (L796)
11. `RemoteInterpreterEventClient.onInterpreterOutputAppend()` — 중간 출력의 역방향 전달 (L224)

이 순서로 보면 WebSocket은 작업을 등록하고, 서버 scheduler가 RPC를 보내고, Interpreter JVM의 scheduler가 코드를 실행하며, 최종 결과와 중간 출력이 서로 다른 Thrift 경로로 돌아온다는 구조가 드러납니다.

## 확인하지 못한 것

- 실제 브라우저가 보내는 `RUN_PARAGRAPH` JSON 전체 필드는 확인하지 않았습니다 — 서버가 읽는 `id`·`paragraph`·`title`·`params`·`config`까지만 코드에서 확인했습니다.
- 특정 Interpreter 구현체의 전체 reflection·session 초기화 경로는 확인하지 않았습니다 — 서버와 원격 Interpreter 사이의 RPC 경계에 초점을 맞췄습니다.
- 두 scheduler의 구현체(`FIFOScheduler`·`ParallelScheduler` 등)와 동시 실행 수 설정은 추적하지 않았습니다 — `getScheduler().submit()` 경계까지만 확인했습니다.
- 실제 WebSocket 메시지·Thrift 포트·프로세스 생성 시각·중간 출력 도착 순서는 재현하지 않았습니다 — 로컬 배포본을 기동하지 않았습니다.
- `isRecover=true` 복구 경로가 실제로 동작하는 조건은 재현하지 않았습니다 — `runningJobs` 조회 코드까지만 읽었습니다.
- K8s·Docker 실행 방식(`ExecRemoteInterpreterProcess` 외의 launcher)은 다루지 않았습니다 — 로컬 프로세스 실행 경로만 확인했습니다.

*작성일: 2026-09-13 · 개정일: 2026-09-18 (커밋 `2f403f36b` → `e816bf1b7` 재대조, thrift 인용 정정, Interpreter JVM scheduler 계층 추가, binding mode 미확인 항목 해소)*
