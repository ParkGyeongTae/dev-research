---
sidebar_position: 2
---

# 브라우저의 이벤트 루프는 JavaScript와 렌더링을 어떻게 조정하는가

> **원문** — [HTML Standard, Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops) (Living Standard)
>
> **확인 날짜** — 2026-09-12. 판번호가 없는 Living Standard의 현재 원문을 확인했습니다.
>
> **검증 상태** — Node.js에서 task와 microtask의 순서를 직접 실행했습니다. 브라우저의 렌더링 타이밍과 실제 frame scheduling은 이 환경에서 브라우저를 실행해 측정하지 못했습니다.

브라우저의 JavaScript가 “한 번에 하나씩 실행된다”는 설명은 절반만 맞습니다. 한 시점에 실행되는 JavaScript 작업은 하나지만, 브라우저는 이벤트·네트워크 결과·타이머·스크립트 콜백을 task로 처리하고, task 사이에 microtask를 비운 뒤 렌더링 기회를 판단합니다.

> To coordinate events, user interaction, scripts, rendering, networking, and so forth, user agents must use event loops as described in this section.
>
> **번역** — 사용자 에이전트는 이벤트·사용자 상호작용·스크립트·렌더링·네트워킹 등을 조정하기 위해 이 절에서 설명하는 event loop를 사용해야 합니다.
>
> — [HTML Standard, Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops) (확인: 2026-09-12)

## 1. task와 microtask는 같은 큐가 아닙니다

HTML Standard는 event loop에 하나 이상의 task queue와 별도의 microtask queue가 있다고 정의합니다. 클릭 이벤트, 타이머 콜백, HTML 파싱, 네트워크 결과 처리는 task가 될 수 있고, `Promise.then()`과 `queueMicrotask()`는 microtask를 추가합니다.

가장 작은 예시는 다음과 같습니다.

```js
console.log('script start');

setTimeout(() => console.log('task'), 0);
queueMicrotask(() => console.log('microtask'));

console.log('script end');
```

이 코드의 실행 순서는 다음과 같습니다.

```text
script start
script end
microtask
task
```

현재 task인 script가 끝나면 microtask queue를 먼저 처리하고, 그 뒤 다른 task가 선택됩니다. 따라서 `setTimeout(..., 0)`은 “즉시” 실행된다는 뜻이 아니며, 현재 script와 그 뒤의 microtask보다 먼저 실행된다고 보장되지 않습니다.

직접 확인한 기록입니다.

```text
$ node --version
v22.21.1
$ node -e "console.log('script start'); setTimeout(() => console.log('task'), 0); queueMicrotask(() => console.log('microtask')); console.log('script end')"
script start
script end
microtask
task
```

이 기록은 Node.js의 실행 결과입니다. 브라우저와 Node.js는 서로 다른 host 환경이므로, 이 출력만으로 브라우저의 렌더링 시점까지 증명할 수는 없습니다.

## 2. microtask는 현재 task 뒤, 다음 렌더링 기회 전에 실행될 수 있습니다

HTML Standard의 microtask checkpoint는 microtask queue가 빌 때까지 가장 오래된 microtask를 꺼내 실행합니다.
— [HTML Standard, Performing a microtask checkpoint](https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint) (확인: 2026-09-12)

```js
button.addEventListener('click', () => {
  state.textContent = 'updated';

  Promise.resolve().then(() => {
    console.log('DOM 변경 뒤의 microtask');
  });
});
```

클릭으로 시작한 task 안에서 DOM을 바꾼 뒤 Promise 콜백을 예약하면, 콜백은 다음 독립 task를 기다리지 않고 현재 task가 끝난 직후 처리됩니다. 그러므로 microtask에서 무거운 반복 작업을 수행하면 “비동기 코드”라는 이유만으로 화면이 즉시 갱신되지는 않습니다.

```js
// microtask를 계속 추가하면 렌더링 기회를 오래 미룰 수 있습니다.
function loop() {
  queueMicrotask(loop);
}
// loop();
```

이 코드는 microtask queue가 계속 비지 않게 만들어 렌더링과 사용자 입력 처리를 지연시킬 수 있습니다. 실제 지연 시간은 브라우저 구현과 장치에 따라 달라지므로 여기서 수치를 단정하지 않습니다.

## 3. 렌더링은 task의 종류와 별도의 기회입니다

브라우저는 모든 task 직후 반드시 화면을 그린다고 보장하지 않습니다. HTML Standard는 rendering opportunity를 하드웨어의 refresh rate, 페이지 성능, visibility state 등을 고려하는 사용자 에이전트의 판단으로 설명합니다. 60Hz를 목표로 하는 경우 약 16.7ms 간격이 예시로 제시되지만, 표준이 특정 주기나 렌더링 모델을 강제하지는 않습니다.
— [HTML Standard, Rendering opportunities](https://html.spec.whatwg.org/multipage/webappapis.html#rendering-opportunity) (확인: 2026-09-12)

```text
현재 task
   ↓
microtask checkpoint
   ↓
브라우저가 rendering opportunity를 판단
   ↓
필요하면 style/layout/paint 및 화면 업데이트
   ↓
다음 task
```

그래서 다음 두 문장은 서로 다릅니다.

- DOM 속성 변경은 JavaScript 실행 중 즉시 DOM 상태를 바꿀 수 있습니다.
- 사용자가 새 픽셀을 보는 시점은 브라우저의 렌더링 기회와 style/layout/paint 처리 뒤입니다.

애니메이션 프레임에 맞춰 작업해야 한다면 `requestAnimationFrame()`을 사용해 다음 렌더링 전에 실행할 작업임을 표현할 수 있습니다. 반대로 CPU를 오래 점유하는 동기 JavaScript는 task 하나를 길게 만들고, 그동안 입력과 렌더링이 처리되지 못하게 합니다.

## 4. 실무에서 관측할 때 구분할 것

DevTools Performance 기록에서 긴 task, microtask, rendering을 같은 “JavaScript 시간”으로 합치면 원인을 놓치기 쉽습니다. 다음처럼 질문을 나누어야 합니다.

| 증상 | 먼저 확인할 것 | 설명 |
| --- | --- | --- |
| 클릭 반응이 늦음 | 긴 task | 현재 task가 입력 처리를 막고 있을 수 있습니다. |
| DOM은 바뀌었는데 화면이 늦게 바뀜 | microtask·rendering | JS 종료와 픽셀 표시 사이에는 렌더링 기회가 있습니다. |
| `setTimeout(..., 0)`이 늦음 | 앞선 task와 microtask | 0ms는 실행 우선권이나 즉시 실행을 의미하지 않습니다. |
| Promise 콜백이 계속 실행됨 | microtask 연쇄 | microtask가 끝나지 않으면 다음 task와 렌더링이 밀릴 수 있습니다. |

## 확인하지 못한 것

- **이 환경의 브라우저별 frame scheduling** — Chrome·Firefox·Safari를 실행한 Performance trace를 수집하지 않았으므로 실제 frame 간격이나 throttling 정책은 확인하지 않았습니다.
- **Node.js와 브라우저의 모든 큐 우선순위 비교** — 직접 실행은 최소 예시의 순서만 검증했으며, 각 host의 추가 큐 동작까지 일반화하지 않았습니다.

*작성일: 2026-09-12*
