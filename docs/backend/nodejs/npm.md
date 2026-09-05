---
sidebar_position: 3
---

# npm — 무엇을 잠그고, 무엇을 잠그지 않는가

npm은 Node에 함께 딸려 오기 때문에 "설치할 것"으로 인식되지 않지만, **버전 범위·락 파일·설치 명령이 각각 다른 것을 보장**합니다.
`npm install`과 `npm ci`가 왜 다른지, `engines`가 왜 조용히 무시되는지가 이 문서의 주제입니다.

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | 값 |
| --- | --- |
| OS | macOS 15.7.4 (BuildVersion 24G517), arm64 |
| Node | v22.21.1 |
| npm | 10.9.4 |
| 실행 날짜 | 2026-09-05 |

**주의:** 아래 공식 문서 인용은 **npm CLI v11 문서**(`docs.npmjs.com/cli/v11/...`)이고, 실행 기록은 **npm 10.9.4**입니다. 두 계열이 다른 항목은 그때마다 표시했습니다.

---

## 1. npm이란 무엇인가

공식 문서는 npm을 세 부분으로 나눕니다 (출처: `https://docs.npmjs.com/about-npm`, 확인 2026-09-05).

| 구성 요소 | 하는 일 |
| --- | --- |
| **웹사이트** | 패키지 검색, 프로필·조직 관리 |
| **CLI** | 터미널에서 도는 `npm` 명령 — 대부분의 상호작용이 여기서 일어납니다 |
| **레지스트리** | JavaScript 소프트웨어와 메타데이터의 공개 데이터베이스 |

즉 `npm`이라는 단어는 **CLI**와 **레지스트리** 둘 다를 가리킵니다. "npm을 쓴다"가 "npm CLI를 쓴다"인지 "npm 레지스트리에서 받는다"인지는 구분해야 합니다 — CLI를 pnpm·yarn으로 바꿔도 레지스트리는 그대로일 수 있습니다.

### 설치는 따로 하지 않습니다

npm CLI는 Node 배포에 번들돼 있습니다. Node 버전에 따라 딸려 오는 npm 버전이 다릅니다 — 공식 배포 인덱스를 직접 조회한 값입니다 (2026-09-05 기준).

| Node | 번들 npm |
| --- | --- |
| v26.8.1 (Current) | 11.19.0 |
| v24.20.0 (Latest LTS) | 11.19.0 |
| v22.23.2 | 10.9.8 |

이 환경에서 실제로 찍은 값입니다.

```bash
$ node -v
v22.21.1
$ npm -v
10.9.4
```

**Node 버전을 바꾸면 npm 버전도 같이 바뀝니다.** 팀원마다 npm 계열이 다르면 락 파일 동작도 달라질 수 있으므로, Node 버전을 고정하는 것이 곧 npm 버전을 고정하는 일입니다.

---

## 2. package.json — 무엇을 적는가

공식 문서 기준입니다 (출처: `https://docs.npmjs.com/cli/v11/configuring-npm/package-json`, 확인 2026-09-05).

`npm init -y`로 만든 실제 결과입니다.

```bash
$ npm init -y
Wrote to /private/tmp/.../npm-demo/package.json:

{
  "name": "npm-demo",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

`name`과 `version`은 **레지스트리에 게시할 때만** 필수입니다. 게시하지 않는 애플리케이션이라면 둘 다 선택입니다.

### 의존성 네 종류

| 필드 | 언제 |
| --- | --- |
| `dependencies` | 런타임에 필요한 것. 공식 문서 표현: "Dependencies are specified in a simple object that maps a package name to a version range." |
| `devDependencies` | 테스트·빌드 도구. 공식 문서 표현: "If someone is planning on downloading and using your module in their program, then they probably don't want or need to download and build the external test or documentation framework that you use." |
| `peerDependencies` | 플러그인이 호스트와의 호환을 선언. **npm v7부터 자동 설치됩니다** |
| `optionalDependencies` | 설치가 실패해도 전체 설치를 중단시키지 않음. 대신 **코드가 그 부재를 처리해야 합니다** |

`devDependencies`의 근거가 "프로덕션 번들을 줄이려고"가 아니라 **"이 패키지를 가져다 쓰는 사람이 테스트 프레임워크까지 받을 이유가 없어서"** 라는 점이 원문의 논리입니다. 애플리케이션(게시하지 않는 것)에서는 이 구분이 `npm ci --omit=dev`를 쓸 때만 실효를 갖습니다.

### `type` — `.js` 파일을 무엇으로 읽을 것인가

Node 공식 문서 원문입니다 (출처: `https://nodejs.org/api/packages.html`, 확인 2026-09-05).

