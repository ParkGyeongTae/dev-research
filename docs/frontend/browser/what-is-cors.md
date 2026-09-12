---
sidebar_position: 3
---

# CORS란 무엇인가

> **원문** — [Fetch Standard, CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol)
>
> **확인 날짜** — 2026-09-13. Fetch Standard는 판번호가 없는 Living Standard이며, 원문에는 2026-09-02 갱신으로 표시되어 있습니다.
>
> **검증 상태** — CORS의 목적, HTTP header, preflight, credentials, CORS check와 cache 조건을 원문으로 대조했습니다. 실제 브라우저의 네트워크·콘솔 출력은 직접 확인하지 않았습니다.

CORS(Cross-Origin Resource Sharing)는 한 origin에서 실행 중인 웹 콘텐츠가 다른 origin의 응답을 JavaScript에서 읽을 수 있는지를 브라우저가 검사하는 프로토콜입니다. 서버는 HTTP response header로 허용 조건을 표현하고, 브라우저는 그 header와 요청 조건을 검사해 응답을 script에 공유하거나 차단합니다.

> To allow sharing responses cross-origin and allow for more versatile fetches than possible with HTML’s `form` element, the CORS protocol exists.
>
> **번역** — HTML의 `form` 요소로 가능한 것보다 유연한 fetch와 교차 출처 응답 공유를 허용하기 위해 CORS 프로토콜이 존재합니다.
>
> — [Fetch Standard, CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol) (확인: 2026-09-13)

origin은 scheme·host·port의 조합입니다. `https://app.example.com`과 `https://api.example.com`은 host가 다르므로 서로 다른 origin입니다. 따라서 app의 JavaScript가 api의 JSON 응답을 읽으려면 api 서버가 그 공유를 허용하고, 브라우저의 CORS check를 통과해야 합니다.

## 브라우저가 요청을 보낸 것과 응답을 읽게 한 것은 다릅니다

```js
fetch('https://api.example.com/users')
  .then(response => response.json());
```

서버가 다음 응답 header를 보냈다고 가정하겠습니다.

```http
Access-Control-Allow-Origin: https://app.example.com
```

