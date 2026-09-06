# TypeScript란 무엇인가 — 타입은 컴파일 후 사라진다

TypeScript를 "타입이 있는 JavaScript"로만 알고 있으면 가장 중요한 성질을 놓칩니다.
**타입은 컴파일 시점에만 존재하고 실행 시점에는 남지 않습니다.** 그래서 외부에서 들어온 데이터에 타입을 붙이면, 그 타입은 검증이 아니라 선언에 그칩니다.
파이프라인 하류를 다루는 사람에게는 이 지점이 실질적인 위험입니다.

## 1. 무엇인가

TypeScript는 JavaScript의 문법적 상위집합에 **정적 타입 시스템**을 얹은 언어이고, `tsc` 컴파일러가 타입을 검사한 뒤 **타입을 지워 JavaScript를 내보냅니다.**

JavaScript와의 결정적 차이가 하나 더 있습니다. **TypeScript에는 표준화 기구가 없습니다.**
JavaScript는 Ecma International이 ECMA-262로 매년 판을 발행하지만, TypeScript는 Microsoft가 개발하고 버전을 정합니다. 언어 변경에 외부 표준 절차가 개입하지 않습니다.

## 2. 버전 — 지금 큰 전환기입니다

npm 레지스트리(`registry.npmjs.org/typescript`)를 직접 조회해 확인한 배포 이력입니다(조회: 2026-09-06).

| 버전 | npm 배포일 | 성격 |
| --- | --- | --- |
| 5.9.3 | 2025-09-30 | 5.x 계열 |
| 6.0.2 | 2026-03-23 | **JavaScript 코드베이스 기반의 마지막 릴리스** |
| 6.0.3 | 2026-04-16 | |
| **7.0.2** | **2026-07-08** | **Go로 다시 작성한 네이티브 구현. 현재 `latest`** |

조회 시점의 dist-tags는 `latest: 7.0.2`, `beta: 6.0.0-beta`, `rc: 7.0.1-rc`였습니다.

TypeScript 6.0은 7.0으로 넘어가기 위한 **징검다리 릴리스**입니다. Microsoft는 6.0을 "현재 JavaScript 코드베이스에 기반한 마지막 릴리스"로 설명하며, 7.0에서 제거될 것들을 6.0에서 먼저 경고로 띄우는 구조를 택했습니다([Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/), 확인: 2026-09-06).

### TypeScript 7 = Go 네이티브 포팅

7.0은 컴파일러를 **Go로 다시 작성한 것**입니다. 발표에 실린 측정치입니다([Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), 확인: 2026-09-06).

| 프로젝트 | 이전 | 7.0 | 배수 |
| --- | --- | --- | --- |
| VS Code | 125.7s | 10.6s | 11.9x |
| Sentry | 139.8s | 15.7s | 8.9x |
| Bluesky | 24.3s | 2.8s | 8.7x |
| Playwright | 12.8s | 1.47s | 8.7x |
| tldraw | 11.2s | 1.46s | 7.7x |

메모리 사용량은 6~26% 감소했다고 밝히고 있습니다.

**이 수치를 그대로 인용할 때 주의할 점**: 발표 자료에 **측정 하드웨어·코어 수·반복 횟수·워밍업 여부가 명시돼 있지 않습니다.** 자사 발표이고, 대상 프로젝트도 대규모 오픈소스로 선택된 것입니다.
"우리 프로젝트에서 8~12배 빨라진다"는 결론을 여기서 끌어낼 수 없습니다 — 직접 재야 합니다. **이 저장소에서는 빌드 시간을 측정하지 않았습니다.**

## 3. 어떻게 동작하는가

**실행 환경**: TypeScript 7.0.2 (`npm install typescript@7.0.2`로 로컬 설치), Node.js v22.21.1, macOS Darwin 24.6.0. 아래는 모두 실제 출력입니다.

```console
$ ./node_modules/.bin/tsc --version
Version 7.0.2
```

### 타입 오류는 컴파일 시점에 걸립니다

```typescript title="bad.ts"
function add(a: number, b: number): number {
  return a + b;
}
add("1", 2);
```

