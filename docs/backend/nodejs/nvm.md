---
sidebar_position: 2
---

# nvm — Node 버전을 셸 단위로 갈아끼우기

nvm은 "Node를 설치하는 도구"가 아니라 **현재 셸의 PATH를 바꿔치는 셸 함수**입니다.
이 한 문장이 nvm의 거의 모든 동작을 설명합니다 — "왜 새 터미널에서는 버전이 되돌아가지?", "왜 CI에서는 nvm 명령이 없다고 나오지?"가 전부 여기서 나옵니다.

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | 값 |
| --- | --- |
| OS | macOS 15.7.4 (BuildVersion 24G517), arm64 |
| 셸 | zsh |
| nvm | 0.40.5 |
| Node | v22.21.1 (npm 10.9.4) |
| 실행 날짜 | 2026-09-06 |

**주의:** 이 환경의 nvm은 Homebrew로 설치된 것인데, 공식 저장소는 이를 지원하지 않는다고 명시합니다(§4).

---

## 1. nvm이란 무엇인가

공식 저장소 README 원문입니다 (출처: `https://github.com/nvm-sh/nvm`, 확인 2026-09-05).

> nvm is a version manager for node.js, designed to be installed per-user, and invoked per-shell.

한 문장에 세 조각이 들어 있고, 각각이 실무의 제약 하나씩을 만듭니다.

- **version manager** — Node 자체를 만드는 게 아니라, 공식 배포 바이너리를 받아 `$NVM_DIR/versions/node/<버전>/` 아래에 풀어 둡니다.
- **per-user** — 시스템 전역이 아니라 홈 디렉터리에 설치됩니다. 다른 계정은 이 Node를 못 봅니다.
- **per-shell** — 활성 버전은 **셸 프로세스마다** 따로입니다. 한 터미널에서 `nvm use 24`를 해도 옆 터미널은 그대로입니다.

### nvm은 실행 파일이 아니라 셸 함수입니다

"per-shell"이 어떻게 구현됐는지를 보면 나머지가 풀립니다.

```bash
$ command -v nvm
nvm
$ type nvm | head -1
nvm is a shell function from /opt/homebrew/Cellar/nvm/0.40.5/libexec/nvm.sh
```

`which nvm`이 아무것도 못 찾는 게 정상입니다. **셸 함수라서 그 셸 프로세스 안에만 존재합니다.** 여기서 세 가지가 따라 나옵니다.

- **셸을 새로 띄우면 매번 다시 로드해야 합니다** — 그래서 `.zshrc`/`.bashrc`에 로드 줄이 들어갑니다(§2).
- **`nvm`을 서브 프로세스에서 부를 수 없습니다** — `sh -c 'nvm use 24'`, Makefile의 각 줄, 스크립트 파일 실행 모두 실패합니다.
- **`nvm use`가 PATH를 바꾸는 대상은 현재 셸뿐입니다** — 그래서 셸을 닫으면 사라집니다.

### 그래서 비인터랙티브 셸에는 nvm도 node도 없습니다

로드 줄이 `.zshrc`에 있고 `.zshrc`는 대화형 셸에서만 읽히므로, 결론이 정해져 있습니다. 환경 변수를 비우고 셸 모드만 바꿔 같은 스크립트를 돌린 결과입니다.

```bash
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

**cron·systemd·`sh -c`·일부 CI 스텝이 전부 위쪽 경우입니다.** nvm이 고장 난 게 아니라 애초에 로드된 적이 없는 것입니다.

---

## 2. 설치

공식 저장소가 제시하는 설치 명령입니다 (v0.40.7 기준, 확인 2026-09-05).

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```

wget을 쓴다면:

```bash
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```

URL에 **버전이 박혀 있습니다.** nvm은 자기 자신을 자동으로 갱신하지 않으므로, 새 Node 계열이 나왔는데 `nvm ls-remote`에 안 보이면 먼저 nvm 자체를 올려야 합니다.

설치 스크립트가 셸 프로필에 추가하는 줄은 다음과 같습니다 (README 원문).

```sh
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```

이 두 줄이 §1의 "매번 다시 로드"의 실체입니다. 주석까지 `# This loads nvm`이라고 적혀 있습니다.

---

## 3. 쓰는 법

### 명령 목록

README가 나열하는 핵심 명령입니다.

