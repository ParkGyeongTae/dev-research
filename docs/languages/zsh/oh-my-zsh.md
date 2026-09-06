---
sidebar_position: 2
---

# Oh My Zsh란 무엇인가 — 느린 셸의 범인은 대개 이것이 아닙니다

Oh My Zsh는 "셸을 느리게 만드는 것"으로 자주 지목됩니다. **이 머신에서 재보니 사실이 아니었습니다.**
그리고 정작 사람들이 잘 모르는 쪽 — 설치 스크립트가 **기본 로그인 셸을 바꾸고 `.zshrc`를 덮어쓴다**는 것 — 은 덜 이야기됩니다.
이 문서는 둘 다 실제로 확인합니다.

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | 값 |
| --- | --- |
| OS | macOS (Darwin 24.6.0), arm64 |
| zsh | 5.9 (arm64-apple-darwin24.0) |
| Oh My Zsh | 로컬 클론, 커밋 `4b65740` (2026-08-29) |
| git | 2.39.5 (Apple Git-154) |
| 실행 날짜 | 2026-09-06 |

**Oh My Zsh는 버전 번호를 붙여 배포하지 않습니다.** 설치본은 git 저장소이고, "어느 버전인가"는 곧 **어느 커밋인가**입니다. 그래서 위 표에 커밋 해시를 적었습니다.

---

## 1. 무엇인가 — 셸이 아니라 설정 프레임워크

공식 저장소의 설명입니다.

