---
sidebar_position: 9
---

# Web Storage란 무엇인가

> **원문** — [HTML Standard, Web storage](https://html.spec.whatwg.org/multipage/webstorage.html)
>
> **확인 날짜** — 2026-09-12. HTML Standard는 판번호가 없는 Living Standard이며, 2026-09-08 갱신본입니다.
>
> **검증 상태** — Web Storage의 목적, `Storage` interface, `localStorage`, `sessionStorage`, `StorageEvent`를 원문으로 대조했습니다. 실제 브라우저의 저장 persistence와 quota는 직접 실행하지 않았습니다.

Web Storage는 브라우저 client 쪽에 name/value 쌍을 저장하는 API입니다. HTML Standard는 이를 HTTP session cookie와 비슷한 두 저장 메커니즘으로 소개하지만, Cookie처럼 HTTP request에 자동으로 header로 붙는 메커니즘은 아닙니다.

> This specification introduces two related mechanisms, similar to HTTP session cookies, for storing name-value pairs on the client side.
>
> **번역** — 이 명세는 client 쪽에 name-value 쌍을 저장하는 HTTP session cookie와 유사한 두 메커니즘을 도입합니다.
>
> — [HTML Standard, Web storage](https://html.spec.whatwg.org/multipage/webstorage.html) (확인: 2026-09-12)

## `localStorage`와 `sessionStorage`

```js
localStorage.setItem('theme', 'dark');
sessionStorage.setItem('checkoutStep', 'payment');

const theme = localStorage.getItem('theme');
const step = sessionStorage.getItem('checkoutStep');
```

두 API 모두 문자열 key와 문자열 value를 다룹니다. 객체를 저장하려면 애플리케이션이 JSON 직렬화와 역직렬화를 직접 해야 합니다.

```js
localStorage.setItem('profile', JSON.stringify({name: 'Tae'}));
const profile = JSON.parse(localStorage.getItem('profile'));
```

개념적으로는 다음처럼 구분할 수 있습니다.

| API | 주된 수명 모델 | 대표 용도 |
| --- | --- | --- |
| `localStorage` | user agent가 저장하는 동안 유지될 수 있음 | theme, 사용자 설정 |
| `sessionStorage` | 현재 top-level browsing context의 session에 귀속 | 현재 탭의 임시 단계 상태 |

정확한 persistence 시점과 quota는 브라우저의 저장 정책과 사용자 설정에 영향을 받을 수 있으므로, “무조건 영구 저장” 또는 “무조건 탭이 닫힐 때 삭제”라고 일반화하면 안 됩니다.

## Web Storage는 Cookie와 다릅니다

```text
Cookie
  서버가 Set-Cookie로 설정
  조건에 맞는 HTTP 요청에 Cookie header로 자동 전송

Web Storage
  JavaScript가 Storage API로 읽고 씀
  HTTP 요청에 자동으로 포함되지 않음
```

예를 들어 `localStorage.setItem('token', '...')`을 호출해도 이후 `fetch()` request에 자동으로 `Authorization` header가 생기지 않습니다. 애플리케이션이 직접 header를 만들어야 합니다.

```js
const token = localStorage.getItem('token');

fetch('/api/me', {
  headers: {Authorization: `Bearer ${token}`},
});
```

이 차이는 보안과 운영 방식에 직접 영향을 줍니다. Web Storage 값은 script가 읽을 수 있으므로 XSS가 발생하면 노출될 수 있고, Cookie의 `HttpOnly` 같은 속성을 그대로 제공하지 않습니다.

## 저장 영역은 origin과 연결됩니다

Web Storage API는 문서가 속한 origin과 연결된 저장 영역을 사용합니다. scheme·host·port가 다른 문서는 같은 문자열 key를 사용해도 같은 저장 영역을 자동으로 공유하지 않습니다.

```text
https://app.example.com  localStorage["theme"]
https://api.example.com  localStorage["theme"]
```

위 두 문서는 host가 다르므로 서로 다른 origin이며, `localStorage` 영역도 별개로 취급됩니다. Web Storage가 어느 문서에 노출되는지는 브라우저의 storage와 origin 규칙으로 결정됩니다.
— [HTML Standard, Web storage](https://html.spec.whatwg.org/multipage/webstorage.html) (확인: 2026-09-12)

## `StorageEvent`는 저장 변경을 관찰합니다

```js
window.addEventListener('storage', event => {
  console.log(event.key, event.newValue, event.url);
});
```

`StorageEvent`는 다른 문서에서 storage가 변경됐을 때 상태 동기화에 사용할 수 있습니다. 이 이벤트를 애플리케이션의 서버 동기화 완료 신호로 오해하면 안 됩니다. storage 변경은 client 저장 영역의 변화이며, 서버의 데이터베이스 변경과는 별개의 사건입니다.
— [HTML Standard, The `StorageEvent` interface](https://html.spec.whatwg.org/multipage/webstorage.html#the-storageevent-interface) (확인: 2026-09-12)

## 저장 실패도 정상적인 경우로 다뤄야 합니다

private browsing, 사용자 설정, quota 초과, storage 정책에 따라 저장이 실패할 수 있습니다. 따라서 Web Storage를 중요한 유일한 데이터 저장소로 사용하지 말고, 실패 시의 대체 동작과 데이터 손실 가능성을 설계해야 합니다.

또한 비밀번호·session secret·장기 bearer token처럼 XSS에 노출되면 치명적인 값을 무조건 Web Storage에 넣는 것은 신중해야 합니다. 저장 위치의 선택은 위협 모델과 애플리케이션의 인증 흐름을 함께 보고 결정해야 합니다.

## 확인하지 못한 것

- **브라우저별 quota·persistence** — Chrome·Firefox·Safari의 저장 용량과 eviction 정책을 직접 비교하지 않았습니다.
- **실행 출력** — 이 환경에 브라우저 실행 파일이 없어 `localStorage`·`sessionStorage` 예시를 실제 실행하지 않았습니다.

*작성일: 2026-09-12*