> The `"type"` field defines the module format that Node.js uses for all `.js` files that have that `package.json` file as their nearest parent.

> If the nearest parent `package.json` lacks a `"type"` field, or contains `"type": "commonjs"`, `.js` files are treated as CommonJS.

> Regardless of the value of the `"type"` field, `.mjs` files are always treated as ES modules and `.cjs` files are always treated as CommonJS.

**기본값은 CommonJS입니다.** `npm init -y`는 `type`을 넣지 않으므로, 아무 설정 없이 만든 프로젝트에서 `import` 구문을 쓰면 실패합니다. 확장자(`.mjs`/`.cjs`)가 `type`을 이깁니다.

---

## 3. 버전 범위 — `^`와 `~`가 실제로 잠그는 것

공식 문서 기준입니다 (출처: `https://docs.npmjs.com/about-semantic-versioning`, 확인 2026-09-05).

| 코드 변경 | 단계 | 규칙 |
| --- | --- | --- |
| 하위 호환 버그 수정 | Patch | 세 번째 자리 증가 (1.0.1) |
| 하위 호환 신규 기능 | Minor | 두 번째 자리 증가, 세 번째 자리 0으로 (1.1.0) |
| 파괴적 변경 | Major | 첫 번째 자리 증가, 나머지 0으로 (2.0.0) |

범위 표기:

| 허용할 것 | 표기 |
| --- | --- |
| patch만 | `1.0` · `1.0.x` · `~1.0.4` |
| minor + patch | `1` · `1.x` · `^1.0.4` |
| 전부 | `*` · `x` |

`npm install <패키지>`의 기본 저장 위치와 접두사를 실제로 확인한 결과입니다.

```bash
$ npm install dayjs@1.11.13

added 1 package, and audited 2 packages in 371ms

found 0 vulnerabilities

$ cat package.json
{
  ...
  "dependencies": {
    "dayjs": "^1.11.13"
  }
}
```

**정확한 버전을 지정해 설치해도 `^`가 붙습니다.** 즉 `package.json`만으로는 재현이 보장되지 않습니다 — 그 일은 락 파일이 합니다.

플래그는 다음과 같습니다 (공식 문서 원문).

| 플래그 | 동작 |
| --- | --- |
| `-P, --save-prod` | "Package will appear in your `dependencies`. This is the default unless `-D` or `-O` are present." |
| `-D, --save-dev` | "Package will appear in your `devDependencies`." |
| `--save-peer` | "Package will appear in your `peerDependencies`." |
| `-O, --save-optional` | "Package will appear in your `optionalDependencies`." |
| `--no-save` | "Prevents saving to `dependencies`." |
| `-E, --save-exact` | "Saved dependencies will be configured with an exact version rather than using npm's default semver range operator." |

---

## 4. package-lock.json — 재현을 보장하는 쪽

공식 문서 원문입니다 (출처: `https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json`, 확인 2026-09-05).

> `package-lock.json` is automatically generated for any operations where npm modifies either the `node_modules` tree, or `package.json`.

> subsequent installs are able to generate identical trees, regardless of intermediate dependency updates

**반드시 커밋해야 합니다.** 커밋하지 않으면 `^` 범위 안에서 각자 다른 버전이 깔립니다.

`lockfileVersion` 값의 의미:

| 값 | 생성한 npm |
| --- | --- |
| 없음 | npm v5 이전의 shrinkwrap |
| 1 | npm v5, v6 |
| 2 | npm v7, v8 (v1과 하위 호환) |
| 3 | npm v9 이상 (v7과 하위 호환) |

이 환경(npm 10.9.4)에서 생성된 실제 값입니다.

```bash
$ head -6 package-lock.json
{
  "name": "npm-demo",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
```

---

## 5. `npm install` vs `npm ci`

공식 문서가 나열하는 `npm ci`의 차이입니다 (출처: `https://docs.npmjs.com/cli/v11/commands/npm-ci`, 확인 2026-09-05).

> - The project **must** have an existing `package-lock.json` or `npm-shrinkwrap.json`.
> - If dependencies in the package lock do not match those in `package.json`, `npm ci` will exit with an error, instead of updating the package lock.
> - `npm ci` can only install entire projects at a time: individual dependencies cannot be added with this command.
> - If a `node_modules` is already present, it will be automatically removed before `npm ci` begins its install.
> - It will never write to `package.json` or any of the package-locks: installs are essentially frozen.

### "일치하지 않으면"이 정확히 무슨 뜻인가

