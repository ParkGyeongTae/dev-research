---
sidebar_position: 5
---

# `dig`·`curl`·`openssl`로 브라우저의 페이지 로딩을 어떻게 관찰하는가

> **원문** — [BIND 9 Manual Pages, `dig`](https://bind9.readthedocs.io/en/v9.21.12/manpages.html) · [everything curl, Verbose](https://everything.curl.dev/usingcurl/verbose/index.html) · [OpenSSL Documentation, `openssl-s_client`](https://docs.openssl.org/3.4/man1/openssl-s_client/)
>
> **확인 날짜** — 2026-09-12. `dig` 문서는 BIND 9 9.21.12 문서, `curl` 문서는 공식 everything curl, `openssl` 문서는 OpenSSL 3.4 문서를 확인했습니다.
>
> **검증 상태** — 세 명령어를 이 환경에서 `example.com`에 실제 실행하고 출력 일부를 기록했습니다. 명령어의 출력은 DNS 응답, 원격 서버, 네트워크 경로에 따라 달라집니다. 브라우저의 실제 DevTools trace는 직접 수집하지 않았습니다.

브라우저가 `https://example.com`을 로드하는 과정을 네트워크 관점에서 단순화하면 다음과 같습니다.

```text
URL
 ↓
DNS 조회       dig
 ↓
TCP 연결
 ↓
TLS handshake  openssl s_client
 ↓
HTTP 요청/응답  curl
 ↓
HTML parsing → DOM → CSSOM → rendering
```

세 명령어는 브라우저를 흉내 내는 도구가 아니라, 브라우저가 의존하는 네트워크 층을 각각 분리해서 관찰하는 진단 도구입니다.

## 실행 환경

이번 기록은 다음 환경에서 실행했습니다.

```text
Darwin gyeongtaee.local 24.6.0 Darwin Kernel Version 24.6.0: Mon Jan 19 22:01:58 PST 2026; root:xnu-11417.140.69.708.3~1/RELEASE_ARM64_T6041 arm64
DiG 9.10.6
curl 8.7.1 (x86_64-apple-darwin24.0) libcurl/8.7.1 (SecureTransport) LibreSSL/3.3.6 zlib/1.2.12 nghttp2/1.64.0
OpenSSL 3.6.3 9 Jun 2026
```

## 1. `dig`로 DNS 이름 해석을 확인합니다

`dig`는 DNS name server를 질의하고 응답받은 record를 표시하는 명령어입니다. 서버를 따로 지정하지 않으면 이 시스템의 `/etc/resolv.conf`에 설정된 resolver를 사용합니다.
— [BIND 9 Manual Pages, `dig`](https://bind9.readthedocs.io/en/v9.21.12/manpages.html) (확인: 2026-09-12)

```bash
dig +noall +answer example.com A
```

이번 실행 결과는 다음과 같습니다.

```text
example.com.        251     IN      A       104.20.23.154
example.com.        251     IN      A       172.66.147.243
```

여기서 확인할 수 있는 것은 `example.com`의 A record 응답과 TTL입니다. 주소가 여러 개라는 것은 하나의 hostname이 여러 IPv4 주소로 응답될 수 있음을 보여 줍니다. 브라우저가 실제로 어느 주소에 연결했는지는 DNS 출력만으로 확정할 수 없습니다.

이번 `curl` 실행에서는 `172.66.147.243`에 연결했습니다. DNS가 여러 주소를 반환할 수 있고, resolver·client의 주소 선택과 재시도에 따라 실제 연결 대상이 달라질 수 있기 때문입니다.

## 2. `openssl s_client`로 TLS를 확인합니다

`openssl s_client`는 원격 host에 SSL/TLS client로 연결하는 진단 명령어입니다.
— [OpenSSL Documentation, `openssl-s_client`](https://docs.openssl.org/3.4/man1/openssl-s_client/) (확인: 2026-09-12)

```bash
openssl s_client \
  -connect example.com:443 \
  -servername example.com \
  -brief </dev/null 2>&1
```

`-servername`은 TLS SNI에 `example.com`을 넣습니다. 하나의 IP에서 여러 도메인을 제공하는 서버는 SNI를 보고 적절한 인증서를 선택할 수 있으므로, IP만 지정해 연결하는 테스트와 hostname을 함께 지정하는 테스트의 결과가 달라질 수 있습니다.

이번 실행 결과의 핵심은 다음과 같습니다.

```text
Connecting to 172.66.147.243
CONNECTION ESTABLISHED
Protocol version: TLSv1.3
Ciphersuite: TLS_AES_256_GCM_SHA384
Peer certificate: CN=example.com
Verification: OK
Negotiated TLS1.3 group: X25519MLKEM768
DONE
```

이 결과로 이번 연결이 TLS 1.3을 협상했고, 인증서 검증이 성공했으며, `example.com`을 대상으로 연결했다는 사실을 확인할 수 있습니다. 이것은 HTTP 응답 status나 HTML 내용을 확인한 결과는 아닙니다. TLS handshake 다음에 HTTP 요청이 별도로 필요합니다.

## 3. `curl`로 HTTP 응답을 확인합니다

`curl`은 HTTP 요청을 직접 보내므로 브라우저의 주소창 navigation보다 작은 단위로 HTTP를 볼 수 있습니다. `-D -`는 response header를 표준 출력에 표시하고, `-o /dev/null`은 body를 버립니다.

```bash
curl -sS -D - -o /dev/null \
  -w '\nhttp_code=%{http_code}\nremote_ip=%{remote_ip}\nhttp_version=%{http_version}\ntime_namelookup=%{time_namelookup}\ntime_connect=%{time_connect}\ntime_appconnect=%{time_appconnect}\ntime_starttransfer=%{time_starttransfer}\ntime_total=%{time_total}\n' \
  https://example.com
```

이번 실행에서 받은 응답 header와 측정값은 다음과 같습니다.

```text
HTTP/2 200
date: Sat, 12 Sep 2026 14:17:47 GMT
content-type: text/html
server: cloudflare
last-modified: Fri, 11 Sep 2026 17:42:00 GMT
allow: GET, HEAD
accept-ranges: bytes
age: 5803
cf-cache-status: HIT
cf-ray: a39f89a7dcfcdd96-KIX

http_code=200
remote_ip=172.66.147.243
http_version=2
time_namelookup=0.006859
time_connect=0.142190
time_appconnect=0.281118
time_starttransfer=0.422418
time_total=0.422572
```

`curl`의 `--write-out` 변수는 요청 결과를 단계별로 관찰하게 해 줍니다. `time_namelookup`은 이름 해석 완료까지, `time_connect`는 TCP 연결 완료까지, `time_appconnect`는 TLS handshake 완료까지, `time_starttransfer`는 첫 byte를 받기 직전까지, `time_total`은 전체 작업까지의 시간을 뜻합니다.
— [everything curl, Available `--write-out` variables](https://everything.curl.dev/usingcurl/verbose/all-variables.html) (확인: 2026-09-12)

이번 실행에서는 다음처럼 읽을 수 있습니다.

```text
DNS 완료       0.006859초
TCP 연결 완료  0.142190초
TLS 완료       0.281118초
첫 byte 직전   0.422418초
전체 완료      0.422572초
```

단, 이 숫자를 브라우저의 실제 페이지 로딩 시간으로 부르면 안 됩니다. 브라우저는 response body를 받은 뒤 HTML parsing, 하위 CSS·JavaScript·image 요청, DOM·CSSOM 구성, layout·paint를 추가로 수행합니다. 또한 브라우저의 cache·connection 재사용·Cookie·proxy 설정도 이 실행과 다를 수 있습니다.

## 4. `curl -v`로 요청과 응답의 경계를 봅니다

`curl`의 verbose 모드는 전송 과정의 추가 정보를 표시합니다. 공식 curl 문서는 예상과 다른 결과가 나오면 `-v` 또는 `--verbose`를 사용해 보라고 안내합니다.
— [everything curl, Verbose](https://everything.curl.dev/usingcurl/verbose/index.html) (확인: 2026-09-12)

```bash
curl -v -o /dev/null https://example.com
```

이 명령어로 다음을 확인할 수 있습니다.

- 어떤 주소와 port로 연결했는가
- TLS handshake가 성공했는가
- 어떤 HTTP version을 사용했는가
- 실제로 보낸 request header와 받은 response header는 무엇인가
- redirect가 있었는가

`curl -v`의 출력은 서버와 요청 조건에 따라 달라지므로, 문서에 붙이는 출력은 실행 시점의 실제 결과여야 합니다. 여기서는 응답 header와 측정값을 재현 가능한 형태로 남겼습니다.

## 5. 세 명령어의 결과를 브라우저의 관찰 지점에 대응시킵니다

| 브라우저에서 궁금한 것 | 사용할 명령어 | 확인할 것 |
| --- | --- | --- |
| 도메인이 어느 주소로 해석되는가 | `dig` | A·AAAA record, TTL, 응답 resolver |
| HTTPS 연결이 성립하는가 | `openssl s_client` | SNI, TLS version, cipher, 인증서 검증 |
| 서버가 어떤 HTTP 응답을 주는가 | `curl` | status, header, HTTP version, timing |
| HTML이 DOM으로 어떻게 변하는가 | 브라우저 DevTools | Elements, Network, Performance |
| 하위 리소스가 언제 요청되는가 | 브라우저 DevTools | Initiator, waterfall, cache 상태 |

이 대응 관계는 “브라우저 로딩 시간을 하나의 숫자”로 보지 않게 해 줍니다. DNS가 느린지, TCP·TLS 연결이 느린지, 서버가 첫 byte를 늦게 보내는지, HTML 이후 리소스가 병목인지 질문을 분리할 수 있습니다.

## 명령어가 보여 주지 않는 것

이 명령어들은 브라우저를 완전히 재현하지 않습니다.

- 브라우저의 DNS·HTTP cache와 connection pool 사용 여부
- Cookie, service worker, proxy, 확장 프로그램, 브라우저 정책
- CORS에 따른 JavaScript의 응답 읽기 가능 여부
- HTML parser, DOM·CSSOM, JavaScript 실행, layout, paint
- 이미지·font·stylesheet·script가 만드는 추가 요청의 실행 순서

따라서 네트워크 층의 원인을 좁힌 뒤에는 브라우저 DevTools Network·Performance panel로 같은 URL을 관찰해야 합니다.

## 확인하지 못한 것

- **브라우저의 실제 navigation trace** — 이 환경에서 Chrome DevTools Network·Performance panel을 실행하지 않았습니다.
- **다른 네트워크 조건에서의 수치** — 단일 시점의 `example.com` 요청만 실행했으므로, 반복 측정이나 지역·resolver·cache별 성능을 주장하지 않습니다.
- **HTTP/3 경로** — 이번 `curl` 실행은 HTTP/2를 사용했으며, QUIC·HTTP/3 연결은 별도로 검증하지 않았습니다.

*작성일: 2026-09-12*
