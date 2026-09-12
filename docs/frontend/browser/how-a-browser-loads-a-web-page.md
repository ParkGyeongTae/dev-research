---
sidebar_position: 1
---

# 브라우저는 웹페이지를 어떻게 표시하는가 — URL 입력부터 픽셀과 상호작용까지

> **원문** — [Fetch Standard](https://fetch.spec.whatwg.org/) · [HTML Standard](https://html.spec.whatwg.org/multipage/) · [Inside look at modern web browser, part 1](https://developer.chrome.com/blog/inside-browser-part1) · [Constructing the Object Model](https://web.dev/articles/critical-rendering-path/constructing-the-object-model) · [Render-tree Construction, Layout, and Paint](https://web.dev/articles/critical-rendering-path/render-tree-construction)
>
> **확인 날짜** — 2026-09-12. WHATWG Fetch·HTML 표준과 Chrome for Developers·web.dev의 공식 자료를 확인했습니다. Fetch Standard는 2026-09-02 갱신된 Living Standard입니다.
>
> **검증 상태** — `dig`, `curl`, `openssl`로 `example.com`의 DNS·HTTPS·HTTP 응답을 직접 확인했습니다. 이 환경에 Chrome 실행 파일이 없어 Chrome DevTools의 실제 탐색 기록과 렌더링 타임라인은 직접 수집하지 못했습니다. 브라우저 내부의 프로세스 배치와 네트워크 구현은 Chrome 공식 설명을 기준으로 정리했으며, 모든 브라우저에 같은 구조가 적용된다고 일반화하지 않았습니다.

Chrome의 주소창에 `https://example.com`을 입력하면 “서버에서 HTML을 받아 화면에 표시한다”는 일이 일어납니다. 그러나 그 사이에는 URL 해석, 캐시 확인, DNS 이름 확인, 연결 재사용 또는 연결 수립, TLS와 HTTP 교환, HTML 파싱, 하위 리소스 요청, JavaScript 실행, 레이아웃과 페인트가 이어집니다.

전체 흐름은 다음처럼 볼 수 있습니다.

```text
사용자가 URL 입력
       │
       ▼
브라우저가 URL·origin·navigation을 결정
       │
       ├─ HTTP cache에 사용 가능한 응답이 있는가?
       │       └─ 있으면 네트워크를 생략하거나 재검증
       ▼
DNS로 호스트 이름을 주소로 확인
       │
       ▼
연결 재사용 또는 TCP·TLS 등 연결 준비
       │
       ▼
HTTP 요청 전송 ←→ HTTP 응답 수신
       │
       ├─ redirect·CORS·인증서·MIME·정책 확인
       └─ 응답 본문 스트리밍
       ▼
HTML 바이트 → 문자 → 토큰 → DOM
       │                 ├─ CSS 요청 → CSSOM
       │                 ├─ script 요청·실행
       │                 └─ image/font/module 등 추가 요청
       ▼
DOM + CSSOM → render tree → layout → paint → 화면
       │
       ▼
이벤트 루프가 사용자 입력과 비동기 작업을 계속 처리
```

이 그림은 한 번에 순서대로 끝나는 파이프라인이 아닙니다. 캐시가 사용되면 네트워크 단계가 줄어들고, 기존 연결을 재사용하면 DNS·연결 수립의 일부가 생략될 수 있습니다. HTML을 받는 동안 브라우저는 문서를 파싱하면서 CSS·JavaScript·이미지 같은 하위 리소스를 추가로 요청할 수 있습니다.

## 1. 브라우저는 먼저 탐색할 URL과 요청의 성격을 결정합니다

주소창에 입력한 문자열은 곧바로 HTTP 요청의 바이트가 되지 않습니다. 브라우저는 문자열을 URL로 파싱하고, 어떤 문서로 탐색할지 결정하며, 요청의 목적지와 origin 같은 정보를 계산합니다.

WHATWG Fetch Standard는 URL을 HTTP(S)만이 아니라 `about:`, `blob:`, `data:`, `file:` 등을 포함하는 fetch scheme의 입력으로 다룹니다.

> The Fetch Standard defines requests, responses, and the process that binds them: fetching.
>
> **번역** — Fetch Standard는 요청·응답과 둘을 연결하는 과정인 fetching을 정의합니다.
>
> — [Fetch Standard, Abstract](https://fetch.spec.whatwg.org/#abstract) (확인: 2026-09-12)

따라서 브라우저의 “페이지 접속”은 단순히 `GET URL` 하나를 전송하는 기능이 아닙니다. Fetch 모델은 redirect, CORS, HTTP cache, credentials, referrer policy, mixed content 같은 웹 플랫폼의 정책과 네트워크 동작을 함께 다룹니다.

예를 들어 다음 URL에서 브라우저가 요청의 기준으로 읽는 값은 다음과 같습니다.

```text
https://www.example.com:443/docs/index.html?lang=ko#intro
└─┬─┘ └──────┬──────┘ └┬┘ └────────────┬────────────┘ └──┬──┘
 scheme      host      port            path             fragment
```

`#intro` 같은 fragment는 서버에 전송되는 HTTP 요청 대상의 일부가 아니라 문서 안의 위치를 가리키는 정보입니다. 그러므로 fragment만 바뀌는 이동은 서버에서 새 HTML을 받는 navigation과 다를 수 있습니다. 브라우저가 history와 same-document navigation을 처리하는 방식은 일반적인 새 문서 요청과 분리해서 봐야 합니다.

## 2. 캐시는 네트워크보다 먼저 결과를 바꿀 수 있습니다

브라우저가 항상 DNS부터 조회하고 서버에 연결하는 것은 아닙니다. Fetch Standard는 요청에 cache mode가 있고, 기본 `default` 모드에서는 HTTP cache에 신선한 일치 응답이 있는지 먼저 확인하도록 정의합니다.
— [Fetch Standard, HTTP cache modes](https://fetch.spec.whatwg.org/#http-cache) (확인: 2026-09-12)

캐시 결과에 따라 같은 URL의 탐색도 다음처럼 달라질 수 있습니다.

| 상황 | 브라우저가 할 수 있는 일 | 화면에 나타나는 차이 |
| --- | --- | --- |
| 신선한 캐시 응답 | 저장된 응답을 사용 | 네트워크 왕복이 없거나 줄어듦 |
| 오래된 캐시 응답 | 조건부 요청으로 서버에 재검증 | `304 Not Modified` 등으로 본문 재전송을 줄일 수 있음 |
| 캐시 없음 | 서버에 새 요청 | DNS·연결·응답 수신이 필요할 수 있음 |
| `no-store` 등 정책 적용 | 캐시를 사용하지 않음 | 매번 네트워크 경로를 거칠 가능성이 커짐 |

여기서 “캐시를 사용했다”와 “네트워크 요청이 전혀 없었다”는 같은 말이 아닙니다. 오래된 응답은 서버에 재검증할 수 있고, HTML이 캐시에서 왔더라도 HTML이 참조하는 CSS·JavaScript·이미지는 별도의 캐시 판정과 요청을 가집니다.

또한 최신 Fetch Standard는 네트워크 파티션 키와 HTTP cache partition을 정의합니다. 브라우저의 캐시가 모든 사이트가 공유하는 하나의 전역 저장소라고 가정하면 실제 브라우저의 격리 정책을 놓치게 됩니다.
— [Fetch Standard, HTTP cache partitions](https://fetch.spec.whatwg.org/#http-cache-partitions) (확인: 2026-09-12)

## 3. 호스트 이름을 주소로 확인합니다

캐시된 연결 정보나 주소가 없다면 브라우저는 `www.example.com` 같은 호스트 이름을 네트워크 주소로 확인해야 합니다. WHATWG Fetch Standard는 origin을 resolve하는 과정이 보통 DNS를 포함한다고 설명하지만, 구체적인 구현과 캐시 방식 전체를 하나로 고정하지는 않습니다.
— [Fetch Standard, resolving an origin](https://fetch.spec.whatwg.org/#resolving-an-origin) (확인: 2026-09-12)

가장 작은 확인은 `dig`로 DNS 응답을 직접 보는 것입니다.

```text
$ dig +short example.com A
172.66.147.243
104.20.23.154
```

이 출력은 이번 실행에서 DNS resolver가 `example.com`의 A 레코드로 두 IPv4 주소를 반환했다는 사실을 보여 줍니다. 이것만으로 브라우저가 반드시 이 순서로 접속한다고 결론 내릴 수는 없습니다. 브라우저·운영체제·resolver가 결과를 캐시하거나 주소 선택 순서를 바꿀 수 있고, IPv6 주소와 다른 연결 정보가 함께 사용될 수도 있기 때문입니다.

## 4. 연결을 준비하고 HTTPS를 협상합니다

브라우저는 선택한 주소와 포트로 연결을 사용합니다. 이미 적절한 연결이 있으면 재사용할 수 있고, 없으면 프로토콜에 필요한 연결 수립 절차를 수행합니다. HTTPS라면 TLS를 통해 서버 인증서와 암호화된 통신 조건을 확인한 뒤 HTTP 메시지를 주고받습니다.

이 과정은 매 navigation마다 똑같이 반복되지 않습니다. HTTP/2나 HTTP/3 연결을 이미 유지하고 있을 수 있고, DNS·TLS·HTTP 연결 정보가 캐시되어 있을 수 있습니다. 그러므로 “URL 입력 → 매번 TCP handshake → 매번 TLS handshake”는 교육용 단순화일 뿐, 모든 탐색의 관측 결과는 아닙니다.

다음은 브라우저가 아니라 `curl`과 `openssl`로 같은 HTTPS endpoint를 확인한 기록입니다.

```text
$ curl -sS -o /dev/null -w 'http_code=%{http_code}\nremote_ip=%{remote_ip}\nhttp_version=%{http_version}\ncontent_type=%{content_type}\n' https://example.com
http_code=200
remote_ip=104.20.23.154
http_version=2
content_type=text/html

$ printf '\n' | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates
subject=CN=example.com
issuer=C=US, O=SSL Corporation, CN=Cloudflare TLS Issuing ECC CA 3
notBefore=Jul 29 22:10:08 2026 GMT
notAfter=Oct 27 22:17:21 2026 GMT
```

이 기록에서 확인한 것은 다음까지입니다.

- 이번 요청은 HTTP status `200`을 받았습니다.
- `curl`은 원격 주소에 HTTP/2를 사용했다고 보고했습니다.
- 응답의 `Content-Type`은 `text/html`이었습니다.
- TLS 인증서의 주체와 발급자, 유효 기간을 확인했습니다.

이것은 Chrome의 네트워크 스택과 동일한 실행 기록이 아닙니다. `curl`과 Chrome은 연결 재사용, 헤더, 캐시, 사용자 인증 정보, 우선순위에서 다를 수 있습니다. 실행 도구가 다르다는 점을 숨기지 않아야 브라우저의 동작과 네트워크 도구의 동작을 혼동하지 않을 수 있습니다.

## 5. HTTP 응답은 HTML을 화면으로 바꾸는 입력이 됩니다

서버가 HTML 응답을 보내면 브라우저는 응답 본문을 모두 받은 뒤에야 파싱하는 것이 아니라, 도착하는 데이터를 점진적으로 처리할 수 있습니다. HTML Standard는 HTML 문서를 토큰화하고 트리를 구성하는 파서 알고리즘을 정의합니다.
— [HTML Standard, parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html) (확인: 2026-09-12)

개념적으로는 다음 변환입니다.

```text
HTML 바이트
   ↓ 인코딩에 따라 문자로 디코딩
문자열
   ↓ tokenizer
토큰
   ↓ tree builder
DOM(Document Object Model)
```

가장 작은 HTML은 다음과 같습니다.

```html
<!doctype html>
<html>
  <body>
    <p>Hello</p>
  </body>
</html>
```

브라우저가 이 문서를 파싱하면 `html` 아래에 `body`와 `p`, 텍스트 노드가 연결된 DOM을 만듭니다. DOM은 문서의 구조를 표현하지만, 각 노드가 화면의 어느 위치에 어떤 색과 크기로 나타나는지까지 결정하지는 않습니다.

## 6. HTML을 파싱하면서 하위 리소스를 추가로 요청합니다

HTML에는 문서 자체만 있는 것이 아닙니다. `<link rel="stylesheet">`, `<script src>`, `<img src>`, `<iframe>`, `<video>` 같은 요소는 다른 리소스를 가리킬 수 있습니다. 브라우저는 HTML 파서와 각 웹 플랫폼 API의 규칙에 따라 이러한 리소스를 발견하고 추가 fetch를 시작합니다.

Chrome DevTools Network panel은 요청의 `Initiator`로 HTML parser, redirect, JavaScript 등을 구분해 보여 줍니다. 즉, 네트워크 요청은 주소창 navigation 하나로 끝나지 않고 문서·파서·스크립트가 만든 요청들의 그래프로 확장됩니다.
— [Network features reference, Chrome DevTools](https://developer.chrome.com/docs/devtools/network/reference) (확인: 2026-09-12)

```html
<head>
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>
</head>
<body>
  <img src="hero.webp" alt="">
</body>
```

이 예시에서는 최초 HTML 요청 뒤에 최소한 CSS·JavaScript·이미지 요청이 더 생길 수 있습니다. 실제 요청 수는 캐시, 중복 제거, 응답 오류, lazy loading, preload, service worker와 브라우저 정책에 따라 달라집니다.

`script`의 위치와 속성도 파싱 흐름을 바꿉니다. 파서가 실행해야 하는 일반적인 외부 script를 만나면 JavaScript를 가져오고 실행하는 동안 HTML 파싱이 멈출 수 있습니다. `defer`나 `async`는 이 순서와 실행 시점을 바꾸므로, “HTML을 다 받은 뒤 JavaScript를 실행한다”는 설명은 모든 script에 맞지 않습니다.

## 7. CSSOM과 DOM이 렌더 트리를 구성합니다

CSS도 HTML과 별도의 구조로 파싱됩니다. 브라우저는 CSS 규칙을 CSSOM(CSS Object Model)으로 만들고, DOM과 CSSOM을 이용해 실제로 표시할 대상을 계산합니다.

> The CSSOM and DOM trees are combined into a render tree, which is then used to compute the layout of each visible element and serves as an input to the paint process that renders the pixels to screen.
>
> **번역** — CSSOM과 DOM 트리를 결합해 render tree를 만들고, 이 render tree로 표시되는 각 요소의 layout을 계산한 뒤 픽셀을 화면에 그리는 paint 과정의 입력으로 사용합니다.
>
> — [Render-tree Construction, Layout, and Paint, web.dev](https://web.dev/articles/critical-rendering-path/render-tree-construction) (확인: 2026-09-12)

렌더링의 개념적 순서는 다음과 같습니다.

```text
DOM + CSSOM
    ↓
render tree — 화면에 표시할 노드와 계산된 스타일
    ↓
layout      — 각 상자의 위치와 크기
    ↓
paint       — 텍스트·색·테두리·이미지 등을 픽셀로 그림
```

render tree에는 모든 DOM 노드가 그대로 들어가는 것이 아닙니다. 예를 들어 `display: none`인 노드는 화면에 표시되지 않으므로 render tree에서 제외됩니다. `visibility: hidden`처럼 보이지 않지만 공간을 차지하는 경우는 다르게 처리됩니다.
— [Render-tree Construction, Layout, and Paint, web.dev](https://web.dev/articles/critical-rendering-path/render-tree-construction) (확인: 2026-09-12)

그래서 HTML이 정상적으로 다운로드되었다고 화면이 곧바로 완성되는 것은 아닙니다. DOM·CSSOM을 만들고, 표시할 노드의 스타일과 기하 정보를 계산하고, 실제 픽셀을 그리는 별도의 작업이 남아 있습니다.

## 8. 첫 화면과 “페이지가 완전히 끝남”은 다릅니다

브라우저는 모든 이미지와 추적 스크립트가 끝날 때까지 아무것도 그리지 않는 방식으로 동작하지 않습니다. 초기 렌더링에 필요한 자원과 나중에 필요한 자원이 다르고, CSS와 parser-blocking script의 의존성도 다르기 때문입니다.

web.dev는 critical rendering path를 DOM·CSSOM·render tree·layout·paint와 그에 필요한 네트워크 자원의 경로로 설명합니다.
— [Understand the critical path, web.dev](https://web.dev/learn/performance/understanding-the-critical-path) (확인: 2026-09-12)

다음 이벤트는 서로 다른 시점을 나타냅니다.

| 시점 | 의미 | 아직 끝나지 않을 수 있는 것 |
| --- | --- | --- |
| 첫 paint | 일부 내용이 처음 픽셀로 보임 | 이미지·폰트·스크립트·추가 렌더링 |
| `DOMContentLoaded` | 문서의 DOM이 구성되고 defer script 등이 처리된 시점 | 이미지 같은 하위 리소스 |
| `load` | 문서와 종속 리소스의 load 조건이 충족된 시점 | 이후 JavaScript fetch, 사용자 상호작용 |
| 페이지 interactive | 사용자가 입력하고 JavaScript가 이벤트를 처리할 수 있음 | 백그라운드 작업과 추가 요청 |

이 표의 이벤트 시점은 서로 대체 관계가 아닙니다. `load`가 발생했다고 해서 네트워크 요청이 영원히 끝났거나 JavaScript가 더 이상 실행되지 않는다는 뜻은 아닙니다. 애플리케이션은 `fetch()`로 계속 데이터를 가져오거나 DOM을 변경할 수 있습니다.

## 9. Chrome의 여러 프로세스는 브라우저 동작의 구현 방식입니다

Chrome for Developers의 브라우저 구조 설명은 브라우저 UI와 권한 있는 작업을 조정하는 browser process, 탭 안의 웹 콘텐츠를 처리하는 renderer process, GPU 작업을 담당하는 GPU process 등을 설명합니다.

> The important thing to note here is that these different architectures are implementation details. There is no standard specification on how one might build a web browser.
>
> **번역** — 중요한 점은 이러한 여러 아키텍처가 구현 세부사항이라는 것입니다. 웹 브라우저를 어떻게 만들어야 하는지 정한 표준 규격은 없습니다.
>
> — [Inside look at modern web browser, part 1, Chrome for Developers](https://developer.chrome.com/blog/inside-browser-part1) (확인: 2026-09-12)

따라서 “Chrome에서 URL을 입력하면 renderer process가 DNS를 하고 화면을 그린다”처럼 한 프로세스가 모든 일을 한다고 단정하면 안 됩니다. Chrome의 문서상 browser process는 네트워크 요청 같은 권한 있는 작업도 다루며, renderer process는 웹페이지 내용을 처리합니다. 실제 프로세스 배치와 책임은 Chrome 버전·플랫폼·사이트 격리 정책에 따라 달라질 수 있습니다.
— [Inside look at modern web browser, part 1, Chrome for Developers](https://developer.chrome.com/blog/inside-browser-part1) (확인: 2026-09-12)

운영체제 관점에서 브라우저도 프로세스와 스레드로 실행되는 애플리케이션입니다. 브라우저 프로세스와 renderer process 사이에는 IPC가 필요하고, renderer process의 권한을 제한하는 sandbox가 보안 경계의 일부가 됩니다. 이 내용은 웹 표준이 보장하는 페이지 동작이 아니라 Chrome의 설계와 운영체제 기능이 결합된 구현입니다.

## 10. 한 번의 접속이 요청 그래프로 바뀌는 이유

처음에는 사용자가 HTML 문서 하나를 요청한 것처럼 보입니다. 하지만 HTML이 파싱되면서 발견되는 리소스마다 새로운 요청이 생기고, JavaScript가 실행되면 `fetch()`·XHR·WebSocket 같은 추가 통신이 시작될 수 있습니다.

```text
navigation: https://example.com/
  ├─ document: /index.html
  ├─ stylesheet: /app.css
  ├─ script: /app.js
  │    └─ fetch: /api/me
  ├─ image: /hero.webp
  └─ font: /site.woff2
```

각 요청에는 별도의 URL, cache mode, credentials, origin 정책, 응답 MIME type, 우선순위와 initiator가 있을 수 있습니다. Chrome DevTools의 Waterfall은 요청 시작·대기·다운로드 시간을 보여 주고, Initiator는 어떤 요청이 다른 요청을 시작했는지 보여 줍니다.
— [Network features reference, Chrome DevTools](https://developer.chrome.com/docs/devtools/network/reference) (확인: 2026-09-12)

그러므로 “웹페이지 로딩 시간”을 하나의 서버 응답 시간으로만 측정하면 안 됩니다. 최초 문서의 서버 대기 시간, 하위 리소스의 의존성, main-thread의 parsing·script·layout 비용이 함께 첫 화면과 상호작용 가능 시점을 결정합니다.

## 직접 확인한 것과 확인하지 못한 것

이번 문서에서 직접 실행한 것은 `example.com`에 대한 DNS 조회, HTTPS 응답 확인, TLS 인증서 요약입니다. 브라우저를 실행한 결과가 아니므로 Chrome cache hit 여부, Chrome의 connection pool 사용 여부, renderer process의 실제 배치, DOMContentLoaded와 paint 시각을 이 실행 기록으로 주장하지 않았습니다.

이 구분이 필요한 이유는 같은 URL도 다음 조건에 따라 경로가 달라지기 때문입니다.

- 브라우저의 HTTP cache와 DNS cache 상태
- 기존 HTTP/2·HTTP/3 연결의 존재 여부
- service worker와 사이트 정책
- HTML의 CSS·script·image 의존성
- 장치의 CPU·GPU와 문서 크기
- Chrome 버전과 운영체제의 네트워크 구현

## 확인하지 못한 것

- **이 환경에서 Chrome의 실제 navigation trace** — Chrome 실행 파일이 설치되어 있지 않아 DevTools Network·Performance panel로 직접 기록하지 못했습니다.
- **Chrome의 버전별 프로세스·네트워크 구현** — 확인한 Chrome 공식 자료는 브라우저 구조의 개념과 대표 구성을 설명하지만, 이 환경에서 사용한 Chrome 버전의 내부 코드 경로를 제공하지 않습니다.
- **`example.com`의 서버 내부 처리** — 직접 확인한 것은 클라이언트가 받은 DNS·TLS·HTTP 결과이며, Cloudflare와 원본 서버 내부의 요청 라우팅·캐시·HTML 생성 과정은 확인하지 않았습니다.
- **모든 브라우저에 공통인 렌더링 구현** — DOM·CSSOM·HTML parsing 같은 웹 플랫폼 규칙과 달리 프로세스 분리·GPU 사용·스케줄링은 브라우저 구현에 따라 달라질 수 있으므로 Chrome 설명을 다른 브라우저에 그대로 일반화하지 않았습니다.

*작성일: 2026-09-12*