> an open source, community-driven framework for managing your zsh configuration
>
> — [ohmyzsh/ohmyzsh README](https://github.com/ohmyzsh/ohmyzsh) (확인: 2026-09-06)

**zsh를 대체하는 게 아니라 zsh 설정을 관리합니다.** zsh가 먼저 설치돼 있어야 합니다.

README는 "300+ optional plugins"와 "140+ themes"를 제공한다고 밝힙니다. 이 머신의 클론에서 실제로 센 값입니다.

```console
$ ls ~/.oh-my-zsh/plugins | wc -l
     359
$ ls ~/.oh-my-zsh/themes/*.zsh-theme | wc -l
     143
```

README의 "300+ / 140+"와 어긋나지 않습니다. **다만 플러그인이 359개 들어 있다는 것과 359개가 켜져 있다는 것은 다릅니다** — 켜지는 것은 `.zshrc`의 `plugins=(...)`에 적은 것뿐입니다.

같은 README에 이런 문장도 있습니다.

> Oh My Zsh will not make you a 10x developer...but you may feel like one.

---

## 2. 설치가 실제로 하는 일

공식 설치 명령입니다.

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

**받아서 바로 실행하는 형태**이므로, 무엇을 하는지는 스크립트를 읽어야 알 수 있습니다. 원본을 직접 받아 확인했습니다 (조회: 2026-09-06, 603줄).

```console
$ curl -s https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh -o /tmp/omz-install.sh
$ grep -nE '^[a-z_]+\(\) *\{' /tmp/omz-install.sh
106:command_exists() {
110:user_can_sudo() {
170:supports_hyperlinks() {
222:supports_truecolor() {
238:fmt_link() {
251:fmt_underline() {
256:fmt_code() {
260:fmt_error() {
264:setup_color() {
307:setup_ohmyzsh() {
354:setup_zshrc() {
418:setup_shell() {
518:print_success() {
537:main() {
```

### (a) `.zshrc`를 덮어씁니다

```console
$ grep -n -A3 'pre-oh-my-zsh' /tmp/omz-install.sh
355:  # Keep most recent old .zshrc at .zshrc.pre-oh-my-zsh, and older ones
356-  # with datestamp of installation that moved them aside, so we never actually
357-  # destroy a user's original zshrc
361:  OLD_ZSHRC="$zdot/.zshrc.pre-oh-my-zsh"
364:    if [ "$KEEP_ZSHRC" = yes ]; then
```

기존 `.zshrc`는 **`.zshrc.pre-oh-my-zsh`로 옮겨지고**, 그 자리에 Oh My Zsh 템플릿이 놓입니다. 주석이 밝히듯 원본을 지우지는 않습니다.
기존 설정을 유지하려면 `--keep-zshrc`(또는 `KEEP_ZSHRC=yes`)를 줘야 합니다.

### (b) 기본 로그인 셸을 바꿉니다 — 기본값입니다

```console
$ grep -n 'CHSH' /tmp/omz-install.sh | head -4
28:#   CHSH                   - 'no' means the installer will not change the default shell (default: yes)
34:#   --skip-chsh: has the same behavior as setting CHSH to 'no'
35:#   --unattended: sets both CHSH and RUNZSH to 'no'
100:CHSH=${CHSH:-yes}
$ grep -n 'sudo chsh\|chsh -s' /tmp/omz-install.sh
499:    sudo chsh -s "$zsh" "$USER"
502:    chsh -s "$zsh" "$USER"          # run chsh normally
```

**`CHSH`의 기본값이 `yes`입니다.** 즉 설치 스크립트는 별도 지시가 없으면 `chsh`로 계정의 기본 로그인 셸을 zsh로 바꾸고, 필요하면 `sudo`까지 시도합니다.
이건 셸 설정 파일 수정과는 **성격이 다른 변경**입니다 — 계정 속성이 바뀌므로 그 사용자의 모든 세션에 영향을 줍니다. 막으려면 `--skip-chsh` 또는 `--unattended`를 씁니다.

---

## 3. 자동 업데이트 — 켜져 있고, `git pull`입니다

설치된 소스에서 기본값을 직접 확인했습니다.

```console
$ grep -n -A1 "omz:update' mode" ~/.oh-my-zsh/tools/check_for_upgrade.sh | head -2
14:zstyle -s ':omz:update' mode update_mode || {
15-  update_mode=prompt

$ grep -n 'epoch_target=' ~/.oh-my-zsh/tools/check_for_upgrade.sh
202:    zstyle -s ':omz:update' frequency epoch_target || epoch_target=${UPDATE_ZSH_DAYS:-13}
```

**기본 모드는 `prompt`(물어봄), 기본 주기는 13일**입니다. 공식 위키의 설명과 일치합니다 (출처: [Oh My Zsh Wiki — Settings](https://github.com/ohmyzsh/ohmyzsh/wiki/Settings), 확인: 2026-09-06).

업데이트의 실체는 저장소를 당겨오는 것입니다.

```console
$ grep -n 'git pull' ~/.oh-my-zsh/tools/upgrade.sh
245:if LANG= git pull --quiet --rebase $remote $branch; then
```

`--rebase`가 붙어 있으므로, **`~/.oh-my-zsh` 안의 파일을 직접 고쳐 뒀다면 업데이트가 충돌로 실패할 수 있습니다.** 커스터마이즈는 `ZSH_CUSTOM`(기본값 `$ZSH/custom`) 아래에 두는 것이 이 구조가 의도한 방식입니다.

모드는 `disabled`·`auto`·`reminder`·`prompt` 중에 고를 수 있습니다(같은 위키).

---

## 4. 기동 비용 — 실측하면 통념과 다릅니다

"Oh My Zsh 때문에 터미널이 느리다"는 말을 자주 듣습니다. 이 머신에서 재봤습니다.

**측정 조건**: `/usr/bin/time -p env ZDOTDIR=<디렉터리> /bin/zsh -i -c exit`의 `real` 값. macOS Darwin 24.6.0, zsh 5.9. 각 구성마다 연속 실행했고, **아래 블록은 구성별로 따로 돌린 결과를 모아 놓은 것**입니다. `ZDOTDIR`로 격리했으므로 **이 머신의 실제 `~/.zshrc`는 수정하지 않았습니다.** `zprof` 표는 열 간격만 좁혔고 수치는 출력 그대로입니다.

```console
--- (1) 설정 없는 zsh (빈 ZDOTDIR) ---
  0.010s
  0.000s
  0.000s
--- (2) Oh My Zsh 코어만 (plugins=()) ---
  0.180s      ← 첫 회
  0.050s
  0.050s
--- (3) Oh My Zsh + git 플러그인 + robbyrussell 테마 ---
  0.240s      ← 첫 회
  0.060s
  0.060s
  0.060s
  0.060s
--- (4) 이 머신의 실제 ~/.zshrc ---
  1.120s
  0.850s
  0.880s
```

**(3)과 (4)의 차이가 핵심입니다.** 기본 구성의 Oh My Zsh는 0.06초인데, 실제 셸은 0.85초가 넘습니다. 나머지 0.8초는 어디서 왔을까요.

`zprof`로 프로파일했습니다. 실제 `~/.zshrc`를 **수정하지 않고**, 격리된 `ZDOTDIR`의 `.zshrc`에서 `zmodload zsh/zprof` 후 그것을 `source`하는 방식입니다.

```console
num  calls                time                       self            name
-----------------------------------------------------------------------------
 1)    1    200.58  200.58  28.30%   200.56  200.56  28.30%  __conda_activate
 2)    1    338.42  338.42  47.75%   156.33  156.33  22.06%  nvm_auto
 3)    2    166.06   83.03  23.43%    90.48   45.24  12.77%  nvm
 4)    1     65.26   65.26   9.21%    57.51   57.51   8.11%  nvm_ensure_version_installed
 5)  808     47.43    0.06   6.69%    47.43    0.06   6.69%  compdef
 6)    1     45.59   45.59   6.43%    45.59   45.59   6.43%  compdump
 7)    1    144.77  144.77  20.43%    42.20   42.20   5.95%  compinit
 8)   22     18.41    0.84   2.60%    15.61    0.71   2.20%  _omz_source
```

**Oh My Zsh가 자기 파일을 읽는 데 쓴 시간(`_omz_source`)은 22회 호출에 18.41ms입니다.** 전체의 2.6%입니다.
시간을 먹는 것은 **버전 매니저**입니다 — `nvm_auto` 계열이 총 338ms(47.75%), `__conda_activate`가 200ms(28.3%).

다만 완결성을 위해 덧붙이면, **보완 시스템(`compinit`) 144.77ms는 Oh My Zsh가 부르는 것**입니다.

```console
$ grep -n 'compinit' ~/.oh-my-zsh/oh-my-zsh.sh | head -5
79:autoload -U compaudit compinit zrecompile
89:# before running compinit.
127:  # Reset the flag compinit sets when -i excludes insecure entries
129:  compinit -i -d "$ZSH_COMPDUMP"
134:  compinit -u -d "$ZSH_COMPDUMP"
```

그래서 정직하게 나누면 이렇습니다.

| 항목 | 시간 | Oh My Zsh 책임인가 |
| --- | --- | --- |
| `_omz_source` (프레임워크 로딩) | 18ms | 그렇습니다 |
| `compinit` 계열 (보완 시스템) | 145ms | Oh My Zsh가 호출합니다. 다만 보완 기능을 쓰려면 어차피 필요합니다 |
| `nvm` 계열 | 338ms | 아닙니다 |
| `conda` | 200ms | 아닙니다 |

**결론: 셸이 느리면 Oh My Zsh를 지우기 전에 `zprof`를 먼저 돌립니다.** 이 머신에서는 범인이 버전 매니저였습니다.

첫 실행이 0.18~0.24초, 이후가 0.05~0.06초인 것도 눈여겨볼 만합니다 — `compinit`이 만드는 덤프 파일(`ZSH_COMPDUMP`) 캐시 효과입니다.

> 위 수치는 **이 머신, 이 설정 기준**입니다. 플러그인을 많이 켜면 달라집니다 — 여기서는 `plugins=(git)` 하나였습니다. 플러그인 개수에 따른 증가는 측정하지 않았습니다 — **확인 필요.**

---

## 5. 데이터 엔지니어에게 실제로 걸리는 지점

Oh My Zsh는 **대화형 셸에만 적용됩니다.** 이 사실이 실무에서 두 방향으로 나타납니다.

1. **터미널에서 되던 것이 스크립트·크론·CI에서 안 됩니다.** `.zshrc`는 대화형 셸에서만 읽히므로, 거기서 정의한 별칭·함수·`PATH`가 비대화형 실행에는 없습니다. 원인이 Oh My Zsh 자체는 아니지만, 설정이 `.zshrc`에 몰리는 구조라 증상이 여기로 모입니다.
2. **서버·컨테이너에는 들어갈 이유가 없습니다.** 파이프라인이 실행하는 셸은 비대화형이라 프레임워크가 하는 일 대부분이 무의미하고, 기동 시간과 이미지 크기만 늘어납니다.

플러그인 중 데이터 업무와 관련 있어 보이는 것들(`docker`, `kubectl`, `aws`, `gcloud` 등)은 **대체로 보완(completion)과 별칭을 제공합니다.** 도구 자체의 동작을 바꾸지 않습니다.

> 위 문장은 플러그인 폴더 구성에서 유추한 것이며, **개별 플러그인의 내용을 하나씩 확인하지 않았습니다 — 확인 필요.**

---

## 6. 경계 — Oh My Zsh를 쓰지 않는 게 나은 곳

- **서버·컨테이너 이미지·CI 러너.** 비대화형 실행에는 효용이 없습니다(§5).
- **기동 시간이 정말 문제인 경우.** 다만 지우기 전에 재야 합니다(§4). 프레임워크 자체는 이 머신에서 18ms였습니다.
- **`.zshrc`를 이미 공들여 관리하고 있는 경우.** 설치 기본 동작이 덮어쓰기입니다(§2). `--keep-zshrc`가 필요합니다.
- **설치 과정을 통제해야 하는 환경.** `curl | sh` 형태이고 기본값으로 `chsh`까지 실행합니다. 회사 정책상 문제가 되면 저장소를 직접 클론하고 `.zshrc`를 손으로 쓰는 편이 낫습니다(의견).
- **재현 가능한 환경 구성이 목표인 경우.** 버전 태그 없이 `master`를 `git pull`하는 구조라(§3), "같은 버전"을 고정하려면 커밋 해시를 직접 관리해야 합니다.

---

## 7. 실패 모드

### (a) 설치했더니 `.zshrc` 설정이 사라짐

§2의 소스 확인. 원본은 `.zshrc.pre-oh-my-zsh`에 있습니다 — **지워진 게 아니라 옮겨진 것**입니다. 복구는 그 파일에서 필요한 줄을 가져오는 것으로 끝납니다.

### (b) 로그인 셸이 바뀐 줄 모름

§2의 `CHSH=${CHSH:-yes}`. 설치 후 새 터미널이 다르게 뜨거나, `ssh`로 붙었을 때 셸이 바뀌어 있습니다. `dscl`·`/etc/passwd`로 확인하고 `chsh -s`로 되돌립니다.

### (c) 업데이트가 충돌로 실패

§3의 `git pull --rebase`. `~/.oh-my-zsh` 안의 파일을 직접 고쳤을 때 발생합니다. 커스터마이즈는 `ZSH_CUSTOM` 아래로 옮겨야 구조적으로 해결됩니다.

### (d) 느려진 원인을 잘못 짚음

§4의 프로파일. Oh My Zsh를 지웠는데 여전히 느린 경우가 여기 해당합니다. `zprof`를 먼저 돌립니다.

### (e) 보안 권한 경고

zsh가 보완 디렉터리 권한을 문제 삼아 경고를 냅니다. 위키는 이때 `ZSH_DISABLE_COMPFIX`를 쓰라고 안내하되, **디렉터리 권한이 실제로 안전한데도 경고가 뜨는 경우에 한한다**고 단서를 붙입니다(§3 출처).
경고를 끄는 것과 권한을 고치는 것은 다른 일입니다.

> (b)(c)(e)는 소스와 공식 문서에서 확인한 동작이며, **이 저장소에서 재현하지 않았습니다 — 확인 필요.** (a)(d)는 위 실행 기록으로 확인했습니다.

---

## 출처

- Oh My Zsh 저장소 README(자기 설명·설치 명령·플러그인/테마 수) — [github.com/ohmyzsh/ohmyzsh](https://github.com/ohmyzsh/ohmyzsh) (확인: 2026-09-06)
- 설정 문서(자동 업데이트 모드·주기, `ZSH_CUSTOM`, `ZSH_DISABLE_COMPFIX`) — [Oh My Zsh Wiki — Settings](https://github.com/ohmyzsh/ohmyzsh/wiki/Settings) (확인: 2026-09-06)
- 설치 스크립트 원본 — `https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh` 직접 조회 (2026-09-06, 603줄)
- 설치본 소스(`tools/check_for_upgrade.sh`, `tools/upgrade.sh`, `oh-my-zsh.sh`) — 로컬 클론 커밋 `4b65740` (확인: 2026-09-06)
- 실행 기록 — macOS Darwin 24.6.0 / arm64 / zsh 5.9, 2026-09-06 직접 실행

---

*작성일: 2026-09-06*
