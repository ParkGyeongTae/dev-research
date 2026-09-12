---
sidebar_position: 6
---

# 브라우저 navigation이란 무엇인가

> **원문** — [HTML Standard, Navigation and session history](https://html.spec.whatwg.org/multipage/browsing-the-web.html)
>
> **확인 날짜** — 2026-09-13. HTML Standard는 판번호가 없는 Living Standard이며, 2026-09-08 갱신본입니다.
>
> **검증 상태** — navigation, navigable, Document, session history와 same-document navigation의 관계를 원문으로 대조했습니다. 실제 브라우저의 history·iframe 동작은 직접 실행하지 않았습니다.

navigation은 브라우저가 현재 navigable의 active document 또는 history 상태를 다른 URL·fragment·history entry에 맞게 이동시키는 과정입니다. 일반적인 cross-document navigation에서는 URL을 fetch하고 새 `Document`를 표시하지만, fragment 이동과 SPA의 same-document navigation처럼 기존 `Document`를 유지하는 경우도 있습니다.

> The user is looking at a navigable that is presenting its active document. They navigate it to another URL.
>
> **번역** — 사용자는 active document를 표시하는 navigable을 보고 있으며, 그 navigable을 다른 URL로 이동시킵니다.
>
> — [HTML Standard, Navigation and session history](https://html.spec.whatwg.org/multipage/browsing-the-web.html) (확인: 2026-09-13)

## 일반적인 navigation은 새 Document를 표시합니다

```text
현재 탭이 Document A를 표시
          ↓ navigation to /next
URL fetch
          ↓
Document B 생성
          ↓
탭이 Document B를 표시하고 history entry 갱신
```

HTML Standard가 설명하는 일반적인 cross-document navigation에서는 브라우저가 URL을 fetch하고 새 session history entry에 새 `Document`를 채운 뒤 active document를 갱신합니다. 그러나 모든 navigation이 이 흐름을 따르는 것은 아닙니다.
— [HTML Standard, Navigation and session history](https://html.spec.whatwg.org/multipage/browsing-the-web.html) (확인: 2026-09-13)

응답이 `204`·`205`이거나 다운로드를 지시하는 `Content-Disposition: attachment`를 포함하면 새 문서를 표시하지 않고 navigation이 중단될 수 있습니다. fragment 이동과 SPA navigation은 기존 `Document`를 유지하면서 history만 바꾸거나 문서 상태를 바꿀 수 있습니다.
— [HTML Standard, ending navigation and same-document navigation](https://html.spec.whatwg.org/multipage/browsing-the-web.html#ending-navigation) (확인: 2026-09-13)

## 링크 클릭과 JavaScript 이동

```html
<a href="/orders">주문 보기</a>
```

사용자가 링크를 클릭하면 브라우저는 `/orders`를 대상으로 navigation을 시작할 수 있습니다. JavaScript에서도 다음과 같이 시작할 수 있습니다.

```js
location.assign('/orders');
```

이때 `/orders`의 응답이 HTML이면 브라우저는 이를 새 `Document`로 처리하고 HTML parsing·DOM 구성·script 실행·rendering을 이어 갑니다. 응답이 204이거나 다운로드를 지시하는 경우처럼 새 문서를 표시하지 않고 navigation이 중단되는 경우도 있습니다.

## navigation과 fetch는 다릅니다

```js
const response = await fetch('/api/orders');
const orders = await response.json();
```

이 코드는 데이터를 가져오지만 현재 탭이 새 `Document`를 표시하도록 바꾸지는 않습니다. 반면 링크 클릭으로 `/orders`를 열면 navigation이 일어나고, 그 결과 새 `Document`가 표시될 수 있습니다.

navigation도 URL을 가져오고 history entry를 채우는 과정에서 fetching을 사용합니다. 따라서 둘의 관계는 다음처럼 정리할 수 있습니다.

```text
navigation
  └─ 문서를 채우기 위한 fetch와 Document/history 처리

fetch()
  └─ JavaScript가 호출하는 resource retrieval
```

## session history와 back/forward

새 cross-document navigation은 보통 session history에 새 entry를 추가합니다. 반면 reload·history traversal·same-document navigation은 기존 history 구조와 문서를 다른 방식으로 갱신할 수 있습니다.

```text
history: [/home] → [/orders] → [/orders/42]
                                  ↑ 현재
```

뒤로 가기를 누르면 브라우저는 이전 entry로 history traversal을 수행합니다. 해당 entry의 `Document`가 bfcache에 남아 있으면 재활성화할 수 있고, 없으면 entry의 URL을 다시 fetch해 새 문서를 채울 수 있습니다. 따라서 back 동작은 항상 URL을 처음부터 로드하는 것과 같지 않습니다.
— [HTML Standard, session history and bfcache](https://html.spec.whatwg.org/multipage/browsing-the-web.html#session-history) (확인: 2026-09-13)

`history.pushState()`나 fragment navigation은 새 `Document`를 만들지 않으면서 session history entry를 추가할 수 있습니다. 주소와 history가 바뀌었다고 항상 서버에서 새 HTML을 받는 것은 아닙니다.

## iframe도 별도의 navigation 대상입니다

```html
<iframe src="/help"></iframe>
```

탭 전체가 아니라 iframe의 child navigable이 `/help`로 navigation할 수 있습니다. 브라우저는 탭 전체에 하나의 back/forward UI를 제공하지만, 그 안에는 top-level navigable과 child navigable의 history가 함께 반영될 수 있습니다. 그래서 iframe navigation과 top-level history traversal은 joint session history 규칙으로 조정됩니다.
— [HTML Standard, child navigables and session history](https://html.spec.whatwg.org/multipage/browsing-the-web.html#session-history) (확인: 2026-09-13)

## navigation과 origin

navigation의 목적지는 URL로 정해지고, 새로 만들어진 `Document`에는 origin이 부여됩니다. 이 origin은 이후 해당 문서의 same-origin policy, storage 접근, 다른 resource 요청의 보안 조건에 영향을 줍니다. 다만 모든 목적지가 일반적인 HTML `Document`를 만드는 것은 아니며, 다운로드·특수 scheme·opaque origin 같은 예외를 별도로 고려해야 합니다.

```text
URL        무엇을 대상으로 이동하는가
navigation 어떻게 문서·history 상태를 이동시키는가
origin     새 문서가 어느 보안 출처에 속하는가
```

## 확인하지 못한 것

- **브라우저별 history·bfcache 구현** — Chrome·Firefox·Safari에서 back/forward 시 실제 문서 재사용 여부를 비교하지 않았습니다.
- **Navigation API의 세부 동작** — 전통적인 navigation과 session history의 개념에 집중했으며, 최신 Navigation API의 모든 이벤트와 interception 규칙은 검증하지 않았습니다.

*작성일: 2026-09-13*
