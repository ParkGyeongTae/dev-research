---
sidebar_position: 3
---

# origin과 CORS는 브라우저의 교차 출처 접근을 어떻게 제한하는가

> **원문** — [HTML Standard, Origin](https://html.spec.whatwg.org/multipage/origin.html) · [Fetch Standard, CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol)
>
> **확인 날짜** — 2026-09-12. 두 Living Standard의 현재 원문을 확인했습니다. Fetch Standard는 2026-09-02 갱신본입니다.
>
> **검증 상태** — origin의 구성과 CORS 알고리즘을 원문으로 대조했습니다. 실제 브라우저의 fetch 차단 화면은 이 환경에서 브라우저를 실행하지 못해 직접 확인하지 않았습니다.

`https://app.example.com`에서 `https://api.example.com`을 호출할 때 브라우저는 두 주소가 같은 사이트처럼 보이는지보다 먼저 **같은 origin인지**를 따집니다. origin은 일반적으로 scheme, host, port의 조합입니다. path와 fragment는 origin에 포함되지 않습니다.

> A tuple origin consists of a scheme, a host, a port, and a domain.
>
> **번역** — tuple origin은 scheme·host·port·domain으로 구성됩니다.
>
> — [HTML Standard, Origin](https://html.spec.whatwg.org/multipage/origin.html#concept-origin) (확인: 2026-09-12)

예를 들어 다음은 서로 다른 origin입니다.

| 주소 | 다른 주소와 달라지는 요소 |
| --- | --- |
| `https://app.example.com/a` | 기준 |
| `https://api.example.com/a` | host |
| `http://app.example.com/a` | scheme |
| `https://app.example.com:8443/a` | port |
| `https://app.example.com/b` | path만 다르므로 origin은 같음 |

## 1. same-origin policy와 CORS는 같은 말이 아닙니다

same-origin policy는 한 origin의 문서가 다른 origin의 자원과 DOM·응답 데이터를 자유롭게 읽지 못하도록 하는 브라우저의 보안 경계입니다. 반면 CORS는 서버가 특정 교차 origin 응답을 공유해도 된다고 HTTP 헤더로 명시하는 opt-in 프로토콜입니다.

> To allow sharing responses cross-origin ... the CORS protocol exists. It is layered on top of HTTP and allows responses to declare they can be shared with other origins.
>
> **번역** — 교차 origin 응답을 공유하기 위해 CORS 프로토콜이 존재합니다. CORS는 HTTP 위에 놓이며, 응답이 다른 origin과 공유될 수 있는지를 선언하게 합니다.
>
> — [Fetch Standard, CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol) (확인: 2026-09-12)

핵심은 서버가 응답을 보낼 수 있느냐와 JavaScript가 그 응답을 읽을 수 있느냐가 다르다는 점입니다. 서버가 요청을 받았다는 사실만으로 브라우저의 JavaScript가 응답 본문을 읽을 권한을 얻지는 않습니다.

## 2. 단순 요청은 preflight 없이 전송될 수 있습니다

모든 교차 origin 요청이 먼저 `OPTIONS`를 보내는 것은 아닙니다. Fetch Standard는 HTML `form`으로 가능한 범위를 넘어서는 요청에 CORS-preflight를 수행한다고 설명합니다. preflight가 필요한 경우 브라우저는 실제 요청 전에 `OPTIONS` 요청으로 method와 header 사용 가능 여부를 확인합니다.
— [Fetch Standard, CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol) (확인: 2026-09-12)

```text
단순한 교차 origin GET
브라우저 ── GET + Origin ──▶ API
브라우저 ◀─ 응답 + ACAO ─── API

preflight가 필요한 요청
브라우저 ── OPTIONS + 허용할 method/header 질문 ─▶ API
브라우저 ◀─ ACAO + ACAM + ACAH ─────────────── API
브라우저 ── 실제 요청 ───────────────────────▶ API
```

가장 작은 서버 응답 예시는 다음과 같습니다.

```http
Access-Control-Allow-Origin: https://app.example.com
```

이 헤더는 해당 origin에서 응답을 공유할 수 있다는 뜻입니다. JSON `POST`나 `Authorization` 같은 요청 header가 포함되면 preflight 응답에 다음과 같은 허용 정보가 더 필요할 수 있습니다.

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Authorization, Content-Type
```

실제 허용 여부는 요청 method·header·credentials mode와 응답 헤더를 함께 평가합니다. `OPTIONS`가 보였다는 사실만으로 실제 POST가 성공했다는 뜻도 아니고, OPTIONS가 없다고 CORS가 적용되지 않는다는 뜻도 아닙니다.

## 3. credentials를 포함하면 허용 범위가 더 좁아집니다

```js
fetch('https://api.example.com/me', {
  credentials: 'include',
});
```

credentials에는 Cookie 등이 포함될 수 있습니다. 이 경우 서버는 명시적인 `Access-Control-Allow-Credentials: true`와 구체적인 `Access-Control-Allow-Origin`을 사용해야 합니다. `Access-Control-Allow-Origin: *`는 credentials를 포함한 요청의 응답 공유에 사용할 수 없습니다.
— [Fetch Standard, CORS protocol and credentials](https://fetch.spec.whatwg.org/#cors-protocol-and-credentials) (확인: 2026-09-12)

따라서 다음 조합은 의도한 인증 교차 요청을 허용하지 않습니다.

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

또한 CORS는 서버의 인증·인가 자체를 대신하지 않습니다. CORS 헤더가 있다고 해서 API가 누구에게나 접근을 허용해야 한다는 뜻은 아니며, 서버는 별도로 인증과 권한을 검사해야 합니다.

## 4. 실패 증상은 요청이 없었다는 뜻이 아닙니다

브라우저에서 다음 코드가 실패할 수 있습니다.

```js
fetch('https://api.example.com/private')
  .then(response => response.json())
  .catch(error => console.error(error));
```

서버 로그에는 요청이 남았는데 브라우저 JavaScript에는 CORS 오류가 보일 수 있습니다. Fetch Standard의 CORS check가 실패하면 fetch 결과를 network error로 처리하기 때문입니다.
— [Fetch Standard, CORS check](https://fetch.spec.whatwg.org/#cors-check) (확인: 2026-09-12)

그러므로 디버깅 순서는 다음이 적절합니다.

1. 실제 요청이 서버에 도착했는지 확인합니다.
2. 요청의 `Origin`, method, 요청 header, credentials mode를 확인합니다.
3. preflight가 있었다면 `OPTIONS` 응답의 status와 허용 헤더를 확인합니다.
4. 실제 응답에 요청 origin과 일치하는 `Access-Control-Allow-Origin`이 있는지 확인합니다.
5. 인증 요청이면 `Access-Control-Allow-Credentials`와 Cookie의 `SameSite`·secure 조건을 별도로 확인합니다.

## 확인하지 못한 것

- **브라우저별 CORS 오류 메시지** — Chrome·Firefox·Safari를 직접 실행해 콘솔 메시지를 비교하지 않았습니다.
- **서버의 Cookie 정책** — CORS만 다루는 문서이므로 `SameSite`의 세부 동작과 서버 인증 설정은 이 문서에서 검증하지 않았습니다.

*작성일: 2026-09-12*
