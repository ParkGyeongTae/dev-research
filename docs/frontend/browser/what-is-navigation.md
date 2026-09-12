---
sidebar_position: 6
---

# 브라우저 navigation이란 무엇인가

> **원문** — [HTML Standard, Navigation and session history](https://html.spec.whatwg.org/dev/browsing-the-web.html)
>
> **확인 날짜** — 2026-09-12. HTML Standard는 판번호가 없는 Living Standard이며, 2026-09-08 갱신본입니다.
>
> **검증 상태** — navigation, navigable, Document, session history의 관계를 원문으로 대조했습니다. 실제 브라우저의 history·iframe 동작은 직접 실행하지 않았습니다.

navigation은 브라우저가 현재 `Document`를 표시하는 browsing context를 다른 URL의 resource로 이동시키는 과정입니다. 주소창에 URL을 입력하는 것뿐 아니라 링크 클릭, form 제출, `window.open()`, `location.assign()`도 navigation을 시작할 수 있습니다.

## navigation은 새 Document를 표시하는 과정입니다

```text
현재 탭이 Document A를 표시
          ↓ navigation to /next
URL fetch
          ↓
Document B 생성
          ↓
탭이 Document B를 표시하고 history entry 갱신
```

HTML Standard는 navigation을 수행할 때 브라우저가 URL을 fetch하고 새 session history entry에 새 `Document`를 채운 뒤, 현재 표시하는 active document를 갱신한다고 설명합니다.
— [HTML Standard, Navigation and session history](https://html.spec.whatwg.org/dev/browsing-the-web.html) (확인: 2026-09-12)

따라서 navigation은 단순한 HTTP 요청의 별칭이 아닙니다. 네트워크에서 resource를 가져오는 일, 새 `Document`를 만드는 일, 탭이나 iframe이 표시할 문서를 바꾸는 일, history를 갱신하는 일이 연결된 브라우저 동작입니다.

## 링크 클릭과 JavaScript 이동

```html
<a href="/orders">주문 보기</a>
```

사용자가 링크를 클릭하면 브라우저는 `/orders`를 대상으로 navigation을 시작할 수 있습니다. JavaScript에서도 다음과 같이 시작할 수 있습니다.

```js
location.assign('/orders');
```

이때 `/orders`의 응답이 HTML이면 브라우저는 이를 새 `Document`로 처리하고, HTML parsing·DOM 구성·script 실행·rendering을 이어 갑니다. 응답이 `204`이거나 다운로드를 지시하는 경우처럼 새 문서를 표시하지 않고 navigation이 중단되는 경우도 있습니다.
— [HTML Standard, Navigation and session history](https://html.spec.whatwg.org/dev/browsing-the-web.html) (확인: 2026-09-12)

## navigation과 fetch는 다릅니다

```js
const response = await fetch('/api/orders');
const orders = await response.json();
```

이 코드는 데이터를 가져오지만 현재 탭이 새 `Document`를 표시하도록 바꾸지는 않습니다. 반면 링크 클릭으로 `/orders`를 열면 navigation이 일어나고, 그 결과 새 `Document`가 표시될 수 있습니다.

다만 navigation 내부에서도 URL을 가져오기 위해 fetch 알고리즘을 사용합니다. 그러므로 관계는 다음처럼 정리할 수 있습니다.

```text
navigation
  └─ 문서를 채우기 위한 fetch와 Document 생성

fetch()
  └─ JavaScript가 호출하는 resource retrieval
```

## session history와 back/forward

navigation이 새 문서를 만들면 브라우저는 보통 session history에 새 entry를 추가합니다.

```text
history: [/home] → [/orders] → [/orders/42]
                                  ↑ 현재
```

뒤로 가기를 누르면 브라우저는 이전 entry로 history traversal을 수행합니다. 해당 entry의 `Document`가 bfcache에 남아 있으면 재사용할 수 있고, 없으면 entry의 URL을 다시 fetch해 문서를 채울 수 있습니다. 따라서 back 동작은 항상 “새 URL을 처음부터 로드하는 navigation”과 같지 않습니다.
— [HTML Standard, session history and bfcache](https://html.spec.whatwg.org/dev/browsing-the-web.html) (확인: 2026-09-12)

`history.pushState()`로 URL과 history entry를 추가하는 SPA 동작은 새 `Document`를 만들지 않는 same-document navigation으로 설명되는 경우가 많습니다. 주소와 history가 바뀌었다고 항상 서버에서 새 HTML을 받는 것은 아닙니다.

## iframe도 별도의 navigation 대상입니다

```html
<iframe src="/help"></iframe>
```

탭 전체가 아니라 iframe의 navigable이 `/help`로 navigation할 수 있습니다. 탭은 하나의 back/forward UI를 제공하지만, 그 안에는 top-level 문서와 child navigable들이 함께 존재할 수 있습니다. 이 때문에 iframe history와 top-level history를 함께 처리하는 규칙이 복잡해집니다.
— [HTML Standard, Infrastructure for sequences of documents](https://html.spec.whatwg.org/dev/document-sequences.html) (확인: 2026-09-12)

## navigation에서 origin은 무엇을 결정합니까

navigation의 목적지는 URL로 정해지고, 새로 만들어진 `Document`에는 origin이 부여됩니다. 이 origin은 이후 해당 문서의 same-origin policy, storage 접근, 다른 resource 요청의 보안 조건에 영향을 줍니다.

```text
URL        무엇을 대상으로 이동하는가
navigation 어떻게 문서를 이동·교체하는가
origin     새 문서가 어느 보안 출처에 속하는가
```

## 확인하지 못한 것

- **브라우저별 history·bfcache 구현** — Chrome·Firefox·Safari에서 back/forward 시 실제 문서 재사용 여부를 비교하지 않았습니다.
- **Navigation API의 세부 동작** — 이 문서는 전통적인 navigation과 session history의 개념에 집중했으며, 최신 Navigation API의 모든 이벤트와 interception 규칙은 검증하지 않았습니다.

*작성일: 2026-09-12*
