---
sidebar_position: 4
---

# pnpm — 무엇을 공유하고, 무엇을 막는가

pnpm은 흔히 "빠르고 디스크를 아끼는 npm 대체품"으로 소개됩니다. 그 설명은 절반만 맞습니다.
pnpm의 실제 성격은 **`node_modules`를 평평하게 만들지 않는다**는 데 있고, 여기서 디스크 절약과 "설치는 됐는데 다른 곳에서 깨지는" 문제의 차단이 함께 따라옵니다.
이 문서는 그 구조를 직접 돌려서 확인합니다.

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | 값 |
| --- | --- |
| OS | macOS (Darwin 24.6.0), arm64, 파일시스템 APFS |
| Node | v22.21.1 |
| npm (대조군) | 10.9.4 |
| pnpm | 12.3.4 |
| 실행 날짜 | 2026-09-06 |

**파일시스템이 APFS라는 점이 뒤(§4)에서 결과를 갈라놓습니다.** 다른 파일시스템에서는 다르게 나올 수 있습니다.

---

## 1. pnpm이 무엇을 다르게 하는가

공식 문서는 pnpm의 근거를 두 축으로 설명합니다 (출처: `https://pnpm.io/motivation`, 확인 2026-09-06).

**(1) 파일을 한 곳에 두고 공유합니다.**

> All the files are saved in a single place on the disk. When packages are installed, their files are hard-linked from that single place, consuming no additional disk space.

**(2) `node_modules`를 평평하게 만들지 않습니다.**

> By default, pnpm uses symlinks to add only the direct dependencies of the project into the root of the modules directory.

설치할 때 pnpm이 직접 출력하는 내용에도 이 구조가 그대로 드러납니다.

```bash
$ pnpm add express@5.1.0
Packages are cloned from the content-addressable store to the virtual store.
  Content-addressable store is at: /Users/…/Library/pnpm/store/v11
  Virtual store is at:             node_modules/.pnpm
Packages: +66
Progress: resolved 66, reused 0, downloaded 66, added 66, done

dependencies:
+ express 5.1.0

Done in 556ms using pnpm v12.3.4
```

**두 개의 저장소**가 등장합니다.

| 이름 | 위치 | 무엇인가 |
| --- | --- | --- |
| content-addressable store | `~/Library/pnpm/store/v11` (전역) | 파일 실체가 내용 해시 기준으로 한 벌만 저장되는 곳 |
| virtual store | `node_modules/.pnpm` (프로젝트별) | 스토어에서 가져온 패키지가 버전별로 놓이는 곳 |

---

## 2. `node_modules` 구조 — 최상위에 무엇이 보이는가

`express@5.1.0` 하나만 설치한 프로젝트를 pnpm과 npm으로 각각 만들어 비교했습니다. **`package.json`의 `dependencies`는 양쪽 모두 `express` 하나뿐입니다.**

**pnpm:**

```bash
$ ls -la node_modules
.modules.yaml
.package-map.json
.pnpm/
.pnpm-workspace-state-v1.json
express -> .pnpm/express@5.1.0/node_modules/express

$ ls node_modules | grep -v '^\.' | wc -l
       1

$ ls node_modules/.pnpm | wc -l
      68
```

최상위에 **선언한 `express` 하나만** 있고, 그마저도 심볼릭 링크입니다. 나머지 67개는 `.pnpm` 안에 있습니다.

**npm (같은 `package.json`):**

```bash
$ ls node_modules | grep -v '^\.' | wc -l
      65
```

**최상위에 65개가 펼쳐집니다.** 선언한 것은 하나인데 65개가 보입니다 — npm이 의존성 트리를 평평하게 끌어올리기(호이스팅) 때문입니다.

이 구조 차이는 설정으로 조절할 수 있습니다. 공식 문서 기준 `nodeLinker`의 값입니다 (출처: `https://pnpm.io/settings/node-modules`, 확인 2026-09-06).

| 값 | 동작 | |
| --- | --- | --- |
| `isolated` | "dependencies are symlinked from a virtual store at `node_modules/.pnpm`" | **기본값** |
| `hoisted` | "a flat `node_modules` without symlinks is created. Same as the `node_modules` created by npm or Yarn Classic" | |
| `pnp` | "no `node_modules`. Plug'n'Play is an innovative strategy for Node" | |

이 환경의 실제 설정값입니다.

