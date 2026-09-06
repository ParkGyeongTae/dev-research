---
sidebar_position: 1
---

# Node.js 설치 — 설치 경로가 결정하는 것

Node.js를 설치하는 방법은 네 가지입니다. 그런데 실제로 갈리는 것은 "얼마나 쉬운가"가 아니라 **나중에 버전을 바꿀 수 있는가**, 그리고 **그 Node가 어느 환경에서 보이는가**입니다.
이 문서는 그 두 가지를 개념으로 잡고 실측으로 확인합니다.

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | 값 |
| --- | --- |
| OS | macOS 15.7.4 (BuildVersion 24G517) |
| 아키텍처 | arm64 |
| 셸 | zsh |
| 실행 날짜 | 2026-09-06 |

---

## 1. 어느 버전을 고를 것인가

### 릴리스 정책

공식 문서 원문입니다 (출처: `https://nodejs.org/en/about/previous-releases`, 확인 2026-09-05).

> Major Node.js versions enter _Current_ release status for six months, which gives library authors time to add support for them. Historically (up to Node.js 26), odd-numbered releases (9, 11, etc.) become unsupported after six months, and even-numbered releases (10, 12, etc.) move to _Active LTS_ status and are ready for general use. Starting with Node.js 27, the release cycle will be annual and every major version will move to _LTS_ status after its six-month _Current_ phase (and six additional months of _Alpha_ phase). _LTS_ release status is "long-term support", which typically guarantees that critical bugs will be fixed for a total of 30 months. Production applications should only use _Active LTS_ or _Maintenance LTS_ releases.

정리하면 이렇습니다.

- major는 릴리스 후 **6개월간 Current**입니다.
- **Node 26까지는** 짝수 major만 그 뒤 Active LTS로 넘어가고, 홀수 major는 6개월 뒤 지원이 끊깁니다.
- **Node 27부터는** 이 규칙이 바뀝니다 — 주기가 연 단위가 되고, 모든 major가 Current 6개월(+ Alpha 6개월) 뒤 LTS가 됩니다.
- LTS는 **총 30개월** 동안 critical bug fix를 보장합니다.
- 공식 문서는 프로덕션에서 **Active LTS 또는 Maintenance LTS만** 쓰라고 못박습니다.

"짝수는 LTS"라는 규칙이 27부터 없어진다는 것이 실무에 걸립니다 — 이 규칙을 외워 둔 스크립트나 문서가 있다면 그때 틀리기 시작합니다.

### 지금 시점의 실제 버전

기억이 아니라 공식 배포 인덱스를 직접 조회한 결과입니다.

```bash
$ curl -s https://nodejs.org/dist/index.json | node -e "…"
Current: v26.8.1 2026-08-26 npm 11.19.0
Latest LTS: v24.20.0 2026-08-26 npm 11.19.0 codename Krypton
v22 latest: v22.23.2 2026-07-28 npm 10.9.8 Jod
```

| 계열 | 코드네임 | 2026-09-06 기준 최신 | 번들 npm |
| --- | --- | --- | --- |
| v26 | — | v26.8.1 (Current) | 11.19.0 |
| v24 | Krypton | v24.20.0 (Latest LTS) | 11.19.0 |
| v22 | Jod | v22.23.2 | 10.9.8 |

**확인 필요:** 각 계열의 정확한 지원 종료(EOS) 날짜는 이 조회로는 알 수 없습니다. `nodejs.org/en/about/previous-releases`의 표를 직접 봐야 합니다.

여기서 눈여겨볼 것은 **Node 버전마다 번들되는 npm 버전이 다르다**는 점입니다. v24/v26은 npm 11 계열, v22는 npm 10 계열입니다. **Node를 고르는 것은 npm까지 고르는 일입니다.**

---

## 2. 설치 경로 네 가지

공식 다운로드 페이지(`https://nodejs.org/en/download`, 확인 2026-09-05)가 제시하는 것은 네 가지입니다.

