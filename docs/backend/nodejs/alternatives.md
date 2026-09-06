---
sidebar_position: 7
---

# Node.js와 비슷한 기술 스택은 무엇인가

"Node 말고 뭐가 있나"라는 질문은 사실 **두 개의 다른 질문**입니다. 섞어 두면 답이 안 나옵니다.

1. **같은 JavaScript 코드를 돌리는 다른 런타임** — Deno, Bun. 언어와 생태계는 그대로 두고 실행기만 바꾸는 선택입니다.
2. **같은 일을 하는 다른 언어 스택** — Python, Go, JVM. 언어와 생태계를 통째로 바꾸는 선택입니다.

둘을 나눠야 하는 이유는 **바꾸는 대상이 다르면 위험의 종류도 다르기 때문**입니다. 1번은 "되던 게 조용히 안 되는" 호환성 문제이고, 2번은 "다시 짜야 하는" 비용 문제입니다.

## 확인 환경

| 항목 | 값 |
| --- | --- |
| OS | macOS 15.7.4 (BuildVersion 24G517), arm64 |
| Node | v22.21.1 |
| Deno / Bun | **이 머신에 설치돼 있지 않음** (`command -v deno bun` → 종료 코드 1) |
| 확인 날짜 | 2026-09-06 |

**중요:** 아래 Deno·Bun 관련 내용은 전부 **공식 문서를 읽은 것**이며, 이 문서에서 직접 실행한 기록은 없습니다. 성능·호환성 주장을 그대로 믿지 말고, 도입 전에 자기 워크로드로 재봐야 합니다.

---

## 1. 같은 JavaScript를 돌리는 다른 런타임

### Deno — 권한을 기본값으로 막아 둔 런타임

공식 문서 원문입니다 (출처: `https://docs.deno.com/runtime/`, 확인 2026-09-05).

> Deno is an open source JavaScript, TypeScript, and WebAssembly runtime with secure defaults and a great developer experience.
>
> Secure by default. Code runs in a sandbox with no file, network, or environment access until you grant it.
>
> TypeScript-first. Run .ts files directly. No tsc, no build step, no config.

GitHub 릴리스를 직접 조회한 최신 버전입니다.

```bash
$ curl -s https://api.github.com/repos/denoland/deno/releases/latest | grep -m1 '"tag_name"'
  "tag_name": "v2.9.6",
```

Node와의 가장 큰 차이는 **권한 모델**입니다. Node는 스크립트가 파일·네트워크·환경 변수에 제한 없이 접근하지만, Deno는 플래그로 허용해야 합니다. 공급망 공격(악성 npm 패키지)이 걱정되는 환경에서 의미가 있습니다.

그런데 이 "기본값으로 막는다"가 호환성 쪽으로 되돌아옵니다. Node 호환성에 대한 공식 문서의 표현입니다 (출처: `https://docs.deno.com/runtime/fundamentals/node/`, 확인 2026-09-05).

> As of Deno 2.8, over 75% of Node's own test suite passes in Deno, covering nearly every `node:` module.

**"over 75%"는 100%가 아닙니다.** 같은 문서가 명시하는 제약 중 실무에서 걸릴 만한 것들입니다.

- **네이티브 애드온이 있는 패키지는 로컬 `node_modules` 디렉터리와 `--allow-ffi` 권한이 필요합니다.**
- `Buffer`는 전역이 아니라 `node:buffer`에서 import해야 합니다.
- `__dirname`·`__filename`이 정의돼 있지 않습니다 (`import.meta.dirname`을 씁니다).
- **npm 라이프사이클 스크립트를 기본적으로 실행하지 않습니다** — 보안상의 결정이지만, 설치 스크립트에 의존하는 패키지는 그냥 안 됩니다.