```bash
$ grep nodeLinker node_modules/.modules.yaml
  "nodeLinker": "isolated",
```

---

## 3. 유령 의존성 — 이게 pnpm을 쓰는 진짜 이유입니다

**유령 의존성(phantom dependency)**은 `package.json`에 선언하지 않았는데 `require`가 되는 패키지입니다. 호이스팅의 부작용입니다.

같은 코드를 양쪽에서 돌렸습니다. `body-parser`는 `express`의 하위 의존성이고, **`package.json`에는 없습니다.**

**npm:**

```bash
$ node -e "const bp=require('body-parser'); console.log('로드 성공 —', typeof bp)"
로드 성공 — function
```

**pnpm:**

```bash
$ node -e "require('body-parser')"
Error: Cannot find module 'body-parser'
  code: 'MODULE_NOT_FOUND',
```

선언한 것은 정상 동작합니다.

```bash
$ node -e "const e=require('express'); console.log('express 로드 OK:', typeof e)"
express 로드 OK: function
```

**왜 이게 중요한가**: npm 쪽 코드는 로컬에서 잘 돕니다. 그러다 `express`가 하위 의존성을 정리하거나 버전을 올려 `body-parser`가 최상위로 올라오지 않게 되는 순간, **아무것도 안 고쳤는데 `MODULE_NOT_FOUND`가 납니다.**
pnpm은 그 상황을 배포 후가 아니라 **로컬 첫 실행에서** 터뜨립니다. 고통의 총량이 줄어드는 게 아니라 **시점이 앞당겨지는 것**입니다.

---

## 4. 디스크 절약 — `du`로는 보이지 않습니다

여기가 이 문서에서 가장 조심해야 할 부분입니다.

같은 의존성(`express@5.1.0`)을 가진 프로젝트를 여러 개 만들고 `du`로 재면, **pnpm과 npm이 똑같이 나옵니다.**

```bash
$ du -sk multi/pnpm-7/node_modules | awk '{print $1}'
3948
$ du -sk multi/npm-7/node_modules | awk '{print $1}'
4004
```

절약이 없는 것처럼 보입니다. 하지만 **실제 디스크는 그렇게 늘지 않습니다.** 프로젝트를 하나씩 추가하면서 볼륨 여유 공간(`df -k`)의 변화를 쟀습니다.

**측정 조건**: 스토어·npm 캐시가 이미 채워진 상태, 같은 `express@5.1.0`, 각 설치 전후로 `sync` 후 `df -k`의 Avail 차이. macOS APFS. 다른 프로세스가 동시에 디스크를 쓰는 실사용 시스템이라 **노이즈가 있습니다.**

```
  pnpm  multi/pnpm-5  ->    468 KB
  pnpm  multi/pnpm-6  ->  -1460 KB     ← 음수: 측정 중 다른 프로세스가 공간을 반환
  pnpm  multi/pnpm-7  ->    312 KB
  npm   multi/npm-5   ->   3540 KB
  npm   multi/npm-6   ->   4176 KB
  npm   multi/npm-7   ->   4516 KB
```

**pnpm은 프로젝트당 300~500KB, npm은 3.5~4.5MB 늘었습니다** — 대략 한 자릿수 배수 차이입니다.
pnpm 쪽 두 번째 값이 음수인 것은 측정의 한계를 그대로 보여줍니다. **이 수치는 "이 조건에서 이 정도 차이가 난다"는 것이지, 일반화된 배수가 아닙니다.**

### 공식 문서는 hard link라고 하는데, 실제로는 clone이었습니다

pnpm 공식 문서(§1 인용)는 "hard-linked"라고 설명합니다. 그런데 이 환경에서 두 프로젝트의 같은 파일을 확인하면 하드링크가 아닙니다.

```bash
$ stat -f "inode=%i  링크수=%l  크기=%z  %N" \
    multi/pnpm-1/…/express/index.js multi/pnpm-2/…/express/index.js
inode=72256978  링크수=1  크기=224  multi/pnpm-1/…/express/index.js
inode=72258644  링크수=1  크기=224  multi/pnpm-2/…/express/index.js
```

**inode가 다르고 링크 수가 1입니다.** 하드링크라면 두 경로가 같은 inode를 가리키고 링크 수가 2 이상이어야 합니다.