| 명령 | 하는 일 |
| --- | --- |
| `nvm install <버전>` | 해당 Node 버전을 내려받아 설치 |
| `nvm use <버전>` | **현재 셸의** 활성 버전 전환 |
| `nvm alias default <버전>` | 새로 여는 셸의 기본 버전 지정 |
| `nvm ls` | 설치된 버전 목록 |
| `nvm ls-remote` | 설치 가능한 버전 목록 |
| `nvm current` | 지금 활성 버전 |
| `nvm run <버전> <파일>` | 지정 버전으로 스크립트 실행 |
| `nvm exec <버전> <명령>` | 지정 버전 환경에서 임의 명령 실행 |
| `nvm which <버전>` | 해당 버전 실행 파일 경로 |
| `nvm uninstall <버전>` | 버전 삭제 |

`nvm run`/`nvm exec`가 §1의 "서브 프로세스에서 못 부른다" 문제를 우회하는 **공식 수단**입니다. 스크립트 안에서 특정 버전을 쓰고 싶을 때는 `nvm use`가 아니라 이쪽입니다.

### 전환이 실패했는지 종료 코드로 확인합니다

`nvm use`는 설치돼 있지 않은 버전에 대해 조용히 넘어가지 않고 **종료 코드 3**을 냅니다.

```bash
$ nvm use 18
N/A: version "v18" is not yet installed.

You need to run `nvm install 18` to install and use it.
$ echo $?
3
```

CI 스크립트에서 이 종료 코드를 안 보면, 버전 전환이 실패한 채로 다음 단계가 **기본 버전으로** 계속 돕니다. 증상은 "빌드는 통과했는데 산출물이 이상하다"로 나타납니다 — 실패 지점과 증상이 멀리 떨어져 있어서 추적이 어렵습니다.

### 설치 가능한 LTS 확인

```bash
$ nvm ls-remote --lts | tail -6
       v24.16.0   (LTS: Krypton)
       v24.17.0   (LTS: Krypton)
       v24.18.0   (LTS: Krypton)
       v24.18.1   (LTS: Krypton)
       v24.19.0   (LTS: Krypton)
       v24.20.0   (Latest LTS: Krypton)
```

### `nvm ls`가 보여주는 것

```
$ nvm ls
->     v22.21.1 *
         system * (-> v26.0.0)
default -> 22.21.1 (-> v22.21.1 *)
iojs -> N/A (default)
node -> stable (-> v22.21.1 *) (default)
stable -> 22.21 (-> v22.21.1 *) (default)
unstable -> N/A (default)
lts/* -> lts/krypton (-> N/A)
lts/argon -> v4.9.1 (-> N/A)
...
```

읽는 법:

- `->` 가 붙은 줄이 **현재 활성 버전**입니다.
- `system`은 nvm이 설치하지 않은, PATH에 원래 있던 Node입니다. 여기서는 Homebrew가 깐 v26.0.0입니다.
- `lts/<코드네임>` 은 별칭입니다. `(-> N/A)`는 **그 버전이 아직 설치돼 있지 않다**는 뜻이지, 존재하지 않는다는 뜻이 아닙니다.

**별칭 값은 로컬 파일에 캐시돼 있습니다.** `$NVM_DIR/alias/` 아래 평범한 텍스트 파일이고, `nvm ls-remote`가 이를 갱신합니다.

```bash
$ ls -l ~/.nvm/alias/lts/krypton
-rw-r--r--@ 1 pgt0409 staff 9 Sep 6 20:59 /Users/pgt0409/.nvm/alias/lts/krypton
$ cat ~/.nvm/alias/lts/krypton
v24.20.0
```

파일 수정 시각(20:59)이 위 `ls-remote`를 돌린 시각입니다. **`nvm install --lts`가 옛 버전을 깔려고 한다면 캐시가 낡은 것이므로 `nvm ls-remote`를 먼저 돌려 별칭을 갱신하십시오.**

### `nvm use` 했는데 다른 버전이 나올 때

§1에서 nvm이 하는 일은 PATH 바꿔치기라고 했습니다. 그래서 **PATH에 nvm이 관리하지 않는 Node가 함께 있으면** 순서 싸움이 됩니다. 이 환경의 실제 상태입니다.

```bash
$ which -a node
/Users/pgt0409/.nvm/versions/node/v22.21.1/bin/node
/opt/homebrew/bin/node
$ ls -l /opt/homebrew/bin/node
lrwxr-xr-x@ 1 pgt0409 admin 30 May 12 23:39 /opt/homebrew/bin/node -> ../Cellar/node/26.0.0/bin/node
```

`which -a`로 **후보가 몇 개인지** 먼저 확인하는 게 진단의 시작입니다. `nvm ls`에서 `system`으로 보이던 것이 여기 두 번째 줄입니다.

### `.nvmrc` — 프로젝트에 버전 적어 두기