첫 항목이 데이터 업무에서 특히 자주 걸립니다. **일부 DB 드라이버, 압축·암호화 라이브러리에 네이티브 애드온이 흔합니다.** 여기서 막히면 설치나 실행이 컴파일 오류·모듈 로드 실패로 죽고, 대개는 런타임 교체를 접는 게 빠릅니다.

### Bun — 엔진부터 다른 런타임

공식 저장소 README 원문입니다 (출처: `https://github.com/oven-sh/bun` main 브랜치 README, 조회 2026-09-05).

> Bun is an all-in-one toolkit for JavaScript and TypeScript apps. It ships as a single executable called `bun`.
>
> At its core is the _Bun runtime_, a fast JavaScript runtime designed as **a drop-in replacement for Node.js**. It's written in Rust and powered by JavaScriptCore under the hood, dramatically reducing startup times and memory usage.

```bash
$ curl -s https://api.github.com/repos/oven-sh/bun/releases/latest | grep -m1 '"tag_name"'
  "tag_name": "bun-v1.4.2",
```

엔진이 다르다는 점이 중요합니다. **Node는 V8, Bun은 JavaScriptCore**입니다. 즉 GC 동작·메모리 사용·최적화 특성이 다르고, V8 전용 도구(힙 스냅샷, `--cpu-prof` 등)가 그대로 통하지 않습니다.

성능에 관해 Bun 문서는 "dramatically reducing startup times and memory usage", 문서 페이지에서는 "Bun processes start 4x faster than Node.js"라고 말합니다. **이 수치는 이 저장소에서 인용하지 않습니다** — 하드웨어·측정 방법·비교 대상 버전이 함께 제시되지 않은 수치는 근거로 쓸 수 없습니다. 시작 시간이 실제로 중요한 워크로드(짧게 뜨고 죽는 CLI, 서버리스 콜드 스타트)라면 **직접 재서** 판단해야 합니다.

**"drop-in replacement"라는 표현도 문자 그대로는 아닙니다.** Bun 공식 호환성 문서 기준(Bun v1.4.2, Node v26 대상, 확인 2026-09-05, 출처: `https://bun.com/docs/runtime/nodejs-apis`)으로 부분 구현 상태인 모듈이 남아 있습니다. 데이터/인프라 쪽에서 걸릴 만한 것만 추리면:

| 모듈 | 문서가 밝힌 제약 |
| --- | --- |
| `node:cluster` | 동작하지만 충분히 검증되지 않았고, HTTP 로드 밸런싱은 Linux에서만 |
| `node:worker_threads` | `resourceLimits`, `moveMessagePortToContext` 미구현 |
| `node:crypto` | BoringSSL 기반이라 알고리즘 제약이 있고 일부 API 누락 |
| `node:https` | 요청 소켓이 실제 TLS 소켓이 아니며 `getPeerCertificate()`·`getCipher()` 없음 |
| `node:async_hooks` | `AsyncLocalStorage`·`AsyncResource`는 되지만 훅 자체는 스텁 |
| `node:sea` | 미구현 (`bun build --compile`을 쓰라고 안내) |

이 표를 읽는 방법이 중요합니다. **여기 있는 것들은 평소에 안 밟는 경로입니다** — TLS 인증서 검사, APM 추적, 클러스터 모드. 그래서 `npm install`도 지나가고 대부분의 코드가 잘 돌다가, **프로덕션의 특정 경로에서만** 깨집니다. 특히 APM·분산 추적 도구가 `async_hooks`에 의존하는 경우가 많아 **관측성 스택이 조용히 안 붙는 형태로** 문제가 나타납니다.

그래서 런타임을 바꾸기 전에 할 일은 정해져 있습니다 — **의존성이 어떤 `node:` 모듈을 쓰는지 확인하고, 해당 런타임의 호환성 문서에서 그 모듈 상태를 봅니다.**

### Node 쪽도 가만히 있지 않았습니다

