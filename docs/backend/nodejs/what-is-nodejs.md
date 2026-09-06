---
sidebar_position: 0
---

# Node.js란 무엇인가 — 스레드 대신 이벤트 루프를 고른 런타임

Node.js를 "JavaScript를 서버에서 돌리는 것" 정도로 알고 넘어가면, 나중에 **왜 CPU를 쓰는 코드 한 줄이 서버 전체를 멈추는지**를 설명하지 못합니다.
이 문서가 잡으려는 개념은 하나입니다 — **Node.js는 동시성을 스레드가 아니라 이벤트 루프로 처리하기로 한 런타임**이고, 좋은 점과 곤란한 점이 전부 그 한 가지 선택에서 나옵니다.
데이터 엔지니어가 이미 아는 실행 모델(스레드 풀, executor, GIL)과 대조하면서 실측으로 확인합니다.

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | 값 |
| --- | --- |
| OS | macOS 15.7.4 (BuildVersion 24G517), arm64 |
| CPU | `os.availableParallelism()` = 14 |
| 셸 | zsh |
| Node | v22.21.1 |
| 실행 날짜 | 2026-09-06 |

---

## 1. 한 줄 정의

공식 문서 원문입니다 (출처: `https://nodejs.org/en/learn/getting-started/introduction-to-nodejs`, 확인 2026-09-05).

> Node.js is an open-source and cross-platform JavaScript runtime environment.
>
> Node.js runs the V8 JavaScript engine, the core of Google Chrome, outside of the browser. This allows Node.js to be very performant.

핵심은 **runtime**입니다. Node.js는 언어가 아니고 프레임워크도 아닙니다. JavaScript 엔진(V8)에 **브라우저에는 없는 것들**(파일 시스템, 소켓, 프로세스, 암호화)을 붙여 만든 실행 환경입니다.

브라우저와 무엇이 다른지도 공식 문서에 정리돼 있습니다 (출처: `https://nodejs.org/en/learn/getting-started/differences-between-nodejs-and-the-browser`, 확인 2026-09-05). 요지는 셋입니다.

- 브라우저에는 `document`·`window`가 있지만 Node.js에는 없습니다. 반대로 파일 시스템 API는 Node.js에만 있습니다.
- **실행 환경을 내가 정합니다.** 방문자의 브라우저 버전은 못 고르지만, 서버의 Node 버전은 내가 고정합니다.
- 모듈 시스템이 다릅니다. 브라우저는 `import`뿐이고, Node.js는 `require()`(CommonJS)와 `import`(ES Modules)를 둘 다 지원합니다.

### 실제로 무엇이 묶여 있는가

"V8 + libuv"라는 설명을 자주 보는데, 실행 파일 안에 실제로 무엇이 들어 있는지는 직접 볼 수 있습니다.

```bash
$ node -p "process.versions.v8 + ' | uv ' + process.versions.uv + ' | zlib ' + process.versions.zlib"
12.4.254.21-node.33 | uv 1.51.0 | zlib 1.3.1-470d3a2
```

```bash
$ node -p "JSON.stringify(process.versions,null,2)" | head -20
{
  "node": "22.21.1",
  "acorn": "8.15.0",
  "ada": "2.9.2",
  "amaro": "1.1.4",
  "ares": "1.34.5",
  "brotli": "1.1.0",
  "cjs_module_lexer": "2.1.0",
  "cldr": "47.0",
  "icu": "77.1",
  "llhttp": "9.3.0",
  "modules": "127",
  "napi": "10",
  "nbytes": "0.1.1",
  "ncrypto": "0.0.1",
  "nghttp2": "1.64.0",
  "openssl": "3.5.4",
  "simdjson": "3.13.0",
  "simdutf": "6.4.2",
  "sqlite": "3.50.4",
```

여기서 읽을 것 둘입니다.

