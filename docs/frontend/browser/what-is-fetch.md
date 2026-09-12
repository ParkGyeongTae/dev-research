---
sidebar_position: 7
---

# Fetch란 무엇인가

> **원문** — [Fetch Standard](https://fetch.spec.whatwg.org/)
>
> **확인 날짜** — 2026-09-13. Fetch Standard는 판번호가 없는 Living Standard이며, 2026-09-02 갱신본입니다.
>
> **검증 상태** — request·response·fetching, JavaScript `fetch()` API, body stream, CORS response를 원문으로 대조했습니다. 실제 브라우저에서 `fetch()` 코드를 실행하지 않았습니다.

Fetch는 request와 response를 연결하고 resource를 가져오는 웹 플랫폼의 공통 과정입니다. JavaScript의 `fetch()` 함수는 이 과정을 호출하는 API 중 하나입니다.

> The Fetch standard defines requests, responses, and the process that binds them: fetching.
>
> **번역** — Fetch Standard는 request, response, 그리고 둘을 연결하는 과정인 fetching을 정의합니다.
>
> — [Fetch Standard](https://fetch.spec.whatwg.org/) (확인: 2026-09-13)

## `fetch()`는 현재 문서를 바꾸지 않습니다

```js
const response = await fetch('/api/users');
const users = await response.json();
```

위 코드는 resource를 요청하고 response body를 JSON으로 읽습니다. `fetch()`가 성공해도 현재 탭의 `Document`가 `/api/users`의 문서로 교체되지는 않습니다.

```text
navigation:  URL fetch → 새 Document 생성 → 탭이 새 문서 표시
fetch():     request 전송 → Response 객체 반환 → JavaScript가 body 읽음
```

Fetch Standard는 `fetch()`뿐 아니라 `img`, `script`, `sendBeacon()`처럼 resource를 가져오는 여러 웹 API가 공통 fetching 구조를 사용하도록 정의합니다.
— [Fetch Standard, Preface](https://fetch.spec.whatwg.org/#preface) (확인: 2026-09-13)

## Request와 Response는 서로 다른 객체입니다

```js
const request = new Request('/api/users', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({name: 'Tae'}),
});

const response = await fetch(request);
```

`Request`는 method·URL·headers·body·credentials 같은 요청 조건을 표현합니다. `Response`는 status·headers·body 같은 서버 응답을 표현합니다. body를 JavaScript가 사용하려면 `response.json()`, `response.text()` 같은 소비 메서드를 호출해야 합니다.

## fetch가 resolve됐다고 HTTP 성공은 아닙니다

```js
const response = await fetch('/not-found');
console.log(response.ok);     // false일 수 있음
console.log(response.status); // 404일 수 있음
```

HTTP 서버가 `404`나 `500`을 반환해도 response를 받았다면 `fetch()` Promise는 reject되지 않을 수 있습니다. HTTP status를 성공으로 해석할지는 호출자가 `response.ok`나 `response.status`를 검사해 결정해야 합니다.

반대로 네트워크 오류나 CORS check 실패처럼 response를 JavaScript에 제공할 수 없는 경우에는 Promise가 reject될 수 있습니다. 또 response를 받은 뒤 `response.json()`에서 JSON parsing이 실패할 수도 있습니다. 이 세 실패를 같은 “API 실패”로 뭉뚱그리면 원인 파악이 어려워집니다.
— [Fetch Standard, fetching](https://fetch.spec.whatwg.org/#fetching) (확인: 2026-09-13)

## fetch는 browser policy의 영향을 받습니다

`fetch()`는 낮은 수준의 네트워크 API처럼 보이지만 브라우저 정책을 우회하지 않습니다.

- 다른 origin으로 요청하면 CORS 검사가 적용될 수 있습니다.
- credentials mode에 따라 Cookie나 HTTP 인증 정보의 포함 여부가 달라집니다.
- `mode`, `redirect`, `referrer` 같은 request 조건이 결과에 영향을 줍니다.
- CSP, mixed content, service worker, cache도 요청 처리에 관여할 수 있습니다.

따라서 `curl`로 같은 URL의 HTTP response를 받았다고 해서 브라우저의 `fetch()`도 같은 결과를 얻는다고 단정할 수 없습니다. `curl`에는 브라우저의 CORS와 Document 보안 경계가 없기 때문입니다.

## Response body는 stream이며 소비하면 다시 읽을 수 없습니다

```js
const response = await fetch('/data.json');
const data = await response.json();
```

`json()`이나 `text()` 같은 메서드는 response body를 읽습니다. body를 이미 소비한 뒤 같은 response에서 다시 읽으려 하면 실패할 수 있습니다. 같은 body를 두 번 읽어야 한다면 소비 전에 `response.clone()`을 사용하고, 두 stream을 모두 소비할 비용을 고려해야 합니다.
— [Fetch Standard, Body mixin](https://fetch.spec.whatwg.org/#body-mixin) (확인: 2026-09-13)

## 오래 걸리는 요청은 취소할 수 있습니다

```js
const controller = new AbortController();

const request = fetch('/api/users', {
  signal: controller.signal,
});

controller.abort();
```

`abort()`가 호출되면 해당 signal을 사용하는 fetch가 중단될 수 있습니다. 사용자 화면을 떠났거나 더 이상 필요하지 않은 요청을 취소하면 불필요한 처리와 결과 반영을 줄일 수 있습니다.
— [Fetch Standard, termination](https://fetch.spec.whatwg.org/#fetching) (확인: 2026-09-13)

## fetch를 조사할 때의 질문

```text
Request  어떤 URL·method·header·credentials로 보냈는가
Response 어떤 status·header·body를 받았는가
Policy   CORS·CSP·mixed content·cache가 결과를 바꿨는가
Consumer JavaScript가 body를 어떻게 읽고 해석했는가
```

이 네 층을 분리하면 “API가 실패했다”는 말이 DNS 실패, HTTP 500, CORS 차단, JSON parsing 실패 중 무엇인지 구분됩니다.

## 확인하지 못한 것

- **브라우저별 Fetch 구현** — Chrome·Firefox·Safari의 network stack과 service worker 통합을 비교하지 않았습니다.
- **실행 출력** — 이 환경에 브라우저 실행 파일이 없어 실제 Network panel 결과를 기록하지 않았습니다.

*작성일: 2026-09-13*