```console
$ tsc --noEmit bad.ts
bad.ts(4,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

JavaScript였다면 실행돼서 `"12"`가 나왔을 코드입니다. 여기서는 실행 전에 걸립니다.

### 컴파일 결과에는 타입이 없습니다

```typescript title="sum.ts"
function add(a: number, b: number): number {
  return a + b;
}
console.log(add(1, 2));
```

```console
$ tsc sum.ts && cat sum.js
"use strict";
function add(a, b) {
    return a + b;
}
console.log(add(1, 2));
```

타입 표기가 전부 사라졌습니다. **런타임에는 타입 정보가 남지 않습니다.**

### 그래서 외부 데이터에 붙인 타입은 거짓말이 될 수 있습니다

여기가 이 문서의 핵심입니다.

```typescript title="runtime.ts"
interface Row { id: number; name: string; }
const raw: string = '{"id":"3","name":null}';
const row = JSON.parse(raw) as Row;
console.log(typeof row.id, row.id, row.name);
console.log(row.id + 1);
```

```console
$ tsc runtime.ts && node runtime.js
string 3 null
31
```

`row.id`는 `number`로 선언됐지만 **실제 값은 문자열 `"3"`** 이고, `name`은 `string`인데 `null`입니다.
그리고 `row.id + 1`이 `4`가 아니라 **`31`** 입니다 — 문자열 결합이 일어났습니다. 컴파일러는 아무 오류도 내지 않았습니다.

`as Row`는 컴파일러에게 "이건 Row다"라고 말한 것일 뿐, **아무것도 검사하지 않습니다.** 검사할 코드가 생성되지 않으니 런타임에 확인할 방법이 없습니다.

API 응답·Kafka 메시지·CSV 파싱 결과처럼 **바깥에서 들어온 데이터**에 `as`를 쓰면 타입 시스템이 주는 안전은 그 지점에서 끊깁니다. 경계에서는 타입 선언이 아니라 **실제로 실행되는 검증 코드**가 필요합니다.

## 4. TypeScript 7의 기본값과 제거된 옵션

7.0은 기본값을 바꾸고 오래된 옵션을 **제거**했습니다. 아래는 로컬에서 직접 확인한 것입니다.

**`strict`가 기본으로 켜져 있습니다** (6.0 이전에는 꺼져 있었습니다).

```console
$ tsc --ignoreConfig --noEmit strictcheck.ts
strictcheck.ts(1,16): error TS7006: Parameter 'name' implicitly has an 'any' type.

$ tsc --ignoreConfig --noEmit --strict false strictcheck.ts
(오류 없음)
```

**제거된 옵션은 경고가 아니라 오류입니다.**

```console
$ tsc -p tsconfig.es5.json
tsconfig.es5.json(1,34): error TS5108: Option 'target=ES5' has been removed. Please remove it from your configuration.

