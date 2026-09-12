---
sidebar_position: 9
---

# Web Storage란 무엇인가

> **원문** — [HTML Standard, Web storage](https://html.spec.whatwg.org/multipage/webstorage.html)
>
> **확인 날짜** — 2026-09-13. HTML Standard는 판번호가 없는 Living Standard이며, 2026-09-08 갱신본입니다.
>
> **검증 상태** — Web Storage의 목적, `Storage` interface, `localStorage`, `sessionStorage`, `StorageEvent`, 저장 실패 조건을 원문으로 대조했습니다. 실제 브라우저의 persistence와 quota는 직접 실행하지 않았습니다.

Web Storage는 브라우저 client 쪽에 name/value 쌍을 저장하는 API입니다. HTML Standard는 이를 HTTP session cookie와 비슷한 두 저장 메커니즘으로 소개하지만, Cookie처럼 HTTP request에 자동으로 header로 붙는 메커니즘은 아닙니다.

> This specification introduces two related mechanisms, similar to HTTP session cookies, for storing name-value pairs on the client side.
>
> **번역** — 이 명세는 client 쪽에 name-value 쌍을 저장하는 HTTP session cookie와 유사한 두 메커니즘을 도입합니다.
>
> — [HTML Standard, Web storage](https://html.spec.whatwg.org/multipage/webstorage.html) (확인: 2026-09-13)

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
const profileText = localStorage.getItem('profile');
const profile = profileText === null ? null : JSON.parse(profileText);
```

| API | 주된 수명 모델 | 대표 용도 |
| --- | --- | --- |
| `localStorage` | 같은 origin에서 user agent가 유지하는 동안 공유될 수 있음 | theme, 사용자 설정 |
| `sessionStorage` | origin과 현재 top-level browsing context의 session에 귀속 | 현재 탭의 임시 단계 상태 |

“영구”와 “탭이 닫히면 반드시 삭제”는 브라우저 저장 정책·사용자 설정·browsing context 복제 방식까지 고려해야 하므로 무조건적인 규칙으로 쓰면 안 됩니다.
— [HTML Standard, Web storage](https://html.spec.whatwg.org/multipage/webstorage.html) (확인: 2026-09-13)

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

Web Storage 값은 script가 읽을 수 있으므로 XSS가 발생하면 노출될 수 있고, Cookie의 `HttpOnly` 같은 속성을 제공하지 않습니다. 따라서 비밀번호·session secret·장기 bearer token처럼 XSS 노출의 영향이 큰 값을 무조건 Web Storage에 넣는 것은 피하고, 위협 모델과 인증 흐름을 함께 보고 저장 위치를 정해야 합니다.

## 저장 영역은 origin과 browsing context에 연결됩니다

Web Storage API는 문서의 origin과 연결된 저장 영역을 사용합니다. scheme·host·port가 다른 문서는 같은 문자열 key를 사용해도 같은 저장 영역을 자동으로 공유하지 않습니다.

```text
https://app.example.com  localStorage["theme"]
https://api.example.com  localStorage["theme"]
```

위 두 문서는 host가 다르므로 서로 다른 origin이며 `localStorage` 영역도 별개입니다. 같은 origin의 iframe은 `localStorage`를 공유할 수 있지만, `sessionStorage`는 top-level browsing context까지 같은지 확인해야 합니다.
— [HTML Standard, Web storage](https://html.spec.whatwg.org/multipage/webstorage.html) (확인: 2026-09-13)

## 저장 실패를 정상적인 분기로 다뤄야 합니다

사용자가 storage를 차단했거나 quota를 초과하면 값을 설정하는 작업이 `QuotaExceededError`를 발생시킬 수 있습니다. 따라서 중요한 유일한 데이터 저장소로 가정하지 말고 예외 처리와 데이터 손실 시의 대체 동작을 설계해야 합니다.

```js
try {
  localStorage.setItem('draft', JSON.stringify(draft));
} catch (error) {
  console.error('브라우저 저장소에 임시 저장하지 못했습니다.', error);
}
```
— [HTML Standard, `Storage.setItem()`](https://html.spec.whatwg.org/multipage/webstorage.html#dom-storage-setitem) (확인: 2026-09-13)

또한 Web Storage API는 동기식이므로 큰 값을 반복해서 읽고 쓰면 main thread 처리에 영향을 줄 수 있습니다. 저장량이 크거나 구조화된 비동기 저장이 필요하면 다른 저장 API를 검토해야 합니다.

## `StorageEvent`는 다른 문서의 변경을 관찰합니다

```js
window.addEventListener('storage', event => {
  console.log(event.key, event.oldValue, event.newValue, event.url);
});
```

`storage` event는 storage 변경을 일으킨 문서가 아니라, 조건에 맞는 다른 `Window`에 전달됩니다. `localStorage` 변경은 같은 origin의 다른 문서가 관찰할 수 있고, `sessionStorage` 변경은 같은 top-level browsing context 안의 다른 문서가 대상이 됩니다.

이 이벤트는 client 저장 영역의 변화 알림이지 서버의 데이터베이스 변경이나 서버 동기화 완료 신호가 아닙니다. 또한 애플리케이션의 현재 문서에서 `setItem()`을 호출했다고 그 문서의 listener가 같은 이벤트를 받는다고 가정하면 안 됩니다.
— [HTML Standard, The `StorageEvent` interface](https://html.spec.whatwg.org/multipage/webstorage.html#the-storageevent-interface) (확인: 2026-09-13)

## 확인하지 못한 것

- **브라우저별 quota·persistence** — Chrome·Firefox·Safari의 저장 용량과 eviction 정책을 직접 비교하지 않았습니다.
- **실행 출력** — 이 환경에 브라우저 실행 파일이 없어 `localStorage`·`sessionStorage` 예시를 실제 실행하지 않았습니다.

*작성일: 2026-09-13*