- **`uv`** — libuv입니다. 이벤트 루프와 비동기 I/O를 담당하는 C 라이브러리로, §3·§4의 동작이 전부 여기서 나옵니다.
- **번들된 것들이 곧 버전에 묶인 동작입니다** — OpenSSL·ICU·SQLite가 Node 실행 파일 안에 들어 있습니다. 즉 "Node를 올렸더니 TLS 동작이 바뀌었다", "정렬 순서가 바뀌었다"가 실제로 일어납니다. Node 버전을 고르는 것은 이 목록 전부를 고르는 일입니다.

---

## 2. 왜 이런 모양인가 — 스레드 대신 이벤트 루프

Node.js가 스스로 밝히는 설계 의도입니다 (출처: `https://nodejs.org/en/about`, 확인 2026-09-05).

> As an asynchronous event-driven JavaScript runtime, Node.js is designed to build scalable network applications. (…) Upon each connection, the callback is fired, but if there is no work to be done, Node.js will sleep.
>
> This is in contrast to today's more common concurrency model, in which OS threads are employed. Thread-based networking is relatively inefficient and very difficult to use. Furthermore, users of Node.js are free from worries of dead-locking the process, since there are no locks. Almost no function in Node.js directly performs I/O, so the process never blocks except when the I/O is performed using synchronous methods of Node.js standard library. Because nothing blocks, scalable systems are very reasonable to develop in Node.js.

인용문이 스스로 "in contrast to"라고 밝히듯, 이건 **다른 모델을 의식하고 내린 선택**입니다. 데이터 엔지니어가 익숙한 모델과 대조하면 이렇습니다.

| | 요청/작업당 자원 | 대기 중일 때 | 락 |
| --- | --- | --- | --- |
| 스레드 기반 서버 (Tomcat 등) | OS 스레드 하나 | 스레드가 블록된 채 점유 | 공유 상태에 락 필요 |
| Node.js | 콜백(힙 위의 객체) 하나 | 아무것도 점유하지 않음 | 공식 문서 표현으로 "there are no locks" |

**비유이고, 어디서 깨지는지 함께 씁니다.** "Node의 이벤트 루프는 단일 스레드 executor 하나짜리 풀 같은 것"이라는 비유는 *스케줄링 관점에서만* 맞습니다.

- 맞는 부분: 작업이 큐에 들어가고 하나씩 꺼내 실행됩니다. 하나가 오래 걸리면 뒤가 전부 밀립니다.
- **깨지는 부분:** executor 풀은 작업을 **선점(preempt)하거나 다른 워커로 넘길 수 있지만**, 이벤트 루프는 못 합니다. 실행 중인 JavaScript 콜백은 **스스로 반환할 때까지** 아무도 못 뺏습니다. 타임아웃도 안 걸립니다.
- 또 깨지는 부분: Spark executor는 작업이 죽어도 나머지가 살지만, 이벤트 루프에서는 잡히지 않은 예외 하나가 **프로세스 전체를 죽입니다**(§6).

두 번째 항목이 §3의 실측으로 이어집니다.

---

## 3. "밀린다"가 실제로 무엇인가

이벤트 루프의 단계 순서는 공식 문서에 있습니다 (출처: `https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick`, 확인 2026-09-05).

> 1. **timers**: executes callbacks scheduled by `setTimeout()` and `setInterval()`
> 2. **pending callbacks**: executes I/O callbacks deferred to the next loop iteration
> 3. **idle, prepare**: only used internally
> 4. **poll**: retrieve new I/O events; execute I/O related callbacks (…); node will block here when appropriate
> 5. **check**: `setImmediate()` callbacks are invoked here
> 6. **close callbacks**: some close callbacks, e.g. `socket.on('close', ...)`

중요한 건 순서 암기가 아니라, **이 루프가 한 바퀴 돌아야 콜백이 실행된다**는 사실입니다. 동기 코드가 루프를 놓아주지 않으면 예약된 것들은 전부 그 뒤로 밀립니다.

`0ms` 뒤에 실행하라고 예약한 타이머와, 그 직후 시작하는 동기 작업을 같이 두고 돌렸습니다.