| 경로 | 실체 | 버전 전환 |
| --- | --- | --- |
| **패키지 매니저 / 버전 매니저** | nvm, fnm, n, Homebrew, Chocolatey … | 도구에 따라 다름 |
| **Prebuilt Installer** | `.pkg`(macOS), `.msi`(Windows) | 불가 — 덮어쓰기 |
| **Prebuilt Binaries** | `.tar.gz` 압축 해제 | 수동 |
| **Source** | 서명된 소스 tarball을 직접 빌드 | 수동 |

오른쪽 열이 이 표의 요점입니다. **네 경로가 갈리는 지점은 버전 전환입니다.**

그리고 이 페이지에는 다음 경고가 붙어 있습니다 (원문 그대로).

> and their installation scripts are not maintained by the Node.js project.

즉 **nvm·fnm·Homebrew는 Node.js 프로젝트가 관리하지 않습니다.** 문제가 생기면 각 도구 저장소에 물어야 합니다.

### 공식 페이지가 안내하는 명령

LTS(24) 기준으로 페이지가 그대로 보여주는 명령입니다.

nvm:

```bash
# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"

# Download and install Node.js:
nvm install 24
```

Homebrew:

```bash
brew install node@24
```

nvm 쪽 두 번째 줄(`\. "$HOME/.nvm/nvm.sh"`)이 §3의 예고편입니다 — **버전 매니저는 셸에 무언가를 로드해야 동작합니다.**

---

## 3. 버전 매니저는 셸 초기화에 묶여 있습니다

버전 매니저가 버전을 바꾸는 방식은 **PATH를 갈아끼우는 것**이고, 그 갈아끼우기는 셸 초기화 파일(`.zshrc` 등)에서 일어납니다. 이 한 가지에서 실무의 문제 셋이 나옵니다.

### (a) 셸 초기화 파일을 안 읽는 환경에서는 없는 것과 같습니다

같은 스크립트를 셸 모드만 바꿔 돌린 결과입니다. `env -i`로 환경 변수를 비운 뒤 실행했습니다.

```bash
$ cat probe.zsh
print -r -- "node=$(command -v node)"
print -r -- "version=$(node -v)"
print -r -- "nvm current=$(nvm current 2>/dev/null || echo '<nvm 없음>')"

$ env -i HOME="$HOME" TERM=dumb /bin/zsh probe.zsh
node=
probe.zsh:2: command not found: node
version=
nvm current=<nvm 없음>

$ env -i HOME="$HOME" TERM=dumb /bin/zsh -i probe.zsh
node=/Users/pgt0409/.nvm/versions/node/v22.21.1/bin/node
version=v22.21.1
nvm current=v22.21.1
```

**인터랙티브 셸(`-i`)에서만 node가 잡힙니다.** cron·systemd·`sh -c`·일부 CI 스텝이 전부 위쪽 경우입니다.

증상은 "로컬에서는 되는데 cron/CI에서만 `command not found`"로 나타납니다. 해결은 버전 매니저를 억지로 로드하는 게 아니라, **그 환경에서는 절대 경로를 쓰거나 버전 매니저에 의존하지 않는 설치 경로를 고르는 것**입니다(의견).

### (b) 서로 다른 경로의 node가 공존합니다

PATH를 갈아끼우는 방식이므로, 다른 경로에 깔린 node는 사라지지 않고 **PATH 뒤쪽에 남습니다.** 로그인 셸에서 실제로 찍은 결과입니다.

```bash
$ which -a node
/Users/pgt0409/.nvm/versions/node/v22.21.1/bin/node
/opt/homebrew/bin/node

$ ls -l /opt/homebrew/bin/node
lrwxr-xr-x@ 1 pgt0409 admin 30 May 12 23:39 /opt/homebrew/bin/node -> ../Cellar/node/26.0.0/bin/node
```