이건 문서가 틀린 게 아니라 **플랫폼에 따라 방식이 달라지기 때문**입니다. 공식 설정 문서의 `packageImportMethod` 항목입니다 (출처: `https://pnpm.io/settings/node-modules`, 확인 2026-09-06).

| 값 | 문서 설명 | |
| --- | --- | --- |
| `auto` | "try the platform's cheap link tiers in order, falling back to copying when none of them is possible" | **기본값** |
| `hardlink` | "hard link packages from the store" | |
| `clone` | "clone (AKA copy-on-write or reference link) packages from the store" | |
| `clone-or-copy` | "try to clone packages from the store. If cloning is not supported then fall back to copying" | |
| `copy` | "copy packages from the store" | |

기본값이 `auto`이고, APFS는 copy-on-write 클론을 지원하므로 pnpm이 **clone**을 골랐습니다. 설치 로그의 `Packages are cloned from the content-addressable store`라는 문구가 그것입니다.

**그래서 `du`가 절감을 못 봅니다.** 클론은 별도 inode를 가지며 블록만 공유하므로, `du`는 각 파일을 온전한 크기로 셉니다. 하드링크였다면 `du`가 한 번만 셌을 것입니다.

**실무에서의 함의**: "pnpm 썼는데 `du` 찍어보니 그대로던데"는 잘못된 결론입니다. 반대로 **디스크 용량 산정을 `du` 기준으로 하면 실제보다 크게 잡습니다.**

> 위 결론은 **macOS APFS에서만 확인했습니다.** Linux ext4/overlayfs(=대부분의 컨테이너 환경)에서 pnpm이 하드링크를 고르는지, 그때 `du`가 절감을 보여주는지는 **확인하지 않았습니다 — 확인 필요.**

---

## 5. 락 파일과 CI

pnpm의 락 파일은 `pnpm-lock.yaml`이고 YAML입니다.

```bash
$ head -12 pnpm-lock.yaml
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      express:
        specifier: 5.1.0
```

`importers` 아래에 프로젝트별 항목이 들어가는 구조라, 워크스페이스(모노레포)가 하나의 락 파일에 담깁니다.

CI에서 락을 고정하는 명령은 `--frozen-lockfile`입니다. `package.json`에만 `lodash`를 추가하고 락은 그대로 둔 채 돌린 결과입니다.

```bash
$ pnpm install --frozen-lockfile
Error: ERR_PNPM_OUTDATED_LOCKFILE
  ╰─▶ Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up …
```

에러 코드는 **`ERR_PNPM_OUTDATED_LOCKFILE`**입니다. CI에서 이 메시지가 뜨면 원인은 하나입니다 — 누군가 `package.json`만 고치고 락 파일을 커밋하지 않았습니다.

---

## 6. 설치 — Corepack이 사라진 뒤

pnpm을 설치하는 경로는 여러 개고, 그중 하나가 최근 바뀌었습니다.

Node.js 25.0.0 릴리스 노트의 SEMVER-MAJOR 항목입니다 (출처: `https://nodejs.org/en/blog/release/v25.0.0`, 확인 2026-09-06).

