---
sidebar_position: 8
---

# Cookie란 무엇인가

> **원문** — [HTTP State Management Mechanism](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html)
>
> **확인 날짜** — 2026-09-12. 원문은 RFC 6265를 대체하는 IETF HTTP Working Group draft이며, 아직 최종 RFC가 아니라는 상태를 확인했습니다.
>
> **검증 상태** — `Set-Cookie`·`Cookie` header, cookie scope, `Secure`·`HttpOnly`·`SameSite` 속성을 원문으로 대조했습니다. 실제 브라우저의 cookie store와 전송 여부는 직접 실행하지 않았습니다.

Cookie는 HTTP 서버가 user agent에 name/value 상태를 저장시키고, 이후 조건에 맞는 요청에 다시 보내도록 하는 메커니즘입니다. 서버는 `Set-Cookie` response header로 cookie를 설정하고, 브라우저는 이후 request의 `Cookie` header에 해당 값을 포함할 수 있습니다.

> Using the Set-Cookie header field, an HTTP server can pass name/value pairs and associated metadata to a user agent.
>
> **번역** — HTTP 서버는 `Set-Cookie` header field를 사용해 name/value 쌍과 관련 metadata를 user agent에 전달할 수 있습니다.
>
> — [HTTP State Management Mechanism](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html) (확인: 2026-09-12)

## Cookie는 response에서 request로 이어집니다

```text
서버 → 브라우저
Set-Cookie: SID=abc123; Path=/; Secure; HttpOnly

브라우저 → 서버
Cookie: SID=abc123
```

Cookie의 핵심은 서버가 상태를 직접 브라우저에 저장하는 것이 아니라, user agent가 보관한 값을 이후 요청 조건에 맞춰 자동으로 전송한다는 점입니다. 서버는 `Cookie` header만 보고 cookie의 `Path`, `Domain`, 만료 시각, `Secure`, `HttpOnly` 속성을 알 수 없습니다. 그런 metadata는 request에서 다시 전송되지 않습니다.
— [HTTP State Management Mechanism, Cookie semantics](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#sane-cookie) (확인: 2026-09-12)

## Cookie의 scope가 전송 여부를 결정합니다

브라우저는 저장된 모든 cookie를 모든 요청에 보내지 않습니다. Domain·Path·만료·secure channel·same-site 상태 등을 조건으로 요청에 포함할 cookie를 결정합니다.

```http
Set-Cookie: SID=abc123; Path=/account; Secure; HttpOnly; SameSite=Lax
```

이 예시에서:

- `Path=/account`: 지정된 path 범위와 맞는 요청에만 적용됩니다.
- `Secure`: secure channel에서만 전송됩니다.
- `HttpOnly`: non-HTTP API를 통한 script 접근을 제한합니다.
- `SameSite=Lax`: same-site 조건과 navigation·method 조건에 따라 전송 여부가 달라집니다.

Cookie의 `Path`는 보안 경계로 의존할 수 없습니다. 같은 host의 다른 path에서 동작하는 서비스가 cookie를 설정하거나 덮어쓸 수 있기 때문입니다.
— [HTTP State Management Mechanism, Cookie attributes](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#cookie-attributes) (확인: 2026-09-12)

## Cookie와 origin은 같은 범위 모델이 아닙니다

Cookie는 일반적인 same-origin policy와 다른 범위 규칙을 가집니다. 특히 cookie는 host가 같으면 port를 분리하지 않습니다. 예를 들어 같은 host의 `:443` 서비스와 `:8443` 서비스 사이에 cookie가 공유될 수 있습니다.
— [HTTP State Management Mechanism, Security considerations](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#security-considerations) (확인: 2026-09-12)

따라서 “같은 origin이 아니므로 cookie도 공유되지 않는다”라고 판단하면 안 됩니다. Cookie 전송은 cookie의 Domain·Path·Secure·SameSite 조건과 요청 문맥으로 판단해야 합니다.

## Cookie와 JavaScript

`HttpOnly`가 없는 cookie는 `document.cookie`를 통해 script에서 접근할 수 있습니다.

```js
console.log(document.cookie);
```

반대로 `HttpOnly` cookie는 HTTP 요청에는 사용될 수 있지만 non-HTTP API로 제공되지 않습니다. 그래서 session identifier처럼 JavaScript가 직접 읽을 필요가 없는 값에는 `HttpOnly`를 검토할 수 있습니다. 이것만으로 XSS나 session theft가 모두 해결되는 것은 아니며, 출력 escaping·CSP·session 관리가 별도로 필요합니다.

## Cookie는 인증 자체가 아닙니다

Cookie는 session identifier나 preference를 운반하는 저장·전송 메커니즘입니다. Cookie 값의 의미와 사용자의 권한은 서버 애플리케이션이 정의합니다. 서버는 cookie를 받았다는 사실만으로 충분하다고 판단하지 말고 session 만료·회전·권한 검사를 수행해야 합니다.

## 확인하지 못한 것

- **브라우저별 cookie 정책** — third-party cookie 차단, partitioning, 사용자 privacy 설정은 브라우저와 버전에 따라 달라질 수 있어 비교하지 않았습니다.
- **최종 RFC 판본** — 확인한 원문은 RFC 6265를 대체하는 draft이며, 최종 RFC 발행 여부는 이 문서 작성 시점에 확인하지 않았습니다.

*작성일: 2026-09-12*