여기가 오해하기 쉬운 지점입니다. **락에 적힌 버전이 `package.json`의 범위를 만족하기만 하면 불일치가 아닙니다.**

직접 확인한 결과입니다. 락 파일에는 `dayjs 1.11.13`이 들어 있는 상태에서 `package.json`의 범위만 넓혔습니다.

```bash
$ grep dayjs package.json
    "dayjs": "^1.10.0"
$ npm ci

added 1 package, and audited 2 packages in 303ms

found 0 vulnerabilities
$ echo $?
0
```

**통과합니다.** `1.11.13`은 `^1.10.0`을 만족하기 때문입니다.

반면 `package.json`에만 패키지를 추가하고 락을 갱신하지 않으면 실패합니다.

```bash
$ grep -A3 '"dependencies"' package.json
  "dependencies": {
    "dayjs": "^1.11.13",
    "lodash": "^4.17.21"
  }
$ npm ci
npm error code EUSAGE
npm error
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
npm error
npm error Missing: lodash@4.18.1 from lock file
...
$ echo $?
1
```

에러 코드는 **`EUSAGE`**, 메시지는 `Missing: <패키지> from lock file`입니다. CI에서 이 메시지를 보면 원인은 하나입니다 — **누군가 `package.json`만 고치고 락 파일을 커밋하지 않았습니다.**

### 언제 무엇을 쓰는가

| 상황 | 명령 |
| --- | --- |
| 의존성 추가·갱신 (로컬) | `npm install <패키지>` |
| CI·배포·컨테이너 빌드 | `npm ci` |
| 락 파일이 없는 프로젝트 | `npm install` (락을 만든 뒤 커밋) |

---

## 6. scripts와 npx

### `npm run`

`package.json`의 `scripts`는 이름과 명령을 매핑합니다. 실제 실행입니다.

```bash
$ npm run hello

> npm-demo@1.0.0 hello
> node -e "console.log(1+1)"

2
```

`npm run`으로 실행되는 명령은 **`node_modules/.bin`이 PATH 맨 앞에 붙은 환경**에서 돕니다. 그래서 전역 설치 없이 로컬 devDependency의 CLI를 부를 수 있습니다. 같은 스크립트를 직접 실행했을 때와 비교한 실제 출력입니다.

```bash
$ cat showpath.js
console.log(process.env.PATH.split(':').slice(0,2).join('\n'));

$ node showpath.js
/Applications/cmux.app/Contents/Resources/bin
/Users/pgt0409/.nvm/versions/node/v22.21.1/bin

$ npm run showpath

> npm-demo@1.0.0 showpath
> node showpath.js

/private/tmp/.../npm-demo/node_modules/.bin
/private/tmp/.../node_modules/.bin
```

상위 디렉터리의 `node_modules/.bin`까지 함께 붙는다는 점도 보입니다.

### `npx` (= `npm exec`)

공식 문서 표현입니다 (출처: `https://docs.npmjs.com/cli/v11/commands/npx`, 확인 2026-09-05).

> run an arbitrary command from an npm package (either one installed locally, or fetched remotely), in a similar context as running it via `npm run`

로컬에 없으면 **npm 캐시 안의 임시 폴더에 설치한 뒤** 그 경로를 PATH에 붙여 실행하며, 이때 확인 프롬프트가 뜹니다(`--yes`/`--no`로 억제).

로컬 devDependency를 부르는 경우 — 실제 실행입니다.

```bash
$ npm i -D typescript@5.9.2
$ ls node_modules/.bin
tsc
tsserver
$ npx tsc --version
Version 5.9.2
```

설치되지 않은 패키지를 부르는 경우:

```bash
$ npx --yes cowsay@1.6.0 "hello"
 _______
< hello >
 -------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```

**`npx <패키지>`는 프롬프트에 "yes"를 누르면 임의의 코드를 받아 실행합니다.** 스크립트나 CI에서 `--yes`를 붙일 때는 반드시 버전을 고정하십시오(의견) — 위 예시에서 `cowsay@1.6.0`처럼.

---

## 7. 실패 모드

### (a) `engines`는 기본적으로 무시됩니다

공식 문서는 `engines`가 "advisory unless the user sets the `engine-strict` configuration flag"라고 적고 있습니다. 이 말이 실제로 무슨 뜻인지 확인한 결과입니다.

`package.json`에 만족 불가능한 조건을 넣었습니다.

```json
"engines": { "node": ">=99.0.0" }
```

기본 설정에서:

```bash
$ npm install
up to date, audited 3 packages in 293ms

found 0 vulnerabilities
$ echo $?
0
```

**경고 한 줄 없이 통과합니다.** `--engine-strict`를 줬을 때만 막힙니다.

