# JavaScript란 무엇인가 — 명세에는 입출력도 브라우저도 없다

JavaScript를 이해하는 열쇠는 **명세가 무엇을 정의하지 않았는가**에 있습니다.
언어 명세에는 파일 읽기도, 화면도, `console.log`도 없습니다. 그리고 정수 타입도 없습니다.
이 두 가지 "없음"이 브라우저와 Node.js가 갈리는 이유이자, JSON을 주고받을 때 id가 조용히 바뀌는 이유입니다.

**실행 환경**: Node.js v22.21.1, Python 3.13.2 (macOS, Darwin 24.6.0). 아래 출력은 모두 이 환경에서 실제로 돌린 것입니다(2026-09-06).

## 1. 무엇인가 — ECMA-262로 정의된 언어

JavaScript의 표준 이름은 **ECMAScript**이고, 표준 번호는 **ECMA-262**입니다.

| 판 | 통칭 | 발행 |
| --- | --- | --- |
| 15판 | ECMAScript 2024 | 2024-06 |
| 16판 | ECMAScript 2025 | 2025-06 |
| **17판** | **ECMAScript 2026** | **2026-06** |

[Ecma International — ECMA-262](https://ecma-international.org/publications-and-standards/standards/ecma-262/) 기준(확인: 2026-09-06). 매년 6월에 한 판씩 나옵니다.

명세를 직접 확인할 때 주소를 조심해야 합니다. 흔히 참조되는 `https://tc39.es/ecma262/`는 **다음 판의 편집 중 초안**입니다 — 2026-09-06 시점에 이 주소를 열면 "ECMAScript 2027"이라고 나옵니다. 확정된 내용을 근거로 삼으려면 `https://262.ecma-international.org/17.0/`처럼 **판번호가 박힌 주소**를 씁니다.

## 2. 명세는 입출력을 정의하지 않습니다

여기가 JavaScript를 이해하는 출발점입니다. 명세 본문이 스스로 이렇게 밝힙니다.

> ECMAScript as defined here is not intended to be computationally self-sufficient; indeed, there are no provisions in this specification for input of external data or output of computed results.
>
> — [ECMA-262, 17th edition (ECMAScript 2026), §4 Overview](https://262.ecma-international.org/17.0/) (확인: 2026-09-06)

"computationally self-sufficient" 하지 않다는 말은 강한 진술입니다. **파일 읽기·네트워크 요청·`console.log`·DOM은 전부 언어 명세에 없습니다.** 명세는 그것들을 *호스트*에 위임하고, 호스트가 무엇인지도 명세가 정의합니다.

> A host is an external source that further defines facilities listed in Annex D … A host is often an external specification, such as WHATWG HTML.
>
> — 같은 문서, §4.2 Hosts and Implementations (확인: 2026-09-06)

그래서 같은 JavaScript 코드가 브라우저에서는 되고 Node.js에서는 안 되는 일이 생깁니다. **언어가 다른 게 아니라 호스트가 다른 것**입니다. `document`는 브라우저(WHATWG HTML)가, `fs`·`process`는 Node.js가 각각 제공합니다.

이 구조를 잡아 두면 "JavaScript를 안다"와 "Node.js를 안다"가 왜 다른 이야기인지도 함께 정리됩니다. 언어 쪽에서 배운 것은 어느 호스트로 가도 그대로지만, 호스트가 준 것은 옮기면 사라집니다.

## 3. 타입은 값에 붙어 있고, 형변환은 연산자가 결정합니다

JavaScript는 값에 타입이 붙는 동적 타입 언어입니다. 변수에는 타입이 없습니다. 그래서 **같은 두 값이 어떤 연산자를 만나느냐에 따라 다른 방향으로 변환됩니다.**

```console
$ node -e 'console.log("1" + 2); console.log("3" - 1); console.log([] + {});'
12
2
[object Object]
```

- `"1" + 2` → `"12"` — `+`는 한쪽이 문자열이면 **문자열 결합**으로 갑니다
- `"3" - 1` → `2` — `-`는 문자열을 **숫자로** 바꿔서 계산합니다

피연산자 조합은 같은데 방향이 반대입니다. 즉 변환 규칙은 값이 아니라 **연산자에 붙어 있습니다.** 그래서 집계 로직에 문자열이 하나 섞여 들어오면, `-`로 계산하는 자리에서는 정상이던 것이 `+`로 합계를 내는 자리에서 문자열 결합으로 바뀝니다. 예외는 나지 않습니다.

### 오류는 그 줄에 실행이 닿아야 발견됩니다

동적 타입의 결과는 형변환만이 아닙니다. **이름이 존재하는지조차 실행 시점에 확인합니다.**

```javascript title="late.js"
function run(flag) {
  if (flag) {
    return undefinedFunction();
  }
  return "정상";
}
console.log(run(false));
console.log(run(true));
```

```console
$ node late.js
정상
/…/late.js:3
    return undefinedFunction();
    ^

ReferenceError: undefinedFunction is not defined
```

존재하지 않는 함수를 부르는 코드가 **실행 전에 전혀 걸리지 않습니다.** `run(false)`는 멀쩡히 통과하고, `run(true)`로 그 분기에 닿아서야 터집니다.

파이프라인에서 이게 아픈 이유는 어느 분기가 늦게 실행되는지가 정해져 있기 때문입니다. **오류 처리 경로·재시도 경로·월말 배치 분기**가 그렇습니다. 정작 장애가 나서 그 경로를 처음 타는 순간, 그 경로가 또 터집니다. 이 지점을 컴파일 시점으로 당기려는 시도가 TypeScript입니다.

### 값 없음을 나타내는 값이 둘입니다

```console
$ node -e '
const o = JSON.parse(`{"a": null}`);
console.log("o.a      :", o.a, "| typeof:", typeof o.a);
console.log("o.b      :", o.b, "| typeof:", typeof o.b);
console.log("o.a == o.b  :", o.a == o.b);
console.log("o.a === o.b :", o.a === o.b);
console.log("JSON.stringify({a:null, b:undefined}) =", JSON.stringify({a:null, b:undefined}));'
o.a      : null | typeof: object
o.b      : undefined | typeof: undefined
o.a == o.b  : true
o.a === o.b : false
JSON.stringify({a:null, b:undefined}) = {"a":null}
```

`null`은 **명시적으로 넣은 없음**이고, `undefined`는 **애초에 없는 것**입니다. `==`로는 같고 `===`로는 다릅니다.

마지막 줄이 데이터 관점에서 중요합니다. **`JSON.stringify`는 `undefined` 프로퍼티를 통째로 빼 버립니다.** `{a:null, b:undefined}`가 `{"a":null}`이 되어 키 자체가 사라졌습니다. 원천의 NULL이 JS 계층을 지나며 `undefined`가 되면, 하류가 받는 것은 "값이 NULL인 컬럼"이 아니라 **"컬럼이 없는 레코드"**입니다.

## 4. 숫자가 하나뿐인 언어

JavaScript의 `Number`는 **IEEE 754 배정밀도 부동소수점 하나뿐**입니다. 정수 전용 타입이 없습니다. int32도, int64도, decimal도 없고, 정수처럼 보이는 값도 전부 double 위에 얹혀 있습니다.

double이 정수를 정확히 담을 수 있는 범위는 가수부 53비트가 정합니다. 그래서 안전한 정수의 상한이 2^53 − 1이고, 언어가 그 값을 상수로 갖고 있습니다.

```console
$ node -e 'console.log(Number.MAX_SAFE_INTEGER); console.log(9007199254740993); console.log(9007199254740993n);'
9007199254740991
9007199254740992
9007199254740993n
```

두 번째 줄을 보십시오. **`9007199254740993`을 넣었는데 `9007199254740992`가 나왔습니다.** 오류도 경고도 없습니다 — 담을 수 없는 값이 가장 가까운 표현 가능한 값으로 조용히 내려앉습니다.

세 번째 줄의 `9007199254740993n`은 BigInt 리터럴이고, 이건 정확합니다. 임의 정밀도 정수가 언어에 나중에 별도 타입으로 추가된 것입니다.

같은 성질이 소수 쪽에서는 익숙한 모습으로 나타납니다.

```console
$ node -e 'console.log(0.1 + 0.2);'
0.30000000000000004
```

이건 JavaScript만의 문제가 아니라 IEEE 754 배정밀도를 쓰는 모든 언어에서 같습니다. **JavaScript가 특별한 것은 여기서 벗어날 타입이 언어에 없다는 점**입니다.

### JSON 왕복에서 id가 바뀝니다

앞의 성질은 예제 안에서만 사는 게 아닙니다. BIGINT 기본키나 Snowflake ID를 JSON으로 실어 나르면 그대로 벌어집니다.

```javascript title="json64.js"
const raw = '{"id": 9007199254740993, "amount": 1234567890123456789}';

const parsed = JSON.parse(raw);
console.log("id     :", parsed.id);
console.log("amount :", parsed.amount);
console.log("다시 직렬화:", JSON.stringify(parsed));
console.log("원본과 같은가:", JSON.stringify(parsed) === raw.replace(/\s/g, ""));
```

```console
$ node json64.js
id     : 9007199254740992
amount : 1234567890123456800
다시 직렬화: {"id":9007199254740992,"amount":1234567890123456800}
원본과 같은가: false
```

`amount`는 뒤 세 자리가 바뀌었습니다(`…789` → `…800`). 같은 입력을 Python으로 돌리면 이렇습니다.

```console
$ python3 -c "…json.loads(raw)…"
id     : 9007199254740993
amount : 1234567890123456789
다시 직렬화: {"id":9007199254740993,"amount":1234567890123456789}
```

**같은 JSON 문자열이 통과하는 언어에 따라 값이 달라집니다.** JSON 명세는 수의 정밀도를 규정하지 않으므로, 이건 어느 구현이 틀린 게 아니라 **각 언어의 수 모델이 다른 것**입니다. Python은 임의 정밀도 정수를 갖고 있고 JavaScript는 갖고 있지 않습니다.

그래서 파이프라인 중간에 Node.js 기반 도구(API 게이트웨이, 로그 수집기, 사내 프록시, 일부 ETL SaaS)가 **한 단계라도** 끼어 있으면 id가 바뀐 채로 하류에 저장될 수 있습니다. 예외가 나지 않으니 알림도 오지 않고, 메트릭에도 로그에도 남지 않습니다. 발견은 보통 훨씬 뒤에 **JOIN이 안 맞거나 중복 키가 생길 때** 일어납니다.

방어책은 **큰 정수를 JSON에서 문자열로 실어 나르는 것**입니다. `BigInt`는 언어 안에서는 정확하지만 `JSON.stringify`가 기본적으로 처리하지 못하므로, 값이 언어 경계를 넘는 지점에서 문자열로 바꾸는 쪽이 단순합니다.

> 이 방어책은 이 저장소의 판단이며 사실이 아니라 의견입니다. 다만 **정밀도 손실 자체는 위 실행 기록으로 확인된 사실**입니다.

## 5. 실무에서 어디에 쓰이는가

Stack Overflow 2025 개발자 설문에서 JavaScript 사용률은 **66%로 1위**였습니다([2025 Stack Overflow Developer Survey — Technology](https://survey.stackoverflow.co/2025/technology), 확인: 2026-09-06. 해당 문항 응답 31,771건).
**설문 자료이며 자기선택 편향이 있습니다** — Stack Overflow를 쓰는 개발자만 답했고, 코드 규모나 중요도가 아니라 응답자 비율입니다. 순위를 대략 잡는 용도 이상으로 쓰면 안 됩니다.

주요 영역은 §2의 호스트 구분과 그대로 겹칩니다.

- **브라우저 UI** — 원래의 자리. 호스트는 WHATWG HTML. React·Vue 등
- **서버** — Node.js 런타임 위의 API 서버, BFF
- **빌드·개발 도구** — 번들러, 린터, 테스트 러너. 다른 언어 프로젝트도 프런트엔드 자산이 있으면 여기에 걸립니다
- **데스크톱·모바일** — Electron, React Native

### 데이터 엔지니어가 만나는 지점

직접 애플리케이션을 짜기보다는 대개 이렇게 만납니다.

1. **JSON 경계** — §4. 이게 가장 실질적이고, 직접 코드를 안 써도 걸립니다.
2. **대시보드·시각화 커스터마이징** — Superset·Grafana 플러그인, 사내 리포트 페이지
3. **도구 체인** — 문서 사이트, 사내 CLI, 일부 데이터 카탈로그 UI가 npm 생태계 위에 있습니다
4. **웹훅·서버리스 글루** — 짧은 연동 함수를 Node로 짜는 경우

대량 데이터 처리 자체를 JavaScript로 하는 경우는 드뭅니다. pandas·Spark에 대응할 만한 생태계가 얇고, 무엇보다 §4의 수 모델이 집계·정산과 맞지 않습니다.

---

*작성일: 2026-09-06*