$ tsc -p tsconfig.node.json
tsconfig.node.json(1,44): error TS5108: Option 'moduleResolution=node10' has been removed. Please remove it from your configuration.
```

공식 발표 기준으로 6.0/7.0에서 바뀐 주요 항목입니다(위 두 발표 글, 확인: 2026-09-06).

- **바뀐 기본값**: `strict` false→**true**, `module` commonjs→**esnext**, `target` es5→**es2025**, `types` 자동 수집→**`[]`**, `rootDir` 추론→**`.`**
- **제거**: `target: es5`, 모듈 형식 `amd`/`umd`/`systemjs`, `baseUrl`, `moduleResolution: node`/`node10`/`classic`, `outFile`
- **강제**: `esModuleInterop`·`allowSyntheticDefaultImports`를 false로 둘 수 없음
- **축소**: JavaScript 파일의 JSDoc 지원(`@enum`, Closure 스타일 문법 등이 더 이상 인식되지 않음)

`types: []`가 기본이 된 것은 조용히 걸리는 변경입니다. 이전에는 `node_modules/@types` 아래를 자동으로 끌어왔지만, 이제는 `"types": ["node"]`처럼 **명시해야** 합니다.

## 5. 실무에서 어디에 쓰이는가

Stack Overflow 2025 개발자 설문 기준 TypeScript 사용률은 **43.6%**입니다([2025 Stack Overflow Developer Survey — Technology](https://survey.stackoverflow.co/2025/technology), 확인: 2026-09-06. 해당 문항 응답 31,771건. 같은 설문 JavaScript 66%).
**설문 자료이며 자기선택 편향이 있습니다.**

주요 영역은 JavaScript가 쓰이는 곳과 거의 겹치되, 규모가 커진 곳에 몰립니다.

- **프런트엔드 애플리케이션** — 화면과 상태가 많아 타입 없이는 유지가 어려운 규모
- **Node.js 백엔드** — API 서버, BFF
- **라이브러리·SDK 배포** — 타입 정의를 함께 배포해 사용자 쪽 편집기 지원을 제공
- **개발 도구** — 번들러·린터 등 npm 생태계 도구 다수

### 데이터 엔지니어가 만나는 지점

직접 쓰기보다 **경계에서** 만나는 경우가 많습니다.

1. **사내 대시보드·어드민 화면**을 손볼 때
2. **데이터 계약(schema)을 프런트와 맞출 때** — 타입 정의가 계약처럼 보이지만, §3에서 본 대로 런타임 보증이 아닙니다
3. **Node 기반 연동 함수**를 짤 때

## 6. 경계 — TypeScript가 안 맞는 상황

- **런타임 검증이 필요한 곳.** §3 그대로입니다. 외부 입력 검증은 타입 시스템의 일이 아닙니다.
- **TypeScript 7을 쓰면서 Vue·Svelte·Angular 템플릿 타입 검사가 필요한 경우.** 7.0에는 **안정적인 programmatic API가 아직 없어서**, TypeScript를 내장해 쓰는 도구(Volar 계열)가 동작하지 않습니다. 공식 발표는 이 API를 **7.1에 제공할 예정**이라고 밝히며, 해당 프레임워크 사용자는 7.0 채택을 미루라고 안내합니다([Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), 확인: 2026-09-06).
- **짧은 스크립트.** 빌드 단계와 설정 파일의 고정 비용이 스크립트보다 큽니다.
- **JavaScript 파일에 JSDoc으로 타입을 달아 온 프로젝트.** 7.0에서 지원 범위가 줄었습니다.
- **표준 기반 안정성이 중요한 경우.** 언어 변경이 단일 벤더의 결정으로 이뤄집니다.

## 7. 실패 모드

### (1) `as`로 붙인 타입을 검증으로 착각

§3의 실행 기록. `row.id + 1`이 `31`이 되고 **오류는 나지 않습니다.** 잘못된 값이 그대로 하류로 갑니다.
`any`를 쓰지 않았고 인터페이스도 선언했기 때문에, 코드만 읽으면 안전해 보입니다.

### (2) 7.0 업그레이드 시 빌드가 통째로 실패

§4의 실행 기록. 제거된 옵션은 경고가 아니라 **오류**라 빌드가 멈춥니다.
공식 안내는 **6.0을 먼저 거치라**는 것입니다 — 6.0에서는 같은 항목이 경고로 나오고 `--ignoreDeprecations: "6.0"`으로 임시 유예할 수 있습니다.

### (3) `types: []` 기본값으로 인한 타입 누락

전역 타입이 자동으로 안 잡혀서 `process`·`Buffer` 같은 것이 없다고 나옵니다. `"types": ["node"]`를 명시해야 합니다.

### (4) 타입 정의와 실제 데이터의 표류

원천 스키마가 바뀌어도 TypeScript 인터페이스는 그대로 남습니다. 컴파일은 계속 통과하고, 런타임에 `undefined`가 흐릅니다.

> (4)는 구조에서 따라 나오는 설명이며 **이 저장소에서 재현 기록을 남기지 않았습니다 — 확인 필요.**

## 출처

- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) — 네이티브 포팅, 성능 수치, 제거된 옵션, 7.1 API 예정. 확인: 2026-09-06
- [Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) — 징검다리 릴리스, 기본값 변경, 폐기 항목. 확인: 2026-09-06
- npm 레지스트리 `registry.npmjs.org/typescript` — 버전별 배포일과 dist-tags. 직접 조회: 2026-09-06
- [2025 Stack Overflow Developer Survey — Technology](https://survey.stackoverflow.co/2025/technology) — 사용률. 설문 자료이며 자기선택 편향이 있습니다. 확인: 2026-09-06

---

*작성일: 2026-09-06*
