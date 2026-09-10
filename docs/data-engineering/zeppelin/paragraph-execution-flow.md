---
sidebar_position: 3
---

# Apache Zeppelin에서 Paragraph 하나는 어떻게 실행되는가

> 원문 — [Interpreter overview](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html), [Interpreter binding mode](https://zeppelin.apache.org/docs/latest/usage/interpreter/interpreter_binding_mode.html), Apache Zeppelin 소스 커밋 [`2f403f36b1b23183e2cff31b4024d9b85173bfb2`](https://github.com/apache/zeppelin/tree/2f403f36b1b23183e2cff31b4024d9b85173bfb2)
>
> 확인 날짜 — 2026-09-10 (소스 커밋 `2f403f36b1b23183e2cff31b4024d9b85173bfb2` 기준)
>
> 검증 상태 — 공식 문서와 로컬 소스 코드를 읽어 호출 관계를 추적했습니다. Zeppelin을 실제로 실행해 WebSocket 패킷, 프로세스 목록, Thrift 통신을 관측하지는 않았습니다.

## 결론부터 말하면

사용자가 Paragraph의 Run을 누르면 Zeppelin 서버가 코드를 직접 실행하는 것이 아닙니다. 서버는 Paragraph의 실행 상태와 `InterpreterContext`를 준비한 뒤, 별도 Interpreter 프로세스에 Thrift RPC로 코드를 전달합니다.

```text
브라우저
  │ WebSocket: RUN_PARAGRAPH
  ▼
NotebookServer.onMessage()
  └─ runParagraph()
       ▼
NotebookService.runParagraph()
  ├─ 권한·Paragraph 확인
  ├─ text·title·params·config 반영
  ├─ Note 저장
  └─ Note.run(..., blocking=false)
       ▼
Paragraph.execute()
  └─ Interpreter scheduler에 Paragraph 제출
       ▼
Paragraph.jobRun()
  ├─ InterpreterContext 생성
  └─ interpreter.interpret(script, context)
       ▼
RemoteInterpreter.interpret()
  ├─ 필요한 경우 Interpreter JVM 확보
  └─ Thrift RemoteInterpreterService.interpret()
       ▼
RemoteInterpreterServer.interpret()
  └─ 실제 Interpreter.interpret()
```

이 구조에서 가장 중요한 경계는 세 가지입니다.

- WebSocket 요청은 실행 자체가 아니라 서버에 실행 작업을 등록하는 진입점입니다.
- `Paragraph.execute()`는 `Paragraph`를 Interpreter의 scheduler에 제출합니다. 실제 사용자 코드는 `jobRun()` 안에서 실행됩니다.
- `RemoteInterpreter`는 서버 JVM의 프록시이고, 실제 언어 런타임은 별도 JVM의 `RemoteInterpreterServer` 뒤에 있습니다.

Apache Zeppelin 공식 문서도 Interpreter를 특정 언어나 데이터 처리 백엔드를 연결하는 플러그인으로 설명하고, Interpreter group이 하나의 JVM 프로세스에서 동작한다고 설명합니다. [Interpreter overview](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html) (확인: 2026-09-10)

> An interpreter is a plug-in which enables Zeppelin users to use a specific language/data-processing-backend.
>
> **번역** — Interpreter는 Zeppelin 사용자가 특정 언어나 데이터 처리 백엔드를 사용할 수 있게 하는 플러그인입니다.
>
> — [Interpreter overview](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html) (확인: 2026-09-10)

## 실행 환경

이번 문서는 `/Users/pgt0409/Desktop/git/zeppelin`의 다음 상태를 읽어 작성했습니다.

```text
commit: 2f403f36b1b23183e2cff31b4024d9b85173bfb2
확인 날짜: 2026-09-10
확인 범위:
  zeppelin-server/src/main/java/org/apache/zeppelin/socket/NotebookServer.java
  zeppelin-server/src/main/java/org/apache/zeppelin/service/NotebookService.java
  zeppelin-server/src/main/java/org/apache/zeppelin/notebook/Note.java
  zeppelin-server/src/main/java/org/apache/zeppelin/notebook/Paragraph.java
  zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreter.java
  zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/ExecRemoteInterpreterProcess.java
  zeppelin-interpreter/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterServer.java
  zeppelin-interpreter/src/main/thrift/RemoteInterpreterService.thrift
  zeppelin-interpreter/src/main/thrift/RemoteInterpreterEventService.thrift
```

아래의 호출 관계와 코드 인용은 이 소스 상태를 기준으로 합니다. 실행 가능한 Zeppelin 배포본을 기동하지 않았으므로 실제 스레드 이름, 포트, 프로세스 PID, 실행 시간은 확인하지 않았습니다.

## 1. WebSocket 메시지가 실행 요청으로 분기된다

`NotebookServer.onMessage()`는 WebSocket 문자열을 `Message`로 역직렬화한 뒤 `receivedMessage.op`을 기준으로 작업을 분기합니다. `RUN_PARAGRAPH`를 받으면 `runParagraph(conn, context, receivedMessage)`를 호출합니다.

```java
case RUN_PARAGRAPH:
  runParagraph(conn, context, receivedMessage);
  break;
```

이 메서드는 메시지에서 다음 값을 꺼냅니다.

- `id` — Paragraph ID
- `paragraph` — 실행할 본문
- `title` — Paragraph 제목
- `params` — GUI 또는 form 파라미터
- `config` — Paragraph 실행 설정

Note ID는 메시지 자체보다 해당 WebSocket 연결이 연결된 Note에서 얻습니다. 그 다음 서버는 `Notebook.processNote()`로 Note를 찾고 `NotebookService.runParagraph()`를 호출합니다.

따라서 WebSocket 메시지가 곧바로 Interpreter에 전달되는 것은 아닙니다. 연결된 Note, 인증 정보, 권한, Paragraph 객체를 서버가 먼저 결합합니다.

— [NotebookServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/socket/NotebookServer.java#L1620-L1649) (확인: 2026-09-10)

## 2. `NotebookService`가 실행 전 상태를 확정한다

`NotebookService.runParagraph()`는 실행하기 전에 다음을 확인합니다.

1. Note가 존재하는지 확인합니다.
2. 사용자가 해당 Note를 실행할 권한(`Permission.RUNNER`)이 있는지 확인합니다.
3. Paragraph가 존재하는지 확인합니다.
4. 필요한 경우 Paragraph의 본문·제목·파라미터·설정을 갱신합니다.
5. Note를 저장합니다.
6. `note.run(..., blocking, user)`를 호출합니다.

현재 WebSocket 경로는 `blocking=false`로 호출됩니다. 그러므로 요청 처리 스레드가 Interpreter 실행이 끝날 때까지 기다리는 구조가 아닙니다. `runParagraph()`는 실행을 등록한 뒤 callback을 통해 결과를 전달받습니다.

```java
notebook.saveNote(note, context.getAutheInfo());
note.run(p.getId(), sessionId, blocking, context.getAutheInfo().getUser());
callback.onSuccess(p, context);
```

여기서 `callback.onSuccess()`는 “사용자 코드가 성공적으로 끝났다”와 같은 의미가 아닙니다. 이 경로에서는 `note.run()` 호출이 내부 실행 작업을 등록했다는 의미로 읽어야 합니다. 사용자 코드의 최종 `FINISHED`·`ERROR` 상태는 이후 Paragraph 작업과 listener를 통해 반영됩니다.

`note.run()`이 내부 오류를 던지면 서비스는 Paragraph에 `InterpreterResult.Code.ERROR`를 기록하고 상태를 `ERROR`로 바꿉니다. 반면 사용자 코드가 반환한 일반적인 Interpreter 오류는 Paragraph 실행 결과로 처리됩니다.

— [NotebookService.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/service/NotebookService.java#L432-L505) (확인: 2026-09-10)

## 3. `Paragraph.execute()`는 실행 작업을 scheduler에 제출한다

`Note.run()`은 대상 Paragraph를 찾고 listener를 설정한 뒤 `p.execute(interpreterGroupId, blocking)`을 호출합니다.

`Paragraph.execute()`의 앞부분은 실행에 사용할 Interpreter를 찾고 설정을 합친 뒤 상태를 `PENDING`으로 만듭니다.

```java
this.interpreterGroupId = interpreterGroupId;
this.interpreter = getBindedInterpreter();
InterpreterSetting interpreterSetting = ((ManagedInterpreterGroup)
        interpreter.getInterpreterGroup()).getInterpreterSetting();
Map<String, Object> config =
        interpreterSetting.getConfig(interpreter.getClassName());
mergeConfig(config);
setResult(null);
cleanOutputBuffer();
cleanRuntimeInfos();
setStatus(Status.PENDING);
```

빈 Paragraph이거나 비활성화된 Paragraph이면 Interpreter를 호출하지 않고 `FINISHED`로 끝낼 수 있습니다. 실행 가능한 Paragraph이면 다음 코드가 핵심입니다.

```java
setAuthenticationInfo(getAuthenticationInfo());
interpreter.getScheduler().submit(this);
```

`Paragraph` 자체가 scheduler 작업으로 제출되므로, “버튼을 누른 WebSocket 호출 스레드가 코드를 실행한다”는 모델은 현재 코드와 맞지 않습니다. `blocking=true`인 경로에서만 `execute()`가 완료 상태가 될 때까지 100ms 간격으로 기다립니다. WebSocket 경로는 `blocking=false`이므로 즉시 반환합니다.

— [Note.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/notebook/Note.java#L760-L790), [Paragraph.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/notebook/Paragraph.java#L321-L382) (확인: 2026-09-10)

## 4. `jobRun()`에서 실행 컨텍스트와 실제 스크립트를 만든다

scheduler가 Paragraph 작업을 실행하면 `Paragraph.jobRun()`이 호출됩니다. 이 메서드는 다시 Interpreter를 확인하고 Interpreter Setting 상태가 `READY`인지 검사합니다.

그 뒤 다음 데이터를 이용해 `InterpreterContext`를 만듭니다.

- Note ID·이름
- Paragraph ID·제목·본문
- 사용자 인증 정보
- local properties와 Paragraph 설정
- GUI·Note GUI
- Angular object registry
- ResourcePool

```java
InterpreterContext context = getInterpreterContext();
InterpreterContext.set(context);
```

본문은 그대로 전달되지 않을 수 있습니다. form 설정이 `simple`이면 본문에서 입력값을 추출하고 Note·Paragraph 설정을 적용합니다. Interpreter 설정에서 credential injection이 켜져 있으면 credential placeholder를 실제 값으로 치환한 뒤, 결과에서 비밀번호를 다시 숨깁니다.

최종 분기는 다음과 같습니다.

```java
if (shouldInjectCredentials) {
  String code = credinjector.replaceCredentials(script);
  ret = interpreter.interpret(code, context);
  ret = credinjector.hidePasswords(ret);
} else {
  ret = interpreter.interpret(script, context);
}
```

이 코드가 보여 주는 것은 `Paragraph`가 단순한 문자열 실행기가 아니라는 점입니다. 실행 직전에 사용자·Note·Paragraph·GUI·credential 정보가 `InterpreterContext`로 묶여 Interpreter에 전달됩니다. 따라서 같은 코드라도 실행 주체, Note, binding mode에 따라 결과가 달라질 수 있습니다.

— [Paragraph.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/notebook/Paragraph.java#L400-L560) (확인: 2026-09-10)

## 5. `RemoteInterpreter`가 첫 실행에서 Interpreter 프로세스를 확보한다

대부분의 실제 언어 Interpreter는 서버 JVM 안에서 직접 실행되지 않고 `RemoteInterpreter`를 통해 원격 호출됩니다. `RemoteInterpreter.interpret()`은 먼저 `getOrCreateInterpreterProcess()`를 호출합니다.

```java
interpreterProcess = getOrCreateInterpreterProcess();
if (!interpreterProcess.isRunning()) {
  return new InterpreterResult(Code.ERROR,
      "Interpreter process is not running\n"
          + interpreterProcess.getErrorMessage());
}
```

`getOrCreateInterpreterProcess()`는 이미 프로세스 핸들을 가지고 있으면 그것을 재사용하고, 없으면 `ManagedInterpreterGroup`에 생성을 위임합니다.

```java
public synchronized RemoteInterpreterProcess getOrCreateInterpreterProcess()
    throws IOException {
  if (this.interpreterProcess != null) {
    return this.interpreterProcess;
  }
  ManagedInterpreterGroup intpGroup = getInterpreterGroup();
  this.interpreterProcess = intpGroup.getOrCreateInterpreterProcess(
      getUserName(), properties);
  return interpreterProcess;
}
```

따라서 첫 Paragraph 실행에서만 보이는 Interpreter 프로세스 시작 비용은 `Paragraph`가 매번 새 JVM을 만드는 결과가 아닙니다. Interpreter group의 binding 설정과 현재 세션에 따라 이미 존재하는 프로세스를 재사용하거나 새 프로세스를 만듭니다.

공식 문서의 binding mode 설명도 `shared`는 하나의 Interpreter 프로세스와 세션을 공유하고, `isolated`는 Note별 별도 Interpreter 프로세스를 사용한다고 설명합니다. `scoped`는 하나의 JVM 안에서 세션을 분리합니다. [Interpreter binding mode](https://zeppelin.apache.org/docs/latest/usage/interpreter/interpreter_binding_mode.html) (확인: 2026-09-10)

| binding mode | per note 기준 | JVM과 세션의 의미 |
| --- | --- | --- |
| `shared` | 모든 Note가 같은 프로세스·세션 사용 | 상태를 직접 공유할 수 있지만 프로세스 장애 영향 범위가 큽니다. |
| `scoped` | 같은 프로세스, Note별 세션 | JVM은 공유하지만 Interpreter 인스턴스·세션은 분리됩니다. |
| `isolated` | Note별 프로세스·세션 | 프로세스까지 분리되어 격리 수준이 가장 높습니다. |

— [RemoteInterpreter.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreter.java#L100-L108), [Interpreter binding mode](https://zeppelin.apache.org/docs/latest/usage/interpreter/interpreter_binding_mode.html) (확인: 2026-09-10)

## 6. 서버 JVM에서 Thrift `interpret()`을 호출한다

프로세스가 실행 중이면 `RemoteInterpreter`는 `RemoteInterpreterProcess.callRemoteFunction()`을 통해 Thrift client를 얻고 다음 RPC를 호출합니다.

```java
return interpreterProcess.callRemoteFunction(client -> {
  RemoteInterpreterResult remoteResult = client.interpret(
      sessionId, className, st, convert(context));
  // remoteResult의 config·GUI를 서버 context에 반영한 뒤
  // 서버 쪽 InterpreterResult로 변환합니다.
  return convert(remoteResult);
});
```

실제 Thrift 계약은 `RemoteInterpreterService.thrift`에 선언되어 있습니다.

```text
RemoteInterpreterResult interpret(
  1: string sessionId,
  2: string className,
  3: string st,
  4: RemoteInterpreterContext interpreterContext
)
```

여기서 서버가 보내는 것은 코드 문자열 `st`만이 아닙니다. `sessionId`, Interpreter class name, 변환된 `InterpreterContext`도 함께 전송됩니다. 반환값에는 실행 결과뿐 아니라 원격 Interpreter에서 갱신된 config·GUI 정보도 포함될 수 있고, 서버는 이를 다시 현재 context에 반영합니다.

Thrift client는 `RemoteInterpreterProcess` 내부에서 `TSocket`과 `TBinaryProtocol`을 사용해 Interpreter 프로세스의 host·port에 연결합니다. 이 연결은 HTTP 요청이 아니라 별도의 Thrift TCP 연결입니다.

— [RemoteInterpreter.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreter.java#L210-L245), [RemoteInterpreterProcess.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterProcess.java#L38-L70), [RemoteInterpreterService.thrift](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/thrift/RemoteInterpreterService.thrift#L8-L18) (확인: 2026-09-10)

## 7. 새 Interpreter JVM은 `RemoteInterpreterServer`로 등록된다

로컬 실행 방식에서 `ExecRemoteInterpreterProcess.start()`는 `interpreterRunner` 명령을 실행하고 다음 정보를 인자로 전달합니다.

- Interpreter 디렉터리
- 서버의 Interpreter event server host·port
- Interpreter port range
- Interpreter group ID
- 사용자 이름(impersonation 시)
- local repository 디렉터리
- Interpreter setting 이름

```java
CommandLine cmdLine = CommandLine.parse(interpreterRunner);
cmdLine.addArgument("-d", false);
cmdLine.addArgument(getInterpreterDir(), false);
cmdLine.addArgument("-c", false);
cmdLine.addArgument(getIntpEventServerHost(), false);
cmdLine.addArgument("-p", false);
cmdLine.addArgument(String.valueOf(intpEventServerPort), false);
cmdLine.addArgument("-i", false);
cmdLine.addArgument(getInterpreterGroupId(), false);
```

프로세스가 준비되면 `waitForReady()`와 `isRunning()`으로 기동 결과를 확인합니다. timeout 또는 실행 실패는 `IOException`으로 서버 쪽에 전달됩니다.

Interpreter 프로세스 안의 `RemoteInterpreterServer`는 자신의 Thrift 서버가 serving 상태가 될 때까지 기다린 뒤, 서버가 제공한 event server에 `registerInterpreterProcess(registerInfo)`를 호출합니다.

```java
RegisterInfo registerInfo = new RegisterInfo(host, port, interpreterGroupId);
intpEventClient.registerInterpreterProcess(registerInfo);
```

이 등록이 필요한 이유는 서버가 새 Interpreter 프로세스가 어느 host·port에서 RPC를 받을 수 있는지 알아야 하기 때문입니다. 등록 이후 서버는 `init()`, `createInterpreter()`, `open()`을 호출하고, 최종적으로 `interpret()`을 호출합니다.

— [ExecRemoteInterpreterProcess.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/ExecRemoteInterpreterProcess.java#L60-L110), [RemoteInterpreterServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterServer.java#L590-L620) (확인: 2026-09-10)

## 8. 원격 서버가 실제 Interpreter를 호출한다

`RemoteInterpreterServer`는 RPC로 받은 `interpret()` 요청을 원격 프로세스 내부의 실행 작업으로 넘깁니다. 작업이 끝나면 `InterpreterResult`를 `RemoteInterpreterResult`로 변환해 서버에 반환합니다.

```text
서버 JVM
  RemoteInterpreter.interpret()
    └─ Thrift client.interpret(...)
          │ TCP / Thrift
          ▼
Interpreter JVM
  RemoteInterpreterServer.interpret()
    └─ 실제 Interpreter.interpret(script, context)
          └─ InterpreterResult
```

예를 들어 Spark를 선택했다면 이 마지막 호출의 실제 구현체는 Spark Interpreter가 됩니다. 하지만 Paragraph와 서버 관점에서 중요한 것은 특정 백엔드의 내부 실행 방식이 아니라, `Interpreter.interpret()`가 Interpreter JVM 안에서 호출된다는 사실입니다.

이 분리 때문에 서버 프로세스와 Interpreter 프로세스의 장애 범위·classpath·환경 변수·메모리 상태가 다릅니다. 반대로 서버가 가진 Java 객체를 Interpreter 프로세스에서 직접 참조할 수는 없고, 필요한 정보는 Thrift의 context·결과·event를 통해 전달해야 합니다.

— [RemoteInterpreterServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterServer.java#L540-L575), [Interpreter overview](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html) (확인: 2026-09-10)

## 9. 실행 결과와 중간 출력은 서로 다른 방향으로 흐른다

최종 실행 결과는 서버가 `interpret()` RPC의 반환값으로 받습니다. 그러나 실행 중간에 만들어지는 출력은 Interpreter에서 서버로 별도 event RPC를 보낼 수 있습니다.

```text
최종 결과
  서버 → interpret() RPC → Interpreter
  서버 ← RemoteInterpreterResult ← Interpreter

중간 출력
  Interpreter
    → RemoteInterpreterEventService.appendOutput()
    → Zeppelin 서버의 RemoteInterpreterEventServer
    → Paragraph output 갱신
    → NotebookServer WebSocket으로 브라우저에 전파
```

Thrift 정의에서 실행 방향의 `RemoteInterpreterService`와 이벤트 방향의 `RemoteInterpreterEventService`가 분리되어 있습니다.

```text
RemoteInterpreterService
  RemoteInterpreterResult interpret(...)

RemoteInterpreterEventService
  void registerInterpreterProcess(...)
  void appendOutput(...)
  void updateOutput(...)
```

따라서 “실행이 끝난 뒤 한 번에 결과를 내려 준다”는 모델만으로는 Zeppelin의 실시간 출력과 Paragraph 상태 갱신을 설명할 수 없습니다. 최종 결과 반환과 실행 중 event callback이라는 두 경로를 함께 봐야 합니다.

— [RemoteInterpreterService.thrift](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/thrift/RemoteInterpreterService.thrift#L8-L18), [RemoteInterpreterEventService.thrift](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/thrift/RemoteInterpreterEventService.thrift#L100-L118), [RemoteInterpreterEventClient.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterEventClient.java#L220-L240) (확인: 2026-09-10)

## 이 흐름에서 가장 헷갈리는 지점

### `runParagraph()`의 성공과 사용자 코드의 성공은 다릅니다

WebSocket 경로는 `blocking=false`로 실행을 등록합니다. 그러므로 callback이 호출됐다는 사실만으로 사용자 코드가 `FINISHED`가 됐다고 판단하면 안 됩니다. 최종 상태와 결과는 Paragraph listener·output event·작업 결과를 통해 확인해야 합니다.

### Interpreter는 첫 Paragraph 실행 때 생성될 수 있습니다

서버 시작 시 모든 Interpreter JVM이 미리 떠 있는 것은 아닙니다. `RemoteInterpreter.interpret()`이 `getOrCreateInterpreterProcess()`를 호출하므로, binding mode와 현재 group 상태에 따라 첫 실행이 프로세스 생성의 계기가 될 수 있습니다. 그래서 첫 실행만 느리고 이후 실행은 빨라지는 현상이 나타날 수 있지만, 이번 조사에서는 실제 지연 시간을 측정하지 않았습니다.

### `scoped`는 프로세스 격리가 아닙니다

`scoped`는 같은 Interpreter JVM 안에서 세션 또는 Interpreter 인스턴스를 분리하는 모드입니다. 프로세스 장애 격리까지 필요하면 `isolated`를 봐야 합니다. 이 차이를 놓치면 “Note별 세션이 분리됐으니 한 Note의 JVM 장애가 다른 Note에 영향을 주지 않는다”고 잘못 판단하게 됩니다.

### 서버와 Interpreter의 통신은 단방향 요청-응답만이 아닙니다

실행 요청과 최종 결과는 서버가 Interpreter에 RPC를 호출하는 방향이지만, 프로세스 등록과 중간 출력은 Interpreter가 서버의 event service를 호출하는 방향입니다. 장애를 조사할 때는 양쪽 포트와 양쪽 로그를 모두 확인해야 합니다.

## 코드 추적을 다시 시작할 때의 breakpoint 순서

한 Paragraph의 실행을 디버거로 따라가려면 다음 메서드에 순서대로 breakpoint를 잡으면 됩니다.

1. `NotebookServer.runParagraph()` — WebSocket 메시지가 서비스 호출로 바뀌는 지점
2. `NotebookService.runParagraph()` — 권한 검사·저장·blocking 설정
3. `Note.run()` — Paragraph 실행 제출
4. `Paragraph.execute()` — 상태를 `PENDING`으로 바꾸고 scheduler에 제출하는 지점
5. `Paragraph.jobRun()` — `InterpreterContext`와 최종 script 생성
6. `RemoteInterpreter.interpret()` — 별도 프로세스 확보와 RPC 호출
7. `ExecRemoteInterpreterProcess.start()` — 로컬 Interpreter 프로세스 생성
8. `RemoteInterpreterServer.interpret()` — Interpreter JVM에서 실제 실행
9. `RemoteInterpreterEventServer`의 `appendOutput()` 처리 — 중간 출력의 역방향 전달

이 순서로 보면 “HTTP 서버가 코드를 실행한다”가 아니라, **WebSocket은 작업을 등록하고, scheduler가 작업을 실행하며, Interpreter JVM이 언어 코드를 실행하고, Thrift event가 결과를 되돌린다**는 구조가 드러납니다.

## 확인하지 못한 것

- 실제 브라우저가 보내는 `RUN_PARAGRAPH` JSON의 전체 필드는 확인하지 않았습니다 — 이번 조사는 서버의 `Message` 처리 코드부터 시작했습니다.
- `ManagedInterpreterGroup.getOrCreateInterpreterProcess()` 내부의 모든 binding mode 분기는 확인하지 않았습니다 — 이 문서는 `RemoteInterpreter`가 프로세스 생성을 위임하는 경계까지를 중심으로 작성했습니다.
- `RemoteInterpreterServer` 내부에서 특정 Interpreter 구현체를 선택하는 전체 reflection·session 초기화 경로는 확인하지 않았습니다 — 서버와 원격 Interpreter 사이의 RPC 경계에 초점을 맞췄습니다.
- 실제 Zeppelin 실행 중의 WebSocket 메시지, Thrift 포트, 프로세스 생성 시각, 중간 출력 도착 순서는 재현하지 않았습니다 — 로컬 배포본을 기동하지 않았습니다.

*작성일: 2026-09-10*
