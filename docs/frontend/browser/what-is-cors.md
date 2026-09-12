---
sidebar_position: 3
---

# CORS란 무엇인가

> **원문** — [Fetch Standard, CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol)
>
> **확인 날짜** — 2026-09-12. Fetch Standard는 판번호가 없는 Living Standard이며, 원문에는 2026-09-02 갱신으로 표시되어 있습니다.
>
> **검증 상태** — CORS의 목적, HTTP 헤더, preflight, credentials, CORS check를 원문으로 대조했습니다. 실제 브라우저의 네트워크·콘솔 출력은 이 환경에서 브라우저를 실행하지 못해 직접 확인하지 않았습니다.

CORS(Cross-Origin Resource Sharing)는 브라우저가 한 origin의 JavaScript에 다른 origin의 응답을 공유할지를 서버가 HTTP 헤더로 선언하는 프로토콜입니다.

> To allow sharing responses cross-origin and allow for more versatile fetches than possible with HTML’s `form` element, the CORS protocol exists.
>
> **번역** — HTML의 `form` 요소로 가능한 것보다 유연한 fetch와 교차 출처 응답 공유를 허용하기 위해 CORS 프로토콜이 존재합니다.
>
> — [Fetch Standard, CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol) (확인: 2026-09-12)

여기서 origin은 scheme·host·port의 조합입니다. 예를 들어 `https://app.example.com`과 `https://api.example.com`은 host가 다르므로 서로 다른 origin입니다. 따라서 app의 JavaScript가 api의 JSON 응답을 읽으려면 api 서버가 그 공유를 허용해야 합니다.

## 브라우저가 요청을 보낸 것과 응답을 읽게 한 것은 다릅니다

다음과 같은 교차 출처 CORS 요청에서 브라우저는 `Origin` 요청 헤더로 요청을 시작한 origin을 보냅니다.

```js
fetch('https://api.example.com/users')
  .then(response => response.json());
```

서버가 다음 응답 헤더를 보냈다고 가정하겠습니다.

```http
Access-Control-Allow-Origin: https://app.example.com
```

페이지가 실제로 `https://app.example.com`에서 실행 중이라면 브라우저는 응답을 JavaScript에 공유할 수 있습니다. 헤더가 없거나 값이 요청 origin과 맞지 않으면 서버가 요청을 처리했더라도 JavaScript는 응답을 읽지 못합니다. Fetch Standard의 CORS check가 실패하면 fetch 결과가 network error로 처리되기 때문입니다.
— [Fetch Standard, CORS check](https://fetch.spec.whatwg.org/#cors-check) (확인: 2026-09-12)

즉, CORS 오류는 항상 “서버에 요청이 도착하지 않았다”는 뜻이 아닙니다. 서버 로그와 브라우저 JavaScript가 관측하는 결과가 다를 수 있습니다.

## preflight는 실제 요청 전에 허용 여부를 묻습니다

모든 교차 출처 요청이 preflight를 거치는 것은 아닙니다. HTML `form`으로 가능한 범위를 넘어서는 요청에는 브라우저가 CORS-preflight를 수행합니다.
— [Fetch Standard, CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol) (확인: 2026-09-12)

예를 들어 `Authorization` 요청 헤더를 사용하는 `POST`를 생각해 보겠습니다.

```text
브라우저 ── OPTIONS + Origin + 허용 요청 method/header 질문 ─▶ API
브라우저 ◀─ 204 + ACAO + ACAM + ACAH ───────────────────── API
브라우저 ── POST + Authorization ─────────────────────────▶ API
브라우저 ◀─ 응답 + ACAO ───────────────────────────────── API
```

preflight 요청은 `OPTIONS` method를 사용하며, 다음 헤더로 이후 실제 요청의 조건을 알립니다.

```http
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Authorization, Content-Type
```

서버는 최소한 다음과 같이 응답할 수 있습니다.

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Authorization, Content-Type
```

preflight 응답이 허용 조건을 충족하지 못하면 브라우저는 실제 `POST`를 보내지 않을 수 있습니다. 반대로 preflight가 없었다는 사실만으로 CORS가 적용되지 않는다고 판단할 수는 없습니다. 요청 방식과 헤더가 preflight 조건에 해당하는지를 브라우저가 평가하기 때문입니다.
— [Fetch Standard, HTTP requests and responses](https://fetch.spec.whatwg.org/#http-requests) (확인: 2026-09-12)

## credentials를 보내면 `*`를 쓸 수 없습니다

Cookie나 TLS client certificate 같은 credentials를 포함하는 요청은 더 좁은 허용 조건이 필요합니다. 다음처럼 `fetch`에서 credentials를 명시할 수 있습니다.

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

Fetch Standard는 credentials mode가 `include`일 때 `Access-Control-Allow-Origin`에 `*`를 사용할 수 없다고 규정합니다. 또한 `Access-Control-Allow-Credentials`의 값은 대소문자를 구분하는 `true`여야 합니다.
— [Fetch Standard, CORS protocol and credentials](https://fetch.spec.whatwg.org/#cors-protocol-and-credentials) (확인: 2026-09-12)

CORS 헤더는 인증·인가를 대신하지 않습니다. CORS가 허용되어도 서버는 별도로 사용자의 인증 상태와 API 권한을 검사해야 합니다.

## 응답 헤더도 별도로 노출해야 합니다

`Access-Control-Allow-Origin`이 있다고 해서 모든 응답 헤더를 JavaScript에서 읽을 수 있는 것은 아닙니다. 기본적으로 노출되는 CORS-safelisted response headers 외의 응답 헤더를 읽으려면 서버가 `Access-Control-Expose-Headers`에 이름을 적어야 합니다.

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

— [Fetch Standard, HTTP responses](https://fetch.spec.whatwg.org/#http-responses) (확인: 2026-09-12)

## 실무에서 확인할 순서

CORS 오류를 만나면 브라우저 오류 문구만 보고 서버가 요청을 거부했다고 단정하지 말고 다음을 확인해야 합니다.

1. 요청의 `Origin`, method, 요청 헤더, credentials 설정을 확인합니다.
2. `OPTIONS` preflight가 있었다면 status와 `Access-Control-Allow-*` 헤더를 확인합니다.
3. 실제 응답에 요청 origin과 일치하는 `Access-Control-Allow-Origin`이 있는지 확인합니다.
4. credentials 요청이면 `Access-Control-Allow-Credentials: true`와 Cookie의 별도 정책을 확인합니다.
5. JavaScript가 읽으려는 응답 헤더가 `Access-Control-Expose-Headers`에 포함됐는지 확인합니다.

## 확인하지 못한 것

- **브라우저별 오류 메시지** — Chrome·Firefox·Safari를 직접 실행해 콘솔 메시지를 비교하지 않았습니다.
- **Cookie의 `SameSite`·`Secure` 세부 동작** — CORS 프로토콜 원문 범위를 넘어가며, 이 문서에서 별도로 검증하지 않았습니다.

*작성일: 2026-09-12*