프로젝트 루트에 `.nvmrc` 파일을 두면 `nvm use`, `nvm install`, `nvm which`를 인자 없이 실행할 때 그 버전을 씁니다. 파일에는 **버전 하나와 개행**만 들어가며, `#`로 주석을 쓸 수 있습니다.

```bash
$ ls -a
.  ..  sub
$ nvm use
No .nvmrc file found
Please see `nvm --help` or https://github.com/nvm-sh/nvm#nvmrc for more information.

$ echo "22.21.1" > .nvmrc
$ cd sub
$ nvm use
Found '/…/nvmrc-demo/.nvmrc' with version <22.21.1>
Now using node v22.21.1 (npm v10.9.4)
```

**하위 디렉터리에서 실행해도 상위로 올라가며 `.nvmrc`를 찾습니다.** 모노레포에서 패키지 디렉터리에 들어가 있어도 루트 설정이 걸립니다.

다만 `.nvmrc`가 있다고 자동으로 전환되지는 않습니다 — `nvm use`를 **직접 쳐야** 합니다. 디렉터리 진입 시 자동 전환은 셸 훅을 따로 설정해야 하는 별개 기능입니다.

### 전역 패키지는 버전마다 따로입니다

```bash
$ npm root -g
/Users/pgt0409/.nvm/versions/node/v22.21.1/lib/node_modules
```

경로에 버전이 들어 있습니다. `nvm install 24`로 새 버전을 깔면 **전역 CLI를 전부 다시 깔아야 합니다.** nvm은 이를 위해 `nvm install <새버전> --reinstall-packages-from=<옛버전>` 옵션을 제공합니다(**확인 필요** — 이 문서에서는 실행하지 않았습니다).

---

## 4. 공식이 지원하지 않는다고 밝힌 구성

README가 명시적으로 적어 둔 것들입니다 (확인 2026-09-05). 여기 해당하면 버그를 만나도 상류에 물을 수 없습니다.

**Homebrew 설치:**

> [Homebrew](https://brew.sh) installation is not supported. If you have issues with homebrew-installed `nvm`, please `brew uninstall` it, and install it using the instructions below, before filing an issue.

이 문서를 작성한 환경이 정확히 그 상태입니다. 직접 확인한 결과입니다.

```bash
$ brew list --versions nvm
nvm 0.40.5
$ ls -l ~/.nvm/nvm.sh
lrwxr-xr-x@ 1 pgt0409 staff 36 Jul 11 08:47 /Users/pgt0409/.nvm/nvm.sh -> /opt/homebrew/opt/nvm/libexec/nvm.sh
```

`~/.nvm/nvm.sh`가 실제 파일이 아니라 Homebrew Cellar를 가리키는 심볼릭 링크입니다. **버그를 만나도 nvm 저장소에 이슈를 낼 수 없는 구성**이라는 뜻입니다. 지금 동작에 문제가 없다면 급히 바꿀 이유는 없지만, 문제가 생기면 재설치가 첫 번째 조치입니다(의견).

**Windows:**

> `nvm` also supports Windows in some cases. It should work through WSL (Windows Subsystem for Linux) depending on the version of WSL. It should also work with Git Bash (MSYS) or Cygwin. Otherwise, for Windows, a few alternatives exist, which are neither supported nor developed by us.

**fish 셸:**

> `nvm` does not support Fish either (see #303). Alternatives exist, which are neither supported nor developed by us.

---

## 5. 그래서 어디에 쓰는가

§1의 "per-user, per-shell"이 그대로 적용 범위를 정합니다. **사람이 앉아서 여러 프로젝트를 오가는 환경**이 nvm의 자리이고, 그 밖에서는 성질 자체가 걸림돌이 됩니다. (의견)

- **컨테이너 이미지** — `node:24-slim` 같은 공식 이미지가 이미 버전을 고정합니다. 이미지 안에 nvm을 넣으면 §1의 셸 초기화 의존만 늘어납니다.
- **여러 사용자가 쓰는 서버** — per-user 설치이므로 계정마다 따로 깔립니다. "서버에 Node를 깔았다"가 성립하지 않습니다.
- **cron·CI 스텝** — §1의 마지막 실행 기록 그대로입니다. 절대 경로를 쓰거나, 그 환경이 제공하는 setup 수단을 씁니다.
- **셸 시작 시간이 중요할 때** — nvm 로드는 매 셸 시작마다 셸 스크립트를 해석합니다. Rust로 작성된 fnm 같은 대안이 이 지점을 노립니다. **확인 필요** — 이 문서에서 시작 시간을 측정하지 않았습니다.

---

*작성일: 2026-09-06*