> **build**: stop distributing Corepack (Antoine du Hamel) [#57617]

같은 노트에 관련 항목이 하나 더 있습니다.

> **build**: remove corepack from release tarballs (Jordan Harband) [#59835]

**Node 25부터는 `corepack` 명령이 기본 제공되지 않습니다.** 이 환경(Node v22.21.1)에는 아직 번들돼 있습니다.

```bash
$ corepack -v
0.34.0
```

Node 24 LTS 계열에 Corepack이 여전히 번들되는지는 **확인하지 않았습니다 — 확인 필요.**

실무 선택지는 이렇습니다.

| 방법 | 성격 |
| --- | --- |
| `npm install -g pnpm` | 가장 단순. 단 전역 설치라 Node 버전을 바꾸면 사라질 수 있음 |
| Corepack + `packageManager` 필드 | 프로젝트별 버전 고정. Node 25+에서는 `npm install -g corepack` 선행 필요 |
| 프로젝트 devDependency | `npx pnpm`으로 호출. CI에서 버전이 락 파일과 함께 고정됨 |

---

## 7. 버전 — 메이저가 빠르게 올라갑니다

npm 레지스트리(`registry.npmjs.org/pnpm`)를 직접 조회한 값입니다 (조회 2026-09-06).

| 메이저 | 첫 릴리스 |
| --- | --- |
| 9.0.0 | 2024-04-16 |
| 10.0.0 | 2025-01-07 |
| 11.0.0 | 2026-04-28 |
| 12.0.0 | 2026-08-26 |

조회 시점의 `latest`는 **12.3.4 (2026-09-04)** 였습니다 — 이 문서를 쓰기 이틀 전입니다.

**메이저가 1~2년에 한 번씩 올라가고, 그때 락 파일 포맷(`lockfileVersion`)이 바뀔 수 있습니다.** 팀원과 CI가 서로 다른 pnpm 메이저를 쓰면 락 파일이 매번 다시 쓰이며 충돌합니다. `packageManager` 필드로 버전을 고정하는 게 이 문제의 해법입니다(의견).

---

## 8. 경계 — pnpm이 안 맞는 곳

- **심볼릭 링크를 제대로 못 다루는 도구가 파이프라인에 있을 때.** `node_modules`를 통째로 압축해 옮기거나, 링크를 따라가지 않는 배포 스크립트가 있으면 깨집니다. 이건 pnpm의 버그가 아니라 구조상 당연한 결과입니다.
- **유령 의존성에 기대고 있는 의존성이 많은 레거시 프로젝트.** §3의 차단이 그대로 장애물이 됩니다. `nodeLinker: hoisted`로 우회할 수 있지만, 그러면 pnpm을 쓰는 이유의 절반이 사라집니다.
- **팀 전체가 옮기지 않을 때.** `package-lock.json`과 `pnpm-lock.yaml`이 함께 커밋되면 두 락이 서로 다른 트리를 주장합니다.
- **디스크 절약이 목적인데 컨테이너 이미지가 대상일 때.** 이미지 안에서 스토어가 빌드 레이어 밖에 있으면 공유 효과가 사라집니다.

  > 위 항목은 구조에서 따라 나오는 추론이며 **이 저장소에서 컨테이너 환경으로 재현하지 않았습니다 — 확인 필요.**

- **"빠르다"를 근거로 도입할 때.** 공식 문서는 설치 과정이 "significantly faster than the traditional three-stage installation process"라고 설명하지만(§1 출처), **이 문서에서 설치 시간을 측정하지 않았습니다.** 조건 없는 속도 비교는 인용하지 않습니다.

---

## 9. 실패 모드

### (a) 설치는 됐는데 `MODULE_NOT_FOUND`

§3의 실행 기록. npm에서 pnpm으로 옮긴 직후 가장 흔하게 만나는 증상입니다.
**조치**: 에러에 뜬 패키지를 `package.json`에 제대로 선언합니다. 그게 원래 있었어야 할 상태입니다. 급하면 `nodeLinker: hoisted`가 탈출구지만, 임시 조치라는 것을 문서에 남겨야 합니다(의견).

### (b) 락 파일이 매 커밋마다 통째로 바뀜

팀원 간 pnpm 메이저 버전이 다를 때 나옵니다. `pnpm-lock.yaml` 첫 줄의 `lockfileVersion`이 왔다 갔다 하면 이 경우입니다.

### (c) `du`로 용량을 잘못 산정

§4의 실행 기록. APFS에서는 `du`가 클론 공유분을 셈에 넣지 못해 **실제보다 크게** 나옵니다. 디스크 계획을 `du` 기준으로 세우면 과다 산정됩니다.

### (d) CI에서 `ERR_PNPM_OUTDATED_LOCKFILE`

§5의 실행 기록. `package.json`만 고치고 락을 커밋하지 않은 경우입니다.

---

## 출처

- pnpm 동기 — `https://pnpm.io/motivation` (확인 2026-09-06)
- pnpm node-modules 설정(`nodeLinker`, `packageImportMethod`) — `https://pnpm.io/settings/node-modules` (확인 2026-09-06)
- pnpm 설정 목록 — `https://pnpm.io/settings` (확인 2026-09-06)
- Node.js 25.0.0 릴리스 노트(Corepack 배포 중단) — `https://nodejs.org/en/blog/release/v25.0.0` (확인 2026-09-06)
- pnpm 버전 이력 — npm 레지스트리 `registry.npmjs.org/pnpm` 직접 조회 (2026-09-06)
- 실행 기록 — macOS Darwin 24.6.0 / arm64 / APFS / Node v22.21.1 / pnpm 12.3.4 / npm 10.9.4, 2026-09-06 직접 실행

---

*작성일: 2026-09-06*
