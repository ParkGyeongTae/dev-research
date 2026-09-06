# JavaScript란 무엇인가 — 명세에는 입출력도 브라우저도 없다

데이터 엔지니어가 JavaScript를 직접 쓸 일은 많지 않습니다. 하지만 **JSON을 주고받는 순간 JavaScript의 수 표현 방식에 걸립니다.**
이 문서는 언어 자체를 정리하되, 마지막의 int64 문제에 무게를 둡니다 — 그것이 파이프라인을 조용히 망가뜨리는 지점이기 때문입니다.

## 1. 무엇인가 — ECMA-262로 정의된 언어

JavaScript의 표준 이름은 **ECMAScript**이고, 표준 번호는 **ECMA-262**입니다.

| 판 | 통칭 | 발행 |
| --- | --- | --- |
| 15판 | ECMAScript 2024 | 2024-06 |
| 16판 | ECMAScript 2025 | 2025-06 |
| **17판** | **ECMAScript 2026** | **2026-06** |

[Ecma International — ECMA-262](https://ecma-international.org/publications-and-standards/standards/ecma-262/) 기준(확인: 2026-09-06). 매년 6월에 한 판씩 나옵니다.

**주의할 점**: 흔히 참조되는 `https://tc39.es/ecma262/`는 **다음 판의 편집 중 초안**입니다 — 2026-09-06 시점에 이 주소를 열면 "ECMAScript 2027"이라고 나옵니다. 확정된 내용을 근거로 삼으려면 `https://262.ecma-international.org/17.0/`처럼 판번호가 박힌 주소를 씁니다.

### 명세는 입출력을 정의하지 않습니다

이것이 JavaScript를 이해할 때 가장 중요한 구조입니다. 명세 본문에 이렇게 적혀 있습니다.

> ECMAScript as defined here is not intended to be computationally self-sufficient; indeed, there are no provisions in this specification for input of external data or output of computed results.
>
> — [ECMA-262, 17th edition (ECMAScript 2026), §4 Overview](https://262.ecma-international.org/17.0/) (확인: 2026-09-06)

즉 **파일 읽기·네트워크 요청·`console.log`·DOM은 전부 언어 명세에 없습니다.** 명세는 그것들을 *호스트*에 위임합니다.

> A host is an external source that further defines facilities listed in Annex D … A host is often an external specification, such as WHATWG HTML.
>
> — 같은 문서, §4.2 Hosts and Implementations (확인: 2026-09-06)

그래서 같은 JavaScript 코드가 브라우저에서는 되고 Node.js에서는 안 되는 일이 생깁니다. **언어가 다른 게 아니라 호스트가 다른 것**입니다.
`document`는 브라우저(WHATWG HTML)가, `fs`·`process`는 Node.js가 각각 제공합니다.

## 2. 동적 타입과 암묵적 형변환

**실행 환경**: Node.js v22.21.1 (macOS, Darwin 24.6.0). 아래 출력은 모두 실제로 돌린 것입니다.

```console
$ node -e 'console.log("1" + 2); console.log("3" - 1); console.log([] + {}); console.log(0.1 + 0.2);'
12
2
[object Object]
0.30000000000000004
```

- `"1" + 2` → `"12"` — `+`는 한쪽이 문자열이면 문자열 결합
- `"3" - 1` → `2` — `-`는 문자열을 숫자로 바꿔서 계산
- 같은 피연산자 조합에서 **연산자에 따라 방향이 반대**입니다

`0.1 + 0.2`가 `0.30000000000000004`인 것은 JavaScript만의 문제가 아니라 IEEE 754 배정밀도를 쓰는 모든 언어에서 같습니다.

### 오류는 그 줄에 닿아야 발견됩니다

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

**존재하지 않는 함수를 부르는 코드가 실행 전에 걸리지 않습니다.** `run(false)`는 멀쩡히 통과하고, `run(true)`로 그 분기에 닿아서야 터집니다.
드물게 타는 오류 처리 경로에 오타가 있으면, 정작 장애가 났을 때 그 경로가 또 터집니다.

## 3. 수 표현 — 데이터 엔지니어가 실제로 걸리는 곳

JavaScript의 `Number`는 **IEEE 754 배정밀도 부동소수점 하나뿐**입니다. 정수 전용 타입이 없습니다.
안전하게 표현되는 정수의 상한은 2^53 − 1입니다.

```console
$ node -e 'console.log(Number.MAX_SAFE_INTEGER); console.log(9007199254740993); console.log(9007199254740993n);'
9007199254740991
9007199254740992
9007199254740993n
```

두 번째 줄을 보십시오. **`9007199254740993`을 넣었는데 `9007199254740992`가 나왔습니다.** 오류도 경고도 없습니다.
세 번째 줄의 `9007199254740993n`은 BigInt 리터럴이고, 이건 정확합니다.

### JSON 왕복에서 id가 조용히 바뀝니다

BIGINT 기본키나 Snowflake ID를 JSON으로 실어 나르면 이 일이 실제로 벌어집니다.

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

`amount`는 뒤 세 자리가 바뀌었습니다(`...789` → `...800`). 같은 입력을 Python으로 돌리면 이렇습니다.

```console
$ python3 -c "…json.loads(raw)…"
id     : 9007199254740993
amount : 1234567890123456789
다시 직렬화: {"id":9007199254740993,"amount":1234567890123456789}
```

**같은 JSON 문자열이 통과하는 언어에 따라 값이 달라집니다.** JSON 명세는 수의 정밀도를 규정하지 않기 때문에, 이것은 구현의 차이가 아니라 각 언어의 수 모델 차이입니다.

파이프라인 중간에 Node.js 기반 도구(API 게이트웨이, 로그 수집기, 사내 프록시, 일부 ETL SaaS)가 한 단계라도 끼어 있으면 **id가 바뀐 채로 하류에 저장될 수 있습니다.** 예외가 나지 않으므로 알림도 오지 않습니다.
발견은 보통 훨씬 뒤, JOIN이 안 맞거나 중복 키가 생길 때 일어납니다.

실무에서 쓰는 방어책은 **큰 정수를 JSON에서 문자열로 실어 나르는 것**입니다. `BigInt`는 언어 안에서는 정확하지만 `JSON.stringify`가 기본적으로 처리하지 못하므로, 경계에서 문자열로 바꾸는 쪽이 단순합니다.

> 위 방어책은 이 저장소의 판단이며 사실이 아니라 의견입니다. 다만 **정밀도 손실 자체는 위 실행 기록으로 확인된 사실**입니다.

## 4. 실무에서 어디에 쓰이는가

Stack Overflow 2025 개발자 설문에서 JavaScript 사용률은 **66%로 1위**였습니다([2025 Stack Overflow Developer Survey — Technology](https://survey.stackoverflow.co/2025/technology), 확인: 2026-09-06. 해당 문항 응답 31,771건).
**설문 자료이며 자기선택 편향이 있습니다** — 코드 규모나 중요도가 아니라 응답자 비율입니다.

주요 영역:

- **브라우저 UI** — 원래의 자리. React·Vue 등
- **서버** — Node.js 런타임 위의 API 서버, BFF
- **빌드·개발 도구** — 번들러, 린터, 테스트 러너. 다른 언어 프로젝트도 프런트엔드 자산이 있으면 여기에 걸립니다
- **데스크톱·모바일** — Electron, React Native

### 데이터 엔지니어가 만나는 지점

직접 애플리케이션을 짜기보다는 대개 이렇게 만납니다.

1. **JSON 경계** — 위 §3. 이게 가장 실질적입니다.
2. **대시보드·시각화 커스터마이징** — Superset·Grafana 플러그인, 사내 리포트 페이지
3. **도구 체인** — 문서 사이트, 사내 CLI, 일부 데이터 카탈로그 UI가 npm 생태계 위에 있습니다
4. **웹훅·서버리스 글루** — 짧은 연동 함수를 Node로 짜는 경우

## 5. 경계 — JavaScript가 안 맞는 상황

- **정확한 정수·소수 연산이 필요한 곳.** §3 그대로입니다. 금액·대용량 id·정산 로직은 다른 타입 체계가 필요합니다.
- **CPU 바운드 대량 처리.** 기본 실행 모델이 단일 스레드 이벤트 루프라 무거운 계산이 루프를 막습니다(Worker로 나눌 수는 있지만 별도 설계가 필요합니다).
- **타입 보증이 필요한 큰 코드베이스.** 위 실행 기록처럼 오류가 실행 시점까지 남습니다 — 이 지점 때문에 TypeScript가 존재합니다.
- **성숙한 데이터 처리 생태계가 필요한 곳.** pandas·Spark에 대응할 만한 것이 얇습니다.

## 6. 실패 모드

### (1) 큰 정수가 조용히 바뀜

§3의 실행 기록. **예외가 없다는 점이 핵심**입니다. 로그에도 메트릭에도 남지 않습니다.

### (2) 암묵적 형변환으로 잘못된 값이 계산됨

`"1" + 2`가 `"12"`가 되는 경로가 집계에 끼면, 합계가 문자열 결합으로 조용히 바뀝니다. 이 역시 예외 없이 진행됩니다.

### (3) 실행되지 않은 경로의 오류가 남아 있음

§2의 실행 기록. 테스트가 닿지 않은 분기는 배포 후에 처음 실행됩니다.

### (4) `undefined`와 `null`이 섞임

값 없음을 나타내는 값이 둘이고 동작이 다릅니다. 원천 데이터의 NULL을 JS 계층이 거치면서 어느 쪽으로 바뀌는지에 따라 하류의 판정이 달라질 수 있습니다.

> (4)는 이 저장소에서 재현 기록을 남기지 않았습니다 — **확인 필요.**

## 출처

- [Ecma International — ECMA-262 표준 페이지](https://ecma-international.org/publications-and-standards/standards/ecma-262/) — 판 번호와 발행 연월. 확인: 2026-09-06
- [ECMA-262, 17th edition (ECMAScript 2026)](https://262.ecma-international.org/17.0/) — §1 Scope, §4 Overview, §4.2 Hosts and Implementations. 확인: 2026-09-06
- [2025 Stack Overflow Developer Survey — Technology](https://survey.stackoverflow.co/2025/technology) — 사용률. 설문 자료이며 자기선택 편향이 있습니다. 확인: 2026-09-06

---

*작성일: 2026-09-06*
