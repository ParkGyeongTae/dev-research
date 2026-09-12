---
sidebar_position: 8
---

# Cookie란 무엇인가

> **원문** — [HTTP State Management Mechanism](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html)
>
> **확인 날짜** — 2026-09-13. 원문은 RFC 6265를 대체하는 IETF HTTP Working Group draft이며, 최종 RFC가 아닌 상태입니다.
>
> **검증 상태** — `Set-Cookie`·`Cookie` header, cookie 저장과 전송 조건, `Secure`·`HttpOnly`·`SameSite` 속성을 원문으로 대조했습니다. 실제 브라우저의 cookie store와 전송 여부는 직접 실행하지 않았습니다.

Cookie는 서버가 user agent에 name/value 쌍과 metadata를 저장하도록 지시하고, user agent가 이후 조건에 맞는 HTTP 요청에 그 값을 포함하는 메커니즘입니다. 서버가 브라우저 저장소를 직접 관리하는 것이 아니라, `Set-Cookie` response header로 저장을 지시하면 user agent가 cookie를 저장합니다.

> Using the Set-Cookie header field, an HTTP server can pass name/value pairs and associated metadata to a user agent.
>
> **번역** — HTTP 서버는 `Set-Cookie` header field를 사용해 name/value 쌍과 관련 metadata를 user agent에 전달할 수 있습니다.
>
> — [HTTP State Management Mechanism](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html) (확인: 2026-09-13)

## Cookie는 response에서 request로 이어집니다

```text
서버 → 브라우저
Set-Cookie: SID=abc123; Path=/account; Secure; HttpOnly

브라우저 → 서버
Cookie: SID=abc123
```

서버는 첫 응답의 `Set-Cookie`로 저장할 cookie를 지정합니다. 이후 브라우저가 요청 URL·경로·보안 연결·same-site 조건 등을 확인해 전송 대상으로 판단하면 `Cookie` request header에 값을 넣습니다.

서버가 `Cookie` header만 보고 cookie를 받았더라도 `Path`, `Domain`, 만료 시각, `Secure`, `HttpOnly` 같은 metadata를 request에서 복원할 수는 없습니다. 그런 metadata는 일반적으로 request header에 다시 실리지 않습니다.
— [HTTP State Management Mechanism, Cookie semantics](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#sane-cookie) (확인: 2026-09-13)

## Cookie의 scope가 전송 여부를 결정합니다

브라우저는 저장된 모든 cookie를 모든 요청에 보내지 않습니다. Domain 또는 host-only 규칙, Path, 만료 여부, secure channel, same-site 상태와 요청 문맥을 함께 사용해 전송 여부를 결정합니다.

```http
Set-Cookie: SID=abc123; Path=/account; Secure; HttpOnly; SameSite=Lax
```

이 예시에서:

- `Path=/account`: cookie의 URL path 범위를 좁힙니다. `/account`와 그 하위 경로에 적용되지만 `/admin`에는 적용되지 않습니다.
- `Secure`: secure channel에서만 전송하도록 합니다.
- `HttpOnly`: `document.cookie` 같은 non-HTTP API에서 script가 읽는 것을 제한합니다.
- `SameSite=Lax`: same-site 여부와 navigation·method 조건에 따라 cross-site 요청의 전송 여부를 제한합니다.

`Path`는 보안 경계가 아닙니다. 같은 host에서 동작하는 다른 path의 서비스가 cookie를 설정하거나 덮어쓸 수 있기 때문입니다. 또한 cookie는 port로 격리되지 않으므로 같은 host의 `:443`과 `:8443` 서비스가 같은 cookie를 읽거나 쓸 수 있습니다.
— [HTTP State Management Mechanism, Cookie attributes](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#cookie-attributes) (확인: 2026-09-13)
— [HTTP State Management Mechanism, Security considerations](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#security-considerations) (확인: 2026-09-13)

따라서 “같은 origin이 아니므로 cookie도 공유되지 않는다”라고 판단하면 안 됩니다. Cookie 전송은 same-origin policy가 아니라 cookie의 scope와 요청 문맥으로 판단해야 합니다.

## Cookie와 JavaScript

`HttpOnly`가 없는 cookie는 `document.cookie`를 통해 script에서 접근할 수 있습니다.

```js
console.log(document.cookie);
```

반대로 `HttpOnly` cookie는 HTTP 요청에는 사용될 수 있지만 non-HTTP API로 제공되지 않습니다. 따라서 session identifier처럼 JavaScript가 직접 읽을 필요가 없는 값에는 `HttpOnly`를 검토할 수 있습니다. 이것만으로 XSS나 session theft가 해결되는 것은 아니며, 출력 escaping·CSP·session 관리가 별도로 필요합니다.

## Cookie는 인증 자체가 아닙니다

Cookie는 session identifier나 preference를 운반하는 저장·전송 메커니즘입니다. Cookie 값의 의미와 사용자의 권한은 서버 애플리케이션이 정의합니다. 서버는 cookie를 받았다는 사실만으로 충분하다고 판단하지 말고 session 만료·회전·권한 검사를 수행해야 합니다.

## 확인하지 못한 것

- **브라우저별 cookie 정책** — third-party cookie 차단, partitioning, 사용자 privacy 설정은 브라우저와 버전에 따라 달라질 수 있어 비교하지 않았습니다.
- **최종 RFC 판본** — 확인한 원문은 RFC 6265를 대체하는 draft이며, 최종 RFC 발행 여부는 별도 확인하지 않았습니다.

*작성일: 2026-09-13*