페이지가 실제로 `https://app.example.com`에서 실행 중이면 브라우저는 응답을 JavaScript에 공유할 수 있습니다. header가 없거나 요청 origin과 일치하지 않으면 서버가 요청을 처리했더라도 JavaScript는 응답을 읽지 못합니다. CORS check가 실패하면 fetch 결과는 network error로 처리됩니다.
— [Fetch Standard, CORS check](https://fetch.spec.whatwg.org/#cors-check) (확인: 2026-09-13)

즉, CORS 오류는 항상 “서버에 요청이 도착하지 않았다”는 뜻이 아닙니다. 서버 로그와 브라우저 JavaScript가 관측하는 결과가 다를 수 있습니다.

`Access-Control-Allow-Origin`에 origin을 동적으로 반영하는 서버라면 캐시가 다른 origin용 응답을 재사용하지 않도록 `Vary: Origin`도 검토해야 합니다.

```http
Access-Control-Allow-Origin: https://app.example.com
Vary: Origin
```
— [Fetch Standard, CORS protocol and HTTP caches](https://fetch.spec.whatwg.org/#cors-protocol-and-http-caches) (확인: 2026-09-13)

## preflight는 실제 요청 전에 허용 여부를 묻습니다

모든 교차 출처 요청이 preflight를 거치는 것은 아닙니다. HTML `form`으로 가능한 범위를 넘어서는 method나 header를 사용하는 요청에는 브라우저가 CORS-preflight를 수행합니다.

예를 들어 `Authorization` header를 사용하는 `POST`를 생각해 보겠습니다.

```text
브라우저 ── OPTIONS + Origin + 허용 요청 method/header 질문 ─▶ API
브라우저 ◀─ 204 + ACAO + ACAM + ACAH ───────────────────── API
브라우저 ── POST + Authorization ─────────────────────────▶ API
브라우저 ◀─ 응답 + ACAO ───────────────────────────────── API
```

preflight 요청은 `OPTIONS` method를 사용하며, 다음 header로 이후 실제 요청의 조건을 알립니다.

```http
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Authorization, Content-Type
```

서버는 다음처럼 응답할 수 있습니다.

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Authorization, Content-Type
```

preflight 응답이 허용 조건을 충족하지 못하면 브라우저는 실제 `POST`를 보내지 않을 수 있습니다. preflight 응답 자체에도 CORS 조건이 필요하며, preflight request에는 credentials가 포함되지 않는다는 점도 구분해야 합니다.
— [Fetch Standard, CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol) (확인: 2026-09-13)

## credentials를 보내면 `*`를 쓸 수 없습니다

Cookie나 TLS client certificate 같은 credentials를 포함하는 요청은 더 좁은 허용 조건이 필요합니다.

```js
fetch('https://api.example.com/me', {
  credentials: 'include',
});
```

이때 서버는 구체적인 origin과 `true`를 함께 응답해야 합니다.

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
```

다음 조합은 credentials 요청의 응답을 브라우저가 JavaScript에 공유하게 만들지 못합니다.

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

단, `credentials: 'include'`라고 해서 Cookie가 반드시 전송되는 것은 아닙니다. Cookie의 `SameSite`, `Secure`, third-party cookie 정책 등 별도 조건도 만족해야 합니다. 또한 origin 값은 serialized origin과 정확히 일치해야 하므로 `https://app.example.com/`처럼 trailing slash를 붙이지 않습니다.
— [Fetch Standard, CORS protocol and credentials](https://fetch.spec.whatwg.org/#cors-protocol-and-credentials) (확인: 2026-09-13)

## `no-cors`는 CORS를 해결하는 옵션이 아닙니다

`mode: 'no-cors'`는 서버 응답을 JavaScript가 읽을 수 있게 만드는 설정이 아닙니다. 요청은 제한된 형태로 전송될 수 있지만, JavaScript에는 status·header·body를 읽기 어려운 opaque response가 반환됩니다.

```js
const response = await fetch('https://cdn.example.com/data.json', {
  mode: 'no-cors',
});

console.log(response.type); // opaque
```
— [Fetch Standard, filtered responses](https://fetch.spec.whatwg.org/#filtered-response) (확인: 2026-09-13)

## 응답 header도 별도로 노출해야 합니다

`Access-Control-Allow-Origin`이 있다고 해서 모든 응답 header를 JavaScript에서 읽을 수 있는 것은 아닙니다. 기본적으로 노출되는 CORS-safelisted response header 외의 header를 읽으려면 `Access-Control-Expose-Headers`에 이름을 적어야 합니다.

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Expose-Headers: X-Request-Id
X-Request-Id: 7f3a
```

그러면 다음 코드에서 `X-Request-Id`를 읽을 수 있습니다.

```js
const response = await fetch('https://api.example.com/users');
console.log(response.headers.get('X-Request-Id'));
```
— [Fetch Standard, HTTP responses](https://fetch.spec.whatwg.org/#http-responses) (확인: 2026-09-13)

## 실무에서 확인할 순서

CORS 오류를 만나면 브라우저 오류 문구만 보고 서버가 요청을 거부했다고 단정하지 말고 다음을 확인해야 합니다.

1. 요청의 `Origin`, method, 요청 header, credentials 설정과 `mode`를 확인합니다.
2. `OPTIONS` preflight가 있었다면 status와 `Access-Control-Allow-*` header를 확인합니다.
3. 실제 응답에 요청 origin과 일치하는 `Access-Control-Allow-Origin`이 있는지 확인합니다.
4. credentials 요청이면 `Access-Control-Allow-Credentials: true`와 Cookie의 `SameSite`·`Secure`·third-party 정책을 확인합니다.
5. JavaScript가 읽으려는 응답 header가 `Access-Control-Expose-Headers`에 포함됐는지 확인합니다.
6. origin별 응답을 캐시한다면 `Vary: Origin`이 있는지 확인합니다.

## 확인하지 못한 것

- **브라우저별 오류 메시지** — Chrome·Firefox·Safari를 직접 실행해 콘솔 메시지를 비교하지 않았습니다.
- **Cookie의 `SameSite`·`Secure` 세부 동작** — CORS 프로토콜 원문 범위를 넘어가며, 이 문서에서 별도로 검증하지 않았습니다.

*작성일: 2026-09-13*