```js
// block.js
const t0 = Date.now();
setTimeout(() => console.log(`타이머(0ms 예약) 실제 실행: ${Date.now() - t0}ms`), 0);

// CPU를 붙잡는 동기 작업 (JSON 파싱 반복)
const row = JSON.stringify({ id: 1, name: 'x'.repeat(100), ts: Date.now() });
let n = 0;
for (let i = 0; i < 3_000_000; i++) n += JSON.parse(row).id;
console.log(`동기 작업 끝: ${Date.now() - t0}ms (n=${n})`);
```

```bash
$ node block.js
동기 작업 끝: 650ms (n=3000000)
타이머(0ms 예약) 실제 실행: 652ms
```

**0ms로 예약한 타이머가 652ms 뒤에 실행됐습니다.** 그동안 이 프로세스는 어떤 HTTP 요청도 받지 못하고, 어떤 소켓 이벤트도 처리하지 못합니다.

여기서 주의할 점: 저 3백만 번 루프는 인위적인 코드가 아닙니다. **JSON 라인 파일을 동기로 훑는 변환 스크립트**가 정확히 저 모양입니다. 데이터 처리 코드를 API 서버와 같은 프로세스에 넣으면, 배치가 도는 동안 서버는 죽은 것처럼 보입니다.

### 같은 일이 표준 라이브러리로도 일어납니다

직접 짠 루프만 문제가 아닙니다. `fs.readFileSync`·`execSync`처럼 **이름에 `Sync`가 붙은 API는 이벤트 루프를 그 자리에서 멈춥니다.** 부팅 시 설정 파일을 읽을 땐 문제없지만, 요청 처리 경로에 하나라도 들어가면 위 652ms가 **매 요청마다** 재현됩니다.

더 헷갈리는 것은 `Sync`가 안 붙었는데도 동기인 것들입니다 — `zlib`의 일부 동기 변형, 그리고 큰 문자열의 `JSON.parse`/`JSON.stringify`가 대표적입니다. **`JSON.parse`에는 비동기 버전이 없습니다.** 위 실측이 정확히 이 경우입니다.

---

## 4. "단일 스레드"는 어디까지 사실인가

가장 많이 오해되는 지점입니다. **JavaScript를 실행하는 스레드가 하나**인 것이지, 프로세스에 스레드가 하나인 게 아닙니다.

libuv 공식 문서 원문입니다 (출처: `https://docs.libuv.org/en/v1.x/threadpool.html`, 확인 2026-09-05).

> Its default size is 4, but it can be changed at startup time by setting the `UV_THREADPOOL_SIZE` environment variable to any value (the absolute maximum is 1024).
>
> This thread pool is internally used to run all file system operations, as well as getaddrinfo and getnameinfo requests.

즉 **파일 시스템 작업과 DNS 조회는 기본 4개짜리 스레드 풀에서 돕니다.** 네트워크 소켓 I/O는 이 풀을 쓰지 않고 커널의 이벤트 통지(epoll/kqueue)를 씁니다.

풀 크기가 실제로 동시성 한계라는 걸 확인했습니다. `crypto.pbkdf2`는 이 풀을 쓰는 대표적인 API입니다.

```js
// pool.js
const crypto = require('node:crypto');
const t0 = Date.now();
let done = 0;
for (let i = 0; i < 4; i++) {
  crypto.pbkdf2('pw', 'salt', 400000, 64, 'sha512', () => {
    console.log(`#${++done} 완료: ${Date.now() - t0}ms`);
  });
}
```

```bash
$ node pool.js
#1 완료: 75ms
#2 완료: 76ms
#3 완료: 76ms
#4 완료: 76ms

