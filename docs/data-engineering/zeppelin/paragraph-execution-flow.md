---
sidebar_position: 3
---

# Apache Zeppelin에서 Paragraph 하나는 어떻게 실행되는가

> 원문 — [Interpreter overview](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html), [Interpreter binding mode](https://zeppelin.apache.org/docs/latest/usage/interpreter/interpreter_binding_mode.html), Apache Zeppelin 소스 커밋 [`2f403f36b1b23183e2cff31b4024d9b85173bfb2`](https://github.com/apache/zeppelin/tree/2f403f36b1b23183e2cff31b4024d9b85173bfb2)
>
> 확인 날짜 — 2026-09-13 (공식 문서는 0.12.0 기준이며, 호출 추적은 릴리스 태그가 아닌 `master`의 위 커밋 기준입니다.)
>
> 검증 상태 — 공식 문서와 로컬 소스 코드를 읽어 호출 관계를 추적했습니다. Zeppelin을 실제로 실행해 WebSocket 패킷·프로세스 목록·Thrift 통신을 관측하지는 않았습니다.

## 결론부터 말하면

현재 소스의 remote interpreter 경로에서는 사용자가 Paragraph의 Run을 눌러도 Zeppelin 서버 JVM이 사용자 코드를 직접 실행하지 않습니다. 서버는 Paragraph 실행 상태와 `InterpreterContext`를 준비한 뒤, 별도 Interpreter 프로세스에 Thrift RPC로 실행을 요청합니다.

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

핵심 경계는 다음 세 가지입니다.

- WebSocket 요청은 실행 자체가 아니라 서버에 실행 작업을 등록하는 진입점입니다.
- `Paragraph.execute()`는 Paragraph를 Interpreter scheduler에 제출하고, 실제 코드는 `jobRun()`에서 실행됩니다.
- `RemoteInterpreter`는 서버 JVM의 프록시이며, 실제 언어 런타임은 remote Interpreter 프로세스 뒤에 있습니다.

— [Interpreter overview](https://zeppelin.apache.org/docs/latest/usage/interpreter/overview.html) (확인: 2026-09-13)

## 실행 환경과 범위

이번 문서는 `/Users/pgt0409/Desktop/git/zeppelin`의 다음 상태를 읽어 작성했습니다.

```text
commit: 2f403f36b1b23183e2cff31b4024d9b85173bfb2
확인 날짜: 2026-09-13
범위: NotebookServer.java, NotebookService.java, Note.java, Paragraph.java,
      RemoteInterpreter.java, ExecRemoteInterpreterProcess.java,
      RemoteInterpreterServer.java, RemoteInterpreterService.thrift,
      RemoteInterpreterEventService.thrift
```

아래 설명은 이 커밋의 서버-side remote interpreter 호출 관계입니다. 실행 가능한 Zeppelin 배포본을 기동하지 않았으므로 실제 스레드 이름·포트·PID·실행 시간은 확인하지 않았습니다.

## 1. WebSocket 메시지가 실행 요청으로 분기됩니다

`NotebookServer.onMessage()`는 WebSocket 문자열을 `Message`로 역직렬화한 뒤 `receivedMessage.op`을 기준으로 분기합니다. `RUN_PARAGRAPH`를 받으면 `runParagraph(conn, context, receivedMessage)`를 호출합니다.

메시지에서 Paragraph ID, 본문, 제목, 파라미터, 실행 설정을 읽고 연결된 Note를 기준으로 `NotebookService.runParagraph()`를 호출합니다. 따라서 메시지가 곧바로 Interpreter에 전달되는 것이 아니라 Note·인증 정보·권한·Paragraph가 서버에서 먼저 결합됩니다.

— [NotebookServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/socket/NotebookServer.java#L1620-L1649) (확인: 2026-09-13)

## 2. `NotebookService`가 실행 전 상태를 확정합니다

`NotebookService.runParagraph()`는 Note와 Paragraph의 존재, `Permission.RUNNER` 권한을 확인하고 필요하면 본문·제목·파라미터·설정을 갱신한 뒤 Note를 저장합니다. 이후 `note.run(..., blocking, user)`를 호출합니다.

현재 WebSocket 경로는 `blocking=false`로 호출됩니다. 따라서 callback 호출은 사용자 코드가 성공적으로 끝났다는 뜻이 아니라, 실행 요청을 등록하는 서비스 호출이 성공했다는 뜻으로 해석해야 합니다. 사용자 코드의 최종 `FINISHED`·`ERROR` 상태는 이후 Paragraph 작업과 listener를 통해 반영됩니다.

— [NotebookService.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/service/NotebookService.java#L432-L505) (확인: 2026-09-13)

## 3. `Paragraph.execute()`가 scheduler에 제출됩니다

`Note.run()`은 Paragraph listener를 설정한 뒤 `p.execute(interpreterGroupId, blocking)`을 호출합니다. `Paragraph.execute()`는 Interpreter를 찾고 설정을 합친 뒤 상태를 `PENDING`으로 바꿉니다.

```java
setResult(null);
cleanOutputBuffer();
cleanRuntimeInfos();
setStatus(Status.PENDING);
interpreter.getScheduler().submit(this);
```

빈 Paragraph나 비활성화된 Paragraph는 Interpreter를 호출하지 않고 `FINISHED`로 끝날 수 있습니다. `blocking=true`인 경우에만 완료 상태가 될 때까지 기다리며, WebSocket 경로의 `blocking=false`에서는 제출 후 반환합니다.

— [Note.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/notebook/Note.java#L760-L785), [Paragraph.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/notebook/Paragraph.java#L321-L382) (확인: 2026-09-13)

## 4. `jobRun()`에서 실행 컨텍스트와 script를 만듭니다

Scheduler가 Paragraph 작업을 실행하면 `Paragraph.jobRun()`이 호출됩니다. Interpreter가 존재하고 Interpreter Setting 상태가 `READY`인지 확인한 뒤 `InterpreterContext`를 생성합니다. Context에는 Note·Paragraph 정보, 사용자 인증, local properties, GUI, Angular object registry, ResourcePool 등이 포함됩니다.

`form=simple`이면 본문에서 입력값을 추출하고 Note·Paragraph 설정을 적용합니다. Credential injection이 켜져 있으면 placeholder를 실제 값으로 치환하고, 반환 결과에서는 비밀번호를 숨깁니다.

```java
InterpreterContext context = getInterpreterContext();
InterpreterContext.set(context);

if (shouldInjectCredentials) {
  String code = credinjector.replaceCredentials(script);
  ret = interpreter.interpret(code, context);
  ret = credinjector.hidePasswords(ret);
} else {
  ret = interpreter.interpret(script, context);
}
```

따라서 Paragraph는 단순한 문자열 실행기가 아닙니다. 실행 주체·Note·Paragraph·GUI·credential 정보가 실행 직전에 Context로 묶이고, binding mode에 따라 결과와 상태 공유 범위가 달라질 수 있습니다.

— [Paragraph.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/notebook/Paragraph.java#L394-L475) (확인: 2026-09-13)

## 5. 필요하면 Interpreter 프로세스를 확보합니다

`RemoteInterpreter.interpret()`은 먼저 `getOrCreateInterpreterProcess()`를 호출합니다. 이미 프로세스 핸들이 있으면 재사용하고, 없으면 `ManagedInterpreterGroup`에 생성을 위임합니다.

```java
interpreterProcess = getOrCreateInterpreterProcess();
if (!interpreterProcess.isRunning()) {
  return new InterpreterResult(Code.ERROR, "Interpreter process is not running");
}
```

따라서 첫 실행에서 프로세스 생성 비용이 발생할 수 있지만, 모든 실행이 매번 새 JVM을 만든다는 뜻은 아닙니다. 실제 재사용·생성 여부는 Interpreter Group, binding mode, scope, recovery 상태에 좌우됩니다.

공식 문서의 `per note` 기준은 `shared`가 단일 JVM·session, `scoped`가 단일 JVM 안의 Note별 session, `isolated`가 Note별 process·session을 사용한다고 설명합니다. [Interpreter Binding Mode](https://zeppelin.apache.org/docs/latest/usage/interpreter/interpreter_binding_mode.html) (확인: 2026-09-13)

— [RemoteInterpreter.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreter.java#L100-L108) (확인: 2026-09-13)

## 6. 서버 JVM에서 Thrift `interpret()`을 호출합니다

프로세스가 실행 중이면 서버는 `RemoteInterpreterProcess.callRemoteFunction()`을 통해 다음 RPC를 호출합니다.

```text
RemoteInterpreterService
  RemoteInterpreterResult interpret(
    sessionId, className, script, interpreterContext
  )
```

서버가 보내는 것은 script 문자열만이 아닙니다. `sessionId`, Interpreter class name, 변환된 `InterpreterContext`도 함께 전송합니다. 반환값에는 실행 결과와 원격 Interpreter에서 갱신된 정보가 포함될 수 있습니다.

Thrift client는 Interpreter 프로세스의 host·port에 `TSocket`과 `TBinaryProtocol`로 연결합니다. 따라서 이 경로의 실행 통신은 HTTP 요청이 아니라 별도의 Thrift TCP 연결입니다.

— [RemoteInterpreter.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreter.java#L210-L245), [RemoteInterpreterProcess.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterProcess.java#L38-L70), [RemoteInterpreterService.thrift](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/thrift/RemoteInterpreterService.thrift#L8-L18) (확인: 2026-09-13)

## 7. 새 Interpreter JVM은 서버에 등록됩니다

로컬 실행 방식에서 `ExecRemoteInterpreterProcess`는 `interpreterRunner`를 실행하고 Interpreter 디렉터리, event server host·port, port range, group ID, 사용자, repository 등의 정보를 전달합니다.

Interpreter 프로세스 안의 `RemoteInterpreterServer`가 준비되면 event server에 `registerInterpreterProcess(registerInfo)`를 호출합니다. 이 등록으로 서버는 RPC를 받을 host·port를 알게 됩니다. 이후 서버는 `init()`, `createInterpreter()`, `open()`을 호출한 뒤 `interpret()`을 호출합니다.

— [ExecRemoteInterpreterProcess.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-server/src/main/java/org/apache/zeppelin/interpreter/remote/ExecRemoteInterpreterProcess.java#L60-L110), [RemoteInterpreterServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterServer.java#L590-L620) (확인: 2026-09-13)

## 8. 원격 서버가 실제 Interpreter를 호출합니다

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

예를 들어 Spark를 선택하면 마지막 호출의 구현체는 Spark Interpreter가 됩니다. 서버 JVM의 Java 객체를 Interpreter JVM에서 직접 참조하는 것이 아니라 Context·결과·event 경계를 통해 정보를 전달합니다.

— [RemoteInterpreterServer.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterServer.java#L540-L575) (확인: 2026-09-13)

## 9. 최종 결과와 중간 출력은 다른 경로입니다

최종 실행 결과는 `RemoteInterpreterService.interpret()`의 반환값으로 서버에 돌아옵니다. 반면 실행 중간 출력은 Interpreter가 서버의 `RemoteInterpreterEventService`를 별도로 호출해 전달할 수 있습니다.

```text
최종 결과
  서버 → interpret() RPC → Interpreter
  서버 ← RemoteInterpreterResult ← Interpreter

중간 출력
  Interpreter
    → RemoteInterpreterEventService.appendOutput()
    → Zeppelin 서버의 RemoteInterpreterEventServer
    → Paragraph output 갱신
    → WebSocket으로 브라우저에 전파
```

따라서 “모든 결과가 실행 종료 후 한 번에 내려온다”는 모델은 중간 출력을 설명하지 못합니다. 정확한 모델은 **최종 결과는 `interpret()` 응답으로, 중간 출력과 일부 상태 이벤트는 event RPC로 전달된다**는 것입니다.

— [RemoteInterpreterService.thrift](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/thrift/RemoteInterpreterService.thrift#L8-L18), [RemoteInterpreterEventService.thrift](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/thrift/RemoteInterpreterEventService.thrift#L100-L118), [RemoteInterpreterEventClient.java](https://github.com/apache/zeppelin/blob/2f403f36b1b23183e2cff31b4024d9b85173bfb2/zeppelin-interpreter/src/main/java/org/apache/zeppelin/interpreter/remote/RemoteInterpreterEventClient.java#L220-L240) (확인: 2026-09-13)

## 이 흐름에서 가장 헷갈리는 지점

### `runParagraph()`의 성공과 사용자 코드의 성공은 다릅니다

WebSocket 경로는 `blocking=false`로 실행을 등록합니다. callback 호출만으로 사용자 코드가 `FINISHED`가 됐다고 판단하면 안 됩니다.

### `scoped`는 프로세스 격리가 아닙니다

`scoped`는 같은 Interpreter JVM 안에서 session 또는 Interpreter 인스턴스를 분리하는 모드입니다. 프로세스 장애 격리까지 필요하면 `isolated`를 검토해야 합니다.

### 서버와 Interpreter 통신은 단방향 요청-응답만이 아닙니다

실행 요청과 최종 결과는 서버가 Interpreter에 호출하는 RPC 방향이고, 프로세스 등록과 중간 출력은 Interpreter가 서버 event service를 호출하는 방향입니다. 장애 조사에서는 양쪽 포트와 로그를 모두 확인해야 합니다. 마지막 문장은 소스 구조에서 도출한 운영 권장입니다.

## 코드 추적을 다시 시작할 때의 breakpoint 순서

1. `NotebookServer.runParagraph()` — WebSocket 메시지의 진입점
2. `NotebookService.runParagraph()` — 권한·저장·blocking 설정
3. `Note.run()` — Paragraph 실행 제출
4. `Paragraph.execute()` — `PENDING` 전환과 scheduler 제출
5. `Paragraph.jobRun()` — Context와 최종 script 생성
6. `RemoteInterpreter.interpret()` — 프로세스 확보와 RPC 호출
7. `ExecRemoteInterpreterProcess.start()` — 로컬 Interpreter 프로세스 생성
8. `RemoteInterpreterServer.interpret()` — Interpreter JVM의 실제 실행
9. `RemoteInterpreterEventServer.appendOutput()` — 중간 출력의 역방향 전달

이 순서로 보면 WebSocket은 작업을 등록하고, scheduler가 작업을 실행하며, Interpreter JVM이 코드를 실행하고, 최종 결과와 중간 출력이 서로 다른 Thrift 경로로 돌아온다는 구조가 드러납니다.

## 확인하지 못한 것

- 실제 브라우저가 보내는 `RUN_PARAGRAPH` JSON 전체 필드는 확인하지 않았습니다 — 서버의 `Message` 처리 코드부터 추적했습니다.
- `ManagedInterpreterGroup.getOrCreateInterpreterProcess()` 내부의 모든 binding mode 분기는 확인하지 않았습니다 — `RemoteInterpreter`가 생성을 위임하는 경계까지를 중심으로 봤습니다.
- 특정 Interpreter 구현체의 전체 reflection·session 초기화 경로는 확인하지 않았습니다 — 서버와 원격 Interpreter 사이의 RPC 경계에 초점을 맞췄습니다.
- 실제 WebSocket 메시지·Thrift 포트·프로세스 생성 시각·중간 출력 도착 순서는 재현하지 않았습니다 — 로컬 배포본을 기동하지 않았습니다.

*작성일: 2026-09-13*