Deno·Bun이 파고든 틈(TypeScript 실행, 내장 테스트 러너)은 최근 Node가 상당 부분 메웠습니다. 새 런타임으로 갈아탈 이유를 따질 때 이 사실을 빼면 판단이 오래된 정보에 묶입니다.

- **TypeScript 직접 실행** — 공식 문서 기준(출처: `https://nodejs.org/api/typescript.html`, Node v26.8.1 문서, 확인 2026-09-05) 타입 스트리핑은 **v23.6.0과 v22.18.0에서 기본 활성화**됐고, **v25.2.0·v24.12.0에서 Stability 2 - Stable**이 됐습니다.
  다만 **타입 검사는 하지 않고**(공백으로 치환할 뿐), `enum`·런타임 코드가 있는 `namespace`·파라미터 프로퍼티·데코레이터처럼 **변환이 필요한 문법은 오류**입니다. `.tsx`도 지원하지 않습니다. Deno의 "TypeScript-first"와 같은 수준이 아닙니다.
- **내장 테스트 러너** — `node:test`는 **Stability 2 - Stable**입니다 (출처: `https://nodejs.org/api/test.html`, Node v26.8.1 문서, 확인 2026-09-05).

이 환경(Node v22.21.1)에서 직접 확인한 결과입니다.

```bash
$ cat t.ts
const n: number = 1;
interface X { a: string }
console.log("ts ok", n);

$ node t.ts
ts ok 1

$ cat e.ts
enum E { A }
console.log(E.A);

$ node e.ts
enum E { A }
^^^^^^^^^^^^

SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
    at parseTypeScript (node:internal/modules/typescript:63:40)
    at processTypeScriptCode (node:internal/modules/typescript:133:42)
```

플래그 없이 `.ts` 파일이 그대로 실행되고, `enum`은 `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`로 거부됩니다 — 문서에 적힌 그대로입니다.

---

## 2. 같은 일을 하는 다른 언어 스택

데이터 엔지니어에게 더 현실적인 선택지입니다. "Node를 쓸까"보다 "이 서비스를 Python으로 짤까"가 실제 질문인 경우가 많습니다.

### Python — asyncio

공식 문서 원문입니다 (출처: `https://docs.python.org/3/library/asyncio.html`, Python 3.14.7 문서, 확인 2026-09-05).

> asyncio is a library to write **concurrent** code using the **async/await** syntax.
>
> asyncio is often a perfect fit for IO-bound and high-level **structured** network code.

Node와 겹치는 영역이 정확히 여기입니다 — **I/O 바운드**. 실행 모델도 닮았습니다(이벤트 루프 하나, 코루틴이 await에서 양보). 차이는 셋입니다.

- **비동기가 언어에 기본값이 아닙니다.** Python은 동기 코드가 기본이고 asyncio는 선택입니다. 그래서 동기 라이브러리를 이벤트 루프 안에서 부르면 그 자리에서 막힙니다. Node는 표준 라이브러리의 I/O가 처음부터 비동기입니다.
- **처리 안 된 예외의 결과가 다릅니다.** Node는 처리 안 된 Promise 거부가 기본적으로 프로세스를 죽입니다. Python에서 코루틴을 await 하지 않으면 경고에 그칩니다.
- **생태계가 이미 여기 있습니다.** pandas·PyArrow·SQLAlchemy·Airflow가 전부 Python입니다. **의견:** 데이터 파이프라인에 붙는 서비스라면 이것만으로 Python이 이깁니다.

### Go

I/O 동시성을 **고루틴**으로 처리합니다. 이벤트 루프를 개발자가 의식하지 않고 동기처럼 쓰면서, 런타임이 스케줄링합니다.

Node 대비 실질적인 차이:

