---
sidebar_position: 4
---

# 브라우저의 navigation과 history는 페이지를 어떻게 교체하고 복원하는가

> **원문** — [HTML Standard, Navigation and session history](https://html.spec.whatwg.org/multipage/browsing-the-web.html#navigation-and-session-history) · [Back/forward cache](https://web.dev/articles/bfcache)
>
> **확인 날짜** — 2026-09-12. HTML Standard의 현재 원문과 Chrome for Developers의 2026-07-02 갱신 자료를 확인했습니다.
>
> **검증 상태** — navigation·session history·same-document update의 개념을 원문으로 확인했습니다. 브라우저에서 실제 bfcache 적중 여부를 DevTools로 측정하지는 못했습니다.

브라우저의 주소가 바뀌었다고 항상 새 HTML 문서를 받은 것은 아닙니다. 링크 클릭처럼 새 resource를 가져와 새 `Document`를 만드는 navigation, `history.pushState()`처럼 현재 문서를 유지한 채 history entry와 URL을 바꾸는 same-document update, 뒤로 가기처럼 session history를 과거 entry로 이동하는 traversal은 서로 다른 흐름입니다.

> The browser fetches the given URL from the network, using it to populate a new session history entry with a newly-created `Document`.
>
> **번역** — 브라우저는 주어진 URL을 네트워크에서 가져와 새로 만든 `Document`와 함께 새로운 session history entry를 채웁니다.
>
> — [HTML Standard, Navigation and session history](https://html.spec.whatwg.org/multipage/browsing-the-web.html#navigation-and-session-history) (확인: 2026-09-12)

## 1. 세 가지 흐름을 구분해야 합니다

| 동작 | 새 `Document` 가능성 | session history | 대표적인 관찰 |
| --- | --- | --- | --- |
| 일반 링크 이동 | 있음 | 새 entry 추가 | HTML fetch와 초기화가 발생할 수 있음 |
| `history.pushState()` | 없음 | 새 entry 추가 | URL·state는 바뀌지만 새 문서를 받지 않음 |
| `history.replaceState()` | 없음 | 현재 entry 교체 | history 길이를 늘리지 않음 |
| `history.back()` | 기존 문서 복원 또는 새 fetch | 과거 entry로 이동 | `popstate`, `pageshow` 등을 관찰할 수 있음 |
| fragment 이동 | 보통 없음 | fragment entry가 생길 수 있음 | 문서 안 위치 이동과 history 처리가 이어짐 |

WHATWG는 `pushState()`·`replaceState()`가 사용하는 URL and history update steps가 navigate algorithm과 별개라고 명시합니다.
— [HTML Standard, URL and history update steps](https://html.spec.whatwg.org/multipage/browsing-the-web.html#url-and-history-update-steps) (확인: 2026-09-12)

## 2. SPA 라우팅은 URL만 바꾸는 일이 아닙니다

```js
history.pushState({ page: 2 }, '', '/items?page=2');
```

이 호출은 현재 `Document`를 유지하면서 URL과 history entry를 바꿉니다. 서버에서 `/items?page=2`의 HTML을 자동으로 가져오거나 화면을 자동으로 새로 그려 주지는 않습니다. 애플리케이션은 state를 읽고 필요한 DOM 변경과 데이터 fetch를 직접 수행해야 합니다.

```text
pushState()
  ├─ URL 변경
  ├─ history entry 추가
  ├─ 같은 Document 유지
  └─ 화면·데이터 갱신은 애플리케이션 책임
```

반대로 사용자가 새 링크를 클릭하면 navigation이 시작될 수 있고, 새 entry의 문서를 채우기 위해 네트워크·파싱·스크립트 실행이 이어질 수 있습니다. 따라서 SPA의 “페이지 이동”이라는 표현과 HTML Standard의 navigation은 항상 같은 의미가 아닙니다.

## 3. 뒤로 가기는 새로고침이 아닐 수 있습니다

> Back/forward cache (or bfcache) is a browser optimization that enables instant back and forward navigation.
>
> **번역** — back/forward cache(bfcache)는 뒤로 가기와 앞으로 가기를 즉시 처리할 수 있게 하는 브라우저 최적화입니다.
>
> — [Back/forward cache, web.dev](https://web.dev/articles/bfcache) (확인: 2026-09-12)

bfcache를 사용하면 브라우저는 페이지를 떠날 때 문서를 즉시 폐기하는 대신 페이지 상태를 보존하고 JavaScript 실행을 일시 중지할 수 있습니다. 사용자가 다시 돌아오면 네트워크 요청·HTML 파싱·스크립트 재실행을 모두 처음부터 하지 않고 보존된 페이지를 복원할 수 있습니다.

```text
/a 로드 ──▶ /b 로드
  │           │
  │           └─ /a를 bfcache에 보존할 수 있음
  │
뒤로 가기 ──▶ /a 복원
              ├─ pageshow 발생
              └─ persisted=true일 수 있음
```

여기서 “bfcache에 들어갔다”와 “HTTP cache에서 HTML을 읽었다”는 다릅니다. HTTP cache는 응답 데이터를 저장하고 필요하면 다시 문서를 만들 수 있지만, bfcache는 이전 페이지의 문서 상태와 실행 환경을 복원하는 메커니즘입니다.

## 4. 복원 가능한 페이지라고 가정하면 상태가 낡을 수 있습니다

페이지가 bfcache에서 복원되면 새 navigation처럼 초기화 코드가 다시 실행되지 않을 수 있습니다. 실시간 데이터나 사용자 권한이 바뀔 수 있는 애플리케이션은 `pageshow`에서 `event.persisted`를 확인하고 필요한 갱신을 수행할 수 있습니다.

```js
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    // bfcache 복원 뒤 필요한 데이터 재검증
    refreshData();
  }
});
```

다만 bfcache 사용 여부는 브라우저와 페이지 상태, 메모리 상황 등에 따라 달라질 수 있습니다. Chrome 공식 자료도 DevTools의 Application > Back/forward Cache 패널로 페이지별 복원 가능 여부를 테스트하도록 안내합니다.
— [Back/forward cache, Testing bfcache](https://web.dev/articles/bfcache#testing-bfcache) (확인: 2026-09-12)

그러므로 `pageshow`를 “항상 새 문서가 시작되는 이벤트”로 해석하거나, 반대로 “항상 메모리 복원 이벤트”로 해석하면 안 됩니다. 이벤트가 발생한 navigation type과 `persisted` 값을 함께 관찰해야 합니다.

## 5. history state는 서버 상태의 대체물이 아닙니다

```js
history.pushState({ selectedId: 42 }, '', '/items/42');
```

이 state는 브라우저의 session history entry에 연결된 클라이언트 상태입니다. 새로고침·새 탭·다른 장치에서도 서버 데이터가 보존된다는 뜻이 아니며, URL만으로 복구해야 하는 데이터와 history state로 보조할 데이터를 구분해야 합니다.

HTML Standard는 session history entry에 scroll position data와 사용자 에이전트가 정의한 persisted user state가 포함될 수 있고, form control 값 같은 상태를 예로 듭니다.
— [HTML Standard, Persisted history entry state](https://html.spec.whatwg.org/multipage/browsing-the-web.html#persisted-history-entry-state) (확인: 2026-09-12)

## 확인하지 못한 것

- **이 환경의 실제 bfcache 적중 결과** — Chrome을 실행할 수 없어 DevTools Back/forward Cache 패널에서 복원 여부를 측정하지 않았습니다.
- **브라우저별 제외 조건의 전체 목록** — bfcache 조건은 브라우저별 구현과 버전에 따라 달라질 수 있어, 공통 개념과 관측 방법만 적었습니다.
- **Navigation API의 모든 이벤트 순서** — 이 문서는 기존 History API와 bfcache의 관계에 집중했으며 Navigation API 전체 알고리즘은 다루지 않았습니다.

*작성일: 2026-09-12*
