---
sidebar_position: 4
---

# DOM이란 무엇인가

> **원문** — [DOM Standard](https://dom.spec.whatwg.org/)
>
> **확인 날짜** — 2026-09-12. DOM Standard는 판번호가 없는 Living Standard이며, 2026-08-25 갱신본입니다.
>
> **검증 상태** — DOM의 목적, tree·node·Document·Element 개념을 원문으로 대조했습니다. 실제 브라우저에서 실행한 JavaScript 출력은 이 환경에서 브라우저를 실행하지 못해 직접 확인하지 않았습니다.

DOM(Document Object Model)은 웹 문서와 그 객체 구조를 JavaScript와 웹 플랫폼 API가 다룰 수 있도록 표현하는 플랫폼 중립 모델입니다. HTML은 DOM을 구성하는 대표적인 입력 형식입니다. 중요한 점은 DOM이 HTML 텍스트 자체가 아니라, 노드가 부모·자식 관계로 연결된 **트리 구조**라는 것입니다.

> DOM defines a platform-neutral model for events, aborting activities, and node trees.
>
> **번역** — DOM은 이벤트, 작업 중단, 노드 트리를 위한 플랫폼 중립적인 모델을 정의합니다.
>
> — [DOM Standard](https://dom.spec.whatwg.org/) (확인: 2026-09-12)

## HTML과 DOM은 같은 것이 아닙니다

HTML은 markup text로 표현된 문서이고, DOM은 브라우저가 그 문서를 파싱한 뒤 메모리에 구성한 객체 트리입니다.

```html
<p id="message">Hello</p>
```

이 HTML을 DOM의 일부로 단순화하면 다음과 같이 볼 수 있습니다.

```text
Document
└── html
    └── body
        └── p#message
            └── "Hello"
```

HTML의 공백·생략된 태그·잘못 닫힌 태그는 파서 규칙에 따라 DOM 구조로 정리될 수 있습니다. 따라서 서버 응답의 HTML 문자열을 그대로 문자열 비교한 결과와 브라우저가 구성한 DOM의 구조가 항상 같다고 가정하면 안 됩니다.
— [HTML Standard, parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html) (확인: 2026-09-12)

## DOM은 노드의 트리입니다

DOM Standard에서 tree에 참여하는 객체는 부모를 가질 수 있고, 자식의 순서 있는 집합을 가집니다. 최상위 객체는 부모가 없으며, 자식의 자식도 같은 트리의 하위 노드입니다.
— [DOM Standard, trees](https://dom.spec.whatwg.org/#concept-tree) (확인: 2026-09-12)

브라우저에서 자주 만나는 대표적인 노드는 다음과 같습니다.

| 노드 | 의미 | 예시 |
| --- | --- | --- |
| `Document` | 문서 트리의 진입점 | `document` |
| `Element` | HTML 요소를 표현하는 노드 | `p`, `button` |
| `Text` | 요소 안의 문자 데이터 | `Hello` |
| `Comment` | 주석 노드 | `<!-- note -->` |

가장 작은 DOM 조회 예시는 다음과 같습니다.

```js
const message = document.querySelector('#message');
console.log(message.textContent); // 예상 결과: Hello
```

`querySelector()`는 문서 트리에서 선택자에 맞는 요소를 찾고, `textContent`는 그 노드의 문자 내용을 읽습니다. 이 코드가 읽는 대상은 HTML 원문 문자열이 아니라 현재 메모리에 있는 DOM입니다.

## JavaScript가 DOM을 바꾸면 문서 트리가 바뀝니다

다음 코드는 `p` 요소의 텍스트 노드를 바꿉니다.

```js
const message = document.querySelector('#message');
message.textContent = '안녕하세요';
```

이 변경은 서버의 HTML 파일을 수정하지 않습니다. 현재 페이지의 DOM을 수정하는 것입니다. 브라우저가 변경된 DOM과 스타일 정보를 다시 처리하면 화면에 보이는 내용도 달라질 수 있습니다.

따라서 다음 셋은 구분해야 합니다.

| 대상 | 바뀌는 것 |
| --- | --- |
| HTML 응답 | 서버가 전송한 문서 원문 |
| DOM | 브라우저 메모리에 있는 문서 객체 트리 |
| 화면 | DOM·CSSOM 등을 이용해 계산한 렌더링 결과 |

DOM 변경이 항상 곧바로 같은 픽셀 변경으로 끝나는 것은 아닙니다. 브라우저는 스타일 계산, layout, paint 같은 렌더링 단계를 거쳐 화면을 갱신하며, 변경 종류와 브라우저의 최적화에 따라 필요한 단계가 달라질 수 있습니다.
— [CSSOM and DOM trees, web.dev](https://web.dev/articles/critical-render-path/render-tree-construction) (확인: 2026-09-12)

## DOM은 이벤트의 대상이기도 합니다

DOM 노드는 `EventTarget` 기능을 통해 사용자 입력이나 브라우저 작업의 완료 같은 이벤트를 관찰할 수 있습니다.

```js
const button = document.querySelector('#save');

button.addEventListener('click', event => {
  console.log('clicked', event.target);
});
```

이벤트는 특정 노드에서 시작해 조상 노드로 전달될 수 있습니다. 그래서 이벤트를 등록한 노드와 실제로 사용자가 클릭한 노드가 다를 수 있으며, `event.target`과 `event.currentTarget`을 구분해야 합니다.
— [DOM Standard, DOM Events](https://dom.spec.whatwg.org/#events) (확인: 2026-09-12)

## DOM을 이해할 때 생기는 결론

- 브라우저 개발자 도구의 **Elements** 패널은 서버가 보낸 HTML 원문이 아니라, 파싱과 JavaScript 실행을 거친 현재 DOM을 보여 줄 수 있습니다.
- `textContent`나 속성 변경은 서버 데이터를 바꾸지 않고 현재 문서의 DOM을 바꿉니다.
- DOM은 구조와 이벤트의 모델이지, 요소의 색·크기·화면 위치를 모두 담은 모델은 아닙니다. 화면 결과를 이해하려면 CSSOM과 렌더링 단계를 함께 봐야 합니다.
- `document`는 전역 문자열 변수처럼 동작하는 것이 아니라 현재 문서 트리에 접근하는 `Document` 객체입니다.

## 확인하지 못한 것

- **브라우저별 DOM 구현 차이** — Chrome·Firefox·Safari의 내부 자료구조와 최적화를 직접 비교하지 않았습니다.
- **실행 출력** — 이 환경에 브라우저 실행 파일이 없어 `querySelector()`와 이벤트 예시를 실제 브라우저에서 실행하지 않았습니다.

*작성일: 2026-09-12*