nvm이 관리하는 v22.21.1과 Homebrew가 설치한 v26.0.0이 함께 있고, PATH 순서로 앞의 것이 이깁니다. nvm은 후자를 `system`이라는 이름으로 인식합니다.

```
$ nvm ls
->     v22.21.1 *
         system * (-> v26.0.0)
default -> 22.21.1 (-> v22.21.1 *)
```

**증상:** `nvm use`로 버전을 바꿨는데 `node -v`가 그대로거나, 편집기·GUI 앱에서 띄운 터미널만 다른 버전을 씁니다. PATH 순서가 상황마다 달라지기 때문입니다.

같은 이유로 **공식 인스톨러(`.pkg`)는 개발 머신에 권하지 않습니다**(의견). 버전을 바꾸려면 덮어쓰는 수밖에 없고, 나중에 버전 매니저를 도입하면 남은 `/usr/local/bin/node`가 위와 같은 형태로 PATH에서 충돌합니다.

**추측:** 위 상태에서 `nvm use system`을 하면 Homebrew의 v26.0.0으로 넘어갑니다. 이 문서에서는 실행하지 않았습니다 — 확인 필요.

### (c) 전역 패키지도 버전마다 따로 깔립니다

PATH 갈아끼우기의 결과가 전역 설치 위치에도 나타납니다.

```bash
$ npm root -g
/Users/pgt0409/.nvm/versions/node/v22.21.1/lib/node_modules
$ npm prefix -g
/Users/pgt0409/.nvm/versions/node/v22.21.1
```

두 가지를 읽습니다.

- **경로에 버전 번호가 들어 있습니다.** 전역 패키지는 Node 버전마다 따로 설치되며, Node를 바꾸면 전역으로 깔아둔 CLI가 **사라진 것처럼 보입니다.** 실제로는 이전 버전 디렉터리에 그대로 있습니다.
- **경로가 홈 아래입니다.** 그래서 `sudo`가 필요 없습니다.

**추측:** 이 상태에서 `sudo npm install -g`를 쓰면 홈 디렉터리 아래에 root 소유 파일이 생기고, 이후 일반 사용자로 하는 설치가 권한 오류로 깨질 것입니다. 위 경로가 홈 아래라는 것만 확인했을 뿐, 실제로 `sudo`로 설치해 깨뜨려 보지는 않았습니다.

---

## 4. 그래서 무엇을 고를 것인가

§2의 "버전 전환"과 §3의 "어느 환경에서 보이는가"를 겹치면 상황별 답이 나옵니다. 여기부터는 사실이 아니라 **판단**입니다.

| 상황 | 권장 | 이유 |
| --- | --- | --- |
| 개발 머신 | **버전 매니저**(nvm/fnm) | 프로젝트마다 Node 버전이 다른 게 정상이고, 전환이 안 되면 결국 하나에 맞추게 됩니다 |
| CI | **CI가 제공하는 setup 액션** 또는 컨테이너 이미지 | §3(a). 셸 초기화 파일에 의존하지 않습니다 |
| 컨테이너 | **공식 `node:<버전>` 이미지** | 이미지 태그가 곧 버전 고정입니다. 그 안에서 다시 버전을 바꿀 일이 있다면 이미지 설계가 잘못된 것입니다(의견) |
| 프로덕션 서버 | OS 패키지 또는 컨테이너 | nvm은 정의상 **사용자별** 설치입니다. 계정마다 따로 깔리므로 "서버에 Node를 깔았다"가 성립하지 않습니다 |

즉 **버전 매니저는 사람이 앉아서 쓰는 환경의 도구**입니다. 사람이 없는 환경(cron, CI 러너, 서비스 계정, 컨테이너)에서는 §3의 세 문제가 그대로 나타나므로, 거기서는 버전을 **환경 자체에 박아 두는** 쪽이 맞습니다.

---

*작성일: 2026-09-06*