$ UV_THREADPOOL_SIZE=1 node pool.js
#1 완료: 65ms
#2 완료: 133ms
#3 완료: 199ms
#4 완료: 264ms
```

- 기본값(4)에서는 4개가 **동시에** 끝납니다 — 이 머신은 코어가 14개이므로 4개를 병렬로 돌릴 여유가 있습니다.
- `UV_THREADPOOL_SIZE=1`에서는 **65ms씩 순서대로** 끝납니다. 정확히 직렬화됐습니다.

**실무에서 이게 물리는 곳:** 컨테이너에 CPU를 넉넉히 줘도 `UV_THREADPOOL_SIZE`는 여전히 기본 4입니다. 파일을 많이 여는 워크로드에서 CPU가 놀고 있는데 처리량이 안 오르면 이 값을 먼저 의심합니다. 반대로 값을 코어 수보다 크게 올리면 컨텍스트 스위칭만 늘 수 있습니다 — libuv 문서도 "A larger thread count generally increases throughput but raises memory consumption"이라고만 말할 뿐 최적값을 제시하지 않습니다. **최적값은 워크로드마다 다르므로 측정해서 정해야 합니다.**

### CPU 작업을 진짜 병렬로 돌리려면

`node:worker_threads` 공식 문서 원문입니다 (출처: `https://nodejs.org/api/worker_threads.html`, Node v26.8.1 문서 기준, 확인 2026-09-05).

> Workers (threads) are useful for performing CPU-intensive JavaScript operations. They do not help much with I/O-intensive work. The Node.js built-in asynchronous I/O operations are more efficient than Workers can be.
>
> Unlike `child_process` or `cluster`, `worker_threads` can share memory. They do so by transferring `ArrayBuffer` instances or sharing `SharedArrayBuffer` instances.

문서가 스스로 선을 그어 뒀습니다. **CPU 작업에는 쓰고, I/O 작업에는 쓰지 마라.** I/O를 워커로 감싸면 기본 비동기 I/O보다 느려집니다. §3의 동기 루프처럼 이벤트 루프를 붙잡는 계산이 있다면, 그것을 워커로 옮기는 것이 정공법입니다.

---

## 5. 데이터 파이프라인에서 걸리는 것

### 64비트 정수가 조용히 바뀝니다

JavaScript의 `number`는 IEEE 754 double 하나뿐입니다. `JSON.parse`가 이것을 그대로 씁니다.

```js
// num.js
const line = '{"id":9007199254740993,"amount":0.1}';
const o = JSON.parse(line);
console.log('원본 id :', line.match(/"id":(\d+)/)[1]);
console.log('파싱 id :', o.id);
console.log('다시 직렬화:', JSON.stringify(o));
console.log('0.1+0.2 :', 0.1 + 0.2);
console.log('Number.MAX_SAFE_INTEGER:', Number.MAX_SAFE_INTEGER);
```

```bash
$ node num.js
원본 id : 9007199254740993
파싱 id : 9007199254740992
다시 직렬화: {"id":9007199254740992,"amount":0.1}
0.1+0.2 : 0.30000000000000004
Number.MAX_SAFE_INTEGER: 9007199254740991
```

**id가 조용히 바뀌었습니다.** 에러도 경고도 없습니다. Snowflake ID, Kafka offset, DB의 `BIGINT` 기본키처럼 2^53을 넘는 정수가 JSON으로 오가는 파이프라인을 Node로 중계하면 **키가 충돌하거나 유실됩니다.** §3의 이벤트 루프 문제와 달리 이건 튜닝의 여지도 없습니다 — 표현할 수 있는 타입이 없습니다.

JavaScript에 `BigInt`가 있긴 하지만 `JSON.parse`는 기본적으로 이것을 만들지 않습니다. 큰 정수를 문자열로 유지하거나, 별도 파서를 쓰거나, 애초에 이 구간을 Node로 짜지 않는 선택이 필요합니다. **확인 필요:** Node 최신 계열의 `JSON.parse` 리바이버로 BigInt를 안전하게 복원하는 표준 방법이 있는지는 이 문서에서 확인하지 않았습니다.

### 대량 변환은 모델이 안 맞습니다

§3에서 본 그대로입니다. 수 GB짜리 파일을 파싱·집계·조인하는 일은 이벤트 루프를 붙잡습니다. 이건 튜닝으로 해결되는 게 아니라 **모델이 안 맞는 것**입니다 — Node가 잘하는 것은 "대기가 많은 일을 많이"이지 "계산이 많은 일 하나"가 아닙니다. 그런 일은 Spark·DuckDB·Polars 쪽이고, Node로 굳이 하려면 §4의 `worker_threads`로 계산을 분리해야 합니다.

