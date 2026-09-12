---
sidebar_position: 2
---

# origin과 same-origin policy는 브라우저의 접근을 어떻게 제한하는가

> **원문** — [HTML Standard, Origin](https://html.spec.whatwg.org/multipage/origin.html) · [Fetch Standard, CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol)
>
> **확인 날짜** — 2026-09-12. HTML Standard와 Fetch Standard는 판번호가 없는 Living Standard이며, Fetch Standard는 2026-09-02 갱신본입니다.
>
> **검증 상태** — origin의 구성과 same-origin policy의 개념을 원문으로 대조했습니다. 실제 브라우저의 접근 차단 화면은 이 환경에서 브라우저를 실행하지 못해 직접 확인하지 않았습니다.

브라우저 보안에서 먼저 구분해야 할 것은 **origin**과 **site**입니다. `https://app.example.com`과 `https://api.example.com`은 같은 조직의 도메인처럼 보이지만 host가 다르므로 서로 다른 origin입니다.

origin은 일반적으로 scheme·host·port의 조합으로 이해할 수 있습니다. path와 fragment가 다른 것만으로는 origin이 달라지지 않습니다.

| 주소 | 기준 주소와 달라지는 요소 |
| --- | --- |
| `https://app.example.com/a` | 기준 |
| `https://api.example.com/a` | host |
| `http://app.example.com/a` | scheme |
| `https://app.example.com:8443/a` | port |
| `https://app.example.com/b` | path만 다르므로 origin은 같음 |

> A tuple origin consists of a scheme, a host, a port, and a domain.
>
> **번역** — tuple origin은 scheme·host·port·domain으로 구성됩니다.
>
> — [HTML Standard, Origin](https://html.spec.whatwg.org/multipage/origin.html#concept-origin) (확인: 2026-09-12)

## same-origin policy는 읽기 권한의 경계입니다

same-origin policy는 한 origin에서 실행되는 문서의 스크립트가 다른 origin의 문서·응답 데이터에 자유롭게 접근하지 못하게 하는 브라우저의 보안 경계입니다.

예를 들어 `https://app.example.com`에서 실행되는 다음 코드는 `https://api.example.com`의 응답을 읽으려 합니다.

```js
const response = await fetch('https://api.example.com/users');
const users = await response.json();
```

두 주소는 host가 달라 서로 다른 origin입니다. 따라서 브라우저는 서버가 요청을 처리했는지와 별개로, 응답을 호출한 JavaScript에 공개해도 되는지 검사합니다. 서버가 요청을 받았다는 사실만으로 응답 본문을 읽을 권한이 생기지는 않습니다.

이 구분이 필요한 이유는 사용자가 로그인한 내부 서비스나 사설 네트워크의 응답을, 악성 웹 페이지가 사용자를 대신해 읽지 못하게 하기 위해서입니다. 출처가 다르다는 사실 자체가 악성이라는 뜻은 아니지만, 브라우저는 기본적으로 교차 origin 읽기를 허용하지 않고 서버의 명시적인 의사를 요구합니다.

## 요청할 수 있음과 응답을 읽을 수 있음은 다릅니다

교차 origin 접근은 자원 종류와 브라우저 API에 따라 허용 방식이 다릅니다. 다른 origin의 이미지를 문서에 표시하는 것과 그 이미지의 픽셀 데이터를 JavaScript로 읽는 것은 같은 권한이 아닙니다. 전자는 렌더링 목적의 사용일 수 있지만, 후자는 데이터 읽기이므로 별도 보안 검사가 적용될 수 있습니다.

`fetch()`의 교차 origin 응답 공유는 CORS라는 HTTP 기반 opt-in 프로토콜로 제어됩니다. 서버가 다음처럼 응답하면 특정 origin에 응답을 공유하겠다는 뜻입니다.

```http
Access-Control-Allow-Origin: https://app.example.com
```

CORS는 same-origin policy와 같은 말이 아닙니다. same-origin policy가 기본 보안 경계를 제공하고, CORS는 서버가 그 경계 밖의 응답을 특정 origin에 공유하겠다고 선언하는 방식입니다.
— [Fetch Standard, CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol) (확인: 2026-09-12)

따라서 CORS 헤더가 없으면 “서버가 요청을 처리하지 않았다”가 아니라 “브라우저가 JavaScript에 응답을 공개하지 않았다”일 수 있습니다. 반대로 CORS 헤더가 있다고 해서 서버의 인증·인가가 자동으로 수행되거나 API가 안전해지는 것도 아닙니다.

## origin 비교에서 path를 보면 안 되는 이유

다음 두 URL은 path가 다르지만 origin은 같습니다.

```text
https://app.example.com/a
https://app.example.com/b
```

origin 비교는 URL 전체 문자열 비교가 아닙니다. scheme·host·port가 같은지 먼저 봐야 합니다. path까지 다르다는 이유로 서로 다른 origin이라고 판단하면, same-origin policy가 적용되는 경계를 잘못 이해하게 됩니다.

반대로 다음 두 URL은 subdomain만 달라도 서로 다른 origin입니다.

```text
https://app.example.com
https://api.example.com
```

두 서비스가 같은 상위 도메인 아래 있고 같은 회사가 운영하더라도, 브라우저의 origin 비교에서는 host가 다릅니다. 이때 교차 origin 응답을 JavaScript가 읽으려면 서버와 브라우저가 CORS 절차를 따라야 합니다.

## 확인하지 못한 것

- **브라우저별 차이** — Chrome·Firefox·Safari에서 DOM 접근과 `fetch()` 차단 동작을 직접 비교하지 않았습니다.
- **예외 API의 세부 규칙** — 이미지·iframe·canvas·WebSocket 등 자원 종류별 예외는 이 문서의 범위를 넘어가며, 각 표준을 별도로 대조하지 않았습니다.

*작성일: 2026-09-12*