```bash
$ npm install --engine-strict
npm error code EBADENGINE
npm error engine Unsupported engine
npm error engine Not compatible with your version of node/npm: npm-demo@1.0.0
npm error notsup Not compatible with your version of node/npm: npm-demo@1.0.0
npm error notsup Required: {"node":">=99.0.0"}
npm error notsup Actual:   {"npm":"10.9.4","node":"v22.21.1"}
$ echo $?
1
```

**증상:** `engines`에 Node 버전을 적어 두고 "팀원들이 알아서 맞추겠지"라고 생각했는데, 아무도 경고를 못 봅니다. 강제하려면 `.npmrc`에 `engine-strict=true`를 넣어 커밋해야 합니다.

### (b) 범위 밖 버전을 요구하면 `ETARGET`

`EUSAGE`(락 불일치)와 헷갈리기 쉬운 에러입니다. 존재하지 않는 버전을 요구했을 때 나옵니다.

```bash
$ npm ci
npm error code ETARGET
npm error notarget No matching version found for dayjs@^2.0.0.
npm error notarget In most cases you or one of your dependencies are requesting
npm error notarget a package version that doesn't exist.
```

`EUSAGE`는 "락을 갱신하라"이고, `ETARGET`은 "그런 버전은 레지스트리에 없다"입니다. 조치가 다릅니다.

### (c) 전역 설치가 Node 버전에 묶임

```bash
$ npm root -g
/Users/pgt0409/.nvm/versions/node/v22.21.1/lib/node_modules
```

경로에 Node 버전이 들어 있습니다. Node를 바꾸면 전역 CLI가 통째로 사라진 것처럼 보입니다.

---

## 8. 경계 — npm이 안 맞는 곳

- **대형 모노레포** — npm workspaces는 있지만, 설치 속도와 디스크 사용에서 pnpm의 content-addressable store 방식이 유리하다고 알려져 있습니다. **확인 필요** — 이 문서에서 벤치마크를 돌리지 않았습니다. 조건(패키지 수·캐시 상태) 없는 "몇 배 빠르다"는 인용하지 않습니다.
- **엄격한 의존성 격리가 필요할 때** — npm은 기본적으로 호이스팅하므로, `package.json`에 선언하지 않은 패키지도 `require`가 됩니다. 이 상태로 배포하면 다른 환경에서 깨집니다.
- **pnpm/yarn을 쓰기로 했다면 Corepack 상태를 먼저 확인해야 합니다.** Node 25.0.0에서 Corepack 배포가 중단됐습니다 — 공식 릴리스 노트의 SEMVER-MAJOR 항목입니다.

  > **(SEMVER-MAJOR)** **build**: stop distributing Corepack (Antoine du Hamel) [#57617](https://github.com/nodejs/node/pull/57617)

  즉 **Node 25 이상에서는 `corepack` 명령이 기본 제공되지 않습니다.** 필요하면 `npm install -g corepack`으로 따로 설치해야 합니다. 참고로 이 환경(Node v22.21.1)에는 아직 번들돼 있습니다.

  ```bash
  $ corepack -v
  0.34.0
  ```

  **확인 필요:** Node 24 LTS 계열에 Corepack이 여전히 번들되는지는 이 문서에서 확인하지 않았습니다.

---

## 출처

- npm 소개 — `https://docs.npmjs.com/about-npm` (확인 2026-09-05)
- package.json — `https://docs.npmjs.com/cli/v11/configuring-npm/package-json` (확인 2026-09-05)
- package-lock.json — `https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json` (확인 2026-09-05)
- npm install — `https://docs.npmjs.com/cli/v11/commands/npm-install` (확인 2026-09-05)
- npm ci — `https://docs.npmjs.com/cli/v11/commands/npm-ci` (확인 2026-09-05)
- npx — `https://docs.npmjs.com/cli/v11/commands/npx` (확인 2026-09-05)
- semantic versioning — `https://docs.npmjs.com/about-semantic-versioning` (확인 2026-09-05)
- Node.js 패키지 모듈 — `https://nodejs.org/api/packages.html` (확인 2026-09-05)
- Node.js 25.0.0 릴리스 노트 — `https://nodejs.org/en/blog/release/v25.0.0` (확인 2026-09-05)
- 배포 인덱스(번들 npm 버전) — `https://nodejs.org/dist/index.json` (확인 2026-09-05)
- 실행 기록 — macOS 15.7.4 / arm64 / Node v22.21.1 / npm 10.9.4, 2026-09-05 직접 실행

---

*작성일: 2026-09-05*
