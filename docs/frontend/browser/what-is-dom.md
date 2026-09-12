---
sidebar_position: 4
---

# DOM이란 무엇인가

> **원문** — [DOM Standard](https://dom.spec.whatwg.org/)
>
> **확인 날짜** — 2026-09-13. DOM Standard는 판번호가 없는 Living Standard이며, 2026-08-25 갱신본입니다.
>
> **검증 상태** — DOM의 목적, tree·node·Document·Element·event 개념을 원문으로 대조했습니다. 실제 브라우저에서 실행한 JavaScript 출력은 직접 확인하지 않았습니다.

DOM(Document Object Model)은 웹 문서와 그 객체 구조를 JavaScript와 웹 플랫폼 API가 다룰 수 있도록 표현하는 플랫폼 중립 모델입니다. HTML은 DOM을 구성하는 대표적인 입력 형식입니다. DOM은 HTML 텍스트 자체가 아니라, 노드가 부모·자식 관계로 연결된 트리와 그 동작을 표현하는 모델입니다.

> DOM defines a platform-neutral model for events, aborting activities, and node trees.
>
> **번역** — DOM은 이벤트, 작업 중단, 노드 트리를 위한 플랫폼 중립적인 모델을 정의합니다.
>
> — [DOM Standard](https://dom.spec.whatwg.org/) (확인: 2026-09-13)

## HTML과 DOM은 같은 것이 아닙니다

HTML은 markup text로 표현된 문서이고, DOM은 브라우저가 그 문서를 파싱한 뒤 구성하는 객체 모델입니다. 브라우저 구현의 실제 내부 자료구조가 표준의 “트리”와 물리적으로 동일하다는 뜻은 아닙니다.

```html
<p id="message">Hello</p>
```

이 HTML을 DOM의 일부로 단순화하면 다음처럼 볼 수 있습니다.

```text
Document
└── html
    └── body
        └── p#message
            └── "Hello"
```

HTML의 공백·생략된 태그·잘못 닫힌 태그는 parser 규칙에 따라 DOM 구조로 정리될 수 있습니다. 따라서 서버 응답의 HTML 문자열과 브라우저가 구성한 DOM 구조가 항상 같다고 가정하면 안 됩니다.
— [HTML Standard, parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html) (확인: 2026-09-13)

## DOM은 노드의 트리입니다

DOM Standard에서 tree에 참여하는 객체는 부모를 가질 수 있고, 순서 있는 자식 집합을 가집니다. 대표적인 노드는 다음과 같습니다.

| 노드 | 의미 | 예시 |
| --- | --- | --- |
| `Document` | 문서 트리의 진입점 | `document` |
| `Element` | HTML 요소를 표현하는 노드 | `p`, `button` |
| `Text` | 요소 안의 문자 데이터 | `Hello` |
| `Comment` | 주석 노드 | `<!-- note -->` |

가장 작은 조회 예시는 다음과 같습니다.

```html
<p id="message">Hello</p>
<script>
  const message = document.querySelector('#message');
  console.log(message.textContent); // Hello
</script>
```

`querySelector()`는 선택자에 맞는 첫 요소를 찾고, `textContent`는 현재 DOM의 문자 내용을 읽습니다. 선택자에 맞는 요소가 없으면 `querySelector()`는 `null`을 반환하므로 실제 코드에서는 null 처리도 필요합니다.
— [DOM Standard, trees](https://dom.spec.whatwg.org/#concept-tree) (확인: 2026-09-13)

## JavaScript가 DOM을 바꾸면 현재 문서가 바뀝니다

```js
const message = document.querySelector('#message');
message.textContent = '안녕하세요';
```

이 변경은 서버의 HTML 파일이나 이미 받은 HTML response를 수정하지 않습니다. 현재 페이지의 DOM을 수정하는 것입니다. 브라우저가 변경된 DOM과 style 정보를 다시 처리하면 화면에 보이는 내용도 달라질 수 있습니다.

| 대상 | 바뀌는 것 |
| --- | --- |
| HTML response | 서버가 전송한 문서 원문 |
| DOM | 브라우저가 현재 문서에 사용하는 객체 모델 |
| 화면 | DOM·CSSOM 등을 이용해 계산한 rendering 결과 |

DOM 변경이 항상 같은 픽셀 변경으로 바로 끝나는 것은 아닙니다. 브라우저는 변경 종류와 최적화에 따라 style calculation, layout, paint 등 필요한 rendering 단계를 수행합니다.
— [web.dev, Render tree construction](https://web.dev/articles/critical-render-path/render-tree-construction) (확인: 2026-09-13)

## 속성(attribute)과 JavaScript property는 구분해야 합니다

HTML attribute는 markup에 적힌 값이고, property는 DOM 객체가 현재 보유한 값입니다. 둘이 초기에는 연결될 수 있지만 항상 같은 것은 아닙니다.

```html
<input id="name" value="초기값">
<script>
  const input = document.querySelector('#name');
  input.value = '현재값';

  console.log(input.getAttribute('value')); // 초기값
  console.log(input.value);                  // 현재값
</script>
```

따라서 개발자 도구에서 attribute가 그대로인데 화면이나 동작이 바뀌는 현상은 DOM property의 현재 값과 관련될 수 있습니다.

## DOM은 이벤트의 대상이기도 합니다

DOM 노드는 `EventTarget` 기능을 통해 사용자 입력이나 브라우저 작업의 완료 같은 이벤트를 관찰할 수 있습니다.

```js
const button = document.querySelector('#save');

button.addEventListener('click', event => {
  console.log(event.target, event.currentTarget);
});
```

이벤트는 특정 노드에서 시작해 조상 노드로 전달될 수 있습니다. 그래서 실제로 클릭된 노드인 `event.target`과 listener가 등록된 노드인 `event.currentTarget`이 다를 수 있습니다.
— [DOM Standard, events](https://dom.spec.whatwg.org/#events) (확인: 2026-09-13)

## 확인하지 못한 것

- **브라우저별 DOM 구현 차이** — Chrome·Firefox·Safari의 내부 자료구조와 최적화를 직접 비교하지 않았습니다.
- **실행 출력** — 이 환경에 브라우저 실행 파일이 없어 예시를 실제 브라우저에서 실행하지 않았습니다.

*작성일: 2026-09-13*