거들 생태계도 얇습니다. pandas·NumPy·Arrow에 해당하는 성숙한 대체재가 JavaScript 쪽엔 없습니다. **의견:** 분석 코드를 Node로 옮길 이유는 거의 없습니다.

---

## 6. 프로세스가 통째로 죽는 두 경로

§2에서 "예외 하나가 프로세스 전체를 죽인다"고 했습니다. 실제로 어떻게 죽는지 둘만 봅니다.

### 처리 안 된 Promise 거부

`--unhandled-rejections`의 기본값은 `throw`입니다 (출처: `https://nodejs.org/api/cli.json`, Node v26.8.1 문서 기준, 확인 2026-09-05).

> **throw**: Emit `unhandledRejection`. If this hook is not set, raise the unhandled rejection as an uncaught exception. This is the default.

실제로 돌려 본 결과입니다.

```js
// rej.js
async function load() { throw new Error('kafka 연결 실패'); }
load();
setTimeout(() => console.log('여기까지 옵니다'), 100);
```

```bash
$ node rej.js
Error: kafka 연결 실패
    at load (/…/rej.js:1:31)
    at Object.<anonymous> (/…/rej.js:2:1)
    …
Node.js v22.21.1
$ echo $?
1
```

`여기까지 옵니다`는 **출력되지 않았습니다.** `await`나 `.catch()`를 빠뜨린 호출 한 줄이 프로세스를 종료시킵니다. Python에서 코루틴을 await 안 하면 경고만 뜨고 넘어가는 것과 다릅니다.

증상은 **컨테이너가 주기적으로 재시작되는데 로그에는 스택 트레이스 한 덩어리만 남는 것**입니다.

### V8 힙 상한

V8은 자체 힙 상한을 갖고 있고, 이는 컨테이너의 메모리 제한과 별개입니다. 상한에 닿으면 `JavaScript heap out of memory`로 죽습니다.

이 환경의 기본 힙 상한을 확인했습니다.

```bash
$ node -p "(require('v8').getHeapStatistics().heap_size_limit/1024/1024).toFixed(0)+' MB'"
4144 MB
```

이 머신은 물리 메모리 24GB이고, V8 힙 상한은 약 4GB로 잡혔습니다. **이 숫자를 그대로 옮겨 쓰면 안 됩니다** — 상한은 실행 환경의 가용 메모리에 따라 달라지므로, 배포 대상 컨테이너 **안에서** 같은 명령을 돌려 확인해야 의미가 있습니다. 필요하면 `--max-old-space-size=<MB>`로 명시적으로 고정합니다.

증상은 "로컬에서는 되는데 컨테이너에서만 OOM"이고, 원인은 둘 중 하나입니다. **로그를 봐야 구분됩니다** — V8 힙 상한에 닿았으면 Node가 `JavaScript heap out of memory`를 찍고 죽고, cgroup 제한에 걸렸으면 로그 없이 커널이 죽입니다(종료 코드 137).

---

## 7. 그래서 어디에 쓰는가

여기까지의 내용은 한 문장으로 모입니다. **Node.js는 대기가 많은 일을 아주 많이 처리하는 데 최적화돼 있고, 계산이 많은 일 하나에는 최적화돼 있지 않습니다.**

그래서 잘 맞는 자리는 이렇습니다.

- **I/O가 대부분이고 CPU는 거의 안 쓰는 중계 계층** — 여러 API를 팬아웃해서 합치는 게이트웨이, 웹훅 수신기, 스트림 릴레이.
- **동시 연결이 많고 각 연결이 놀고 있는 경우** — 롱폴링·SSE·WebSocket. §2의 표에서 "대기 중 아무것도 점유하지 않음"이 값어치를 내는 자리입니다.
- **프런트엔드 자산을 빌드하는 도구 체인** — 선택지가 사실상 없습니다.

데이터 파이프라인에서 Node를 만난다면 대개 **중계 구간**이고, 그때 §5의 64비트 정수 문제를 반드시 확인해야 합니다.

---

*작성일: 2026-09-06*