- **CPU 바운드 작업이 다른 요청을 막지 않습니다.** 여러 OS 스레드에 고루틴을 분산하므로, Node에서 CPU 작업이 이벤트 루프를 붙잡아 다른 요청까지 밀어내는 문제가 구조적으로 없습니다.
- **단일 정적 바이너리로 배포됩니다.** `node_modules`도 런타임 설치도 없습니다. 컨테이너 이미지가 작아집니다.
- **대신 락과 데이터 경쟁이 돌아옵니다.** Node.js 공식 문서가 자기 장점으로 내세운 "there are no locks"(출처: `https://nodejs.org/en/about`, 확인 2026-09-05)가 여기서는 성립하지 않습니다.

**의견:** 처리량이 중요하고 오래 사는 네트워크 서비스(수집기, 프록시, 익스포터)라면 Go가 Node보다 안전한 기본값입니다. 실제로 인프라·관측성 도구가 Go로 몰려 있는 이유이기도 합니다.

### JVM (Java/Kotlin/Scala)

데이터 엔지니어에게는 이미 익숙한 쪽입니다 — Kafka·Spark·Flink가 여기 있습니다.

- **스레드 기반**이 기본이고, 비동기가 필요하면 Netty·Vert.x·리액티브 스택으로 갑니다.
- Kafka·Spark와 **같은 프로세스 모델·같은 직렬화 라이브러리**를 쓸 수 있다는 게 가장 큰 실무적 이점입니다.
- 대신 시작 시간과 메모리 발자국이 큽니다. 짧게 뜨고 죽는 워크로드에는 불리합니다.

**확인 필요:** JVM 가상 스레드(Project Loom) 도입 이후 이 절의 "스레드 기반이 기본" 서술이 어디까지 유효한지는 이 문서에서 확인하지 않았습니다.

---

## 3. 정리 — 무엇을 고를 것인가

**아래는 의견입니다.** 사실 서술은 §1·§2에 근거를 달아 두었습니다.

| 상황 | 고를 것 | 이유 |
| --- | --- | --- |
| 데이터 파이프라인에 붙는 서비스 | Python | 생태계가 이미 거기 있음 |
| 처리량 중요한 상주 네트워크 서비스 | Go | CPU 작업이 다른 요청을 막지 않고, 배포가 단순 |
| Kafka/Spark와 라이브러리를 공유해야 함 | JVM | 같은 직렬화·같은 클라이언트 |
| 프런트엔드 자산 빌드 | Node | 선택지가 사실상 없음 |
| 이미 JavaScript로 된 코드가 있는 얇은 I/O 계층 | Node | 언어를 나누는 비용이 더 큼 |
| 공급망 리스크를 런타임 수준에서 막고 싶음 | Deno | 권한 모델이 기본값 |

**Bun으로 갈아타는 선택은 이 문서에서 권하지 않습니다.** §1의 표처럼 호환성이 부분 구현 상태인 모듈이 남아 있고, 이 저장소에서 성능 이득을 측정한 적이 없기 때문입니다. 근거 없이 권하지 않는 것이지, 안 된다는 뜻은 아닙니다.

### 이 비교가 애초에 성립하지 않는 경우

세 가지는 여기서 답할 수 없는 질문입니다.

- **브라우저에서 도는 코드**에는 대안이 없습니다. 런타임 선택 문제가 아닙니다.
- **CPU 바운드 대량 변환**은 §1의 어느 런타임을 골라도 답이 아닙니다. **런타임을 바꿔도 JavaScript 실행 스레드가 하나라는 사실은 그대로이고**, Deno도 Bun도 이벤트 루프 모델을 버리지 않았습니다. 그래서 "Bun으로 옮겼는데 CPU 구간 지연이 그대로"는 예상된 결과입니다 — 워커로 분리하거나 Spark·DuckDB·Polars 같은 처리 엔진으로 옮겨야 합니다.
- **"어느 게 빠른가"** 질문에는 이 문서가 답하지 않습니다. 조건 없는 벤치마크는 쓰지 않기로 했고, 이 저장소에서 실측한 적이 없습니다.

---

*작성일: 2026-09-06*
