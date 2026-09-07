---
sidebar_position: 8
---

# Oh My Zsh란 무엇인가 — 설정을 관리하는 프레임워크, 그리고 그 대가

> **원문** — [ohmyzsh/ohmyzsh README](https://github.com/ohmyzsh/ohmyzsh) · [ohmyz.sh](https://ohmyz.sh/) · [Oh My Zsh Wiki — Settings](https://github.com/ohmyzsh/ohmyzsh/wiki/Settings) · 설치 스크립트 [`tools/install.sh`](https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)
>
> **확인 날짜** — 2026-09-07. **Oh My Zsh에는 판번호가 없습니다** — 태그를 붙여 배포하지 않으므로 "어느 판인가"는 곧 어느 커밋인가이고, 원문(README·사이트·위키)에도 판번호가 없어 확인 날짜로 대신합니다.
>
> **검증 상태** — README·사이트 첫 화면·Settings 위키의 해당 절을 읽고, 설치 스크립트 604줄과 로컬 클론의 `check_for_upgrade.sh`·`upgrade.sh`·`oh-my-zsh.sh`를 직접 열어 확인했습니다. 기동 비용은 **격리된 `ZDOTDIR`에서 이번에 다시 측정**했습니다. **이전 판이 플러그인·테마 개수의 출처를 README로 잘못 적었던 것을 이번에 바로잡았습니다**(§1).

Oh My Zsh를 이해하는 데 필요한 것은 두 가지입니다. **무엇을 관리해 주는가**, 그리고 **그 대가로 무엇을 가져가는가**입니다.

두 번째가 덜 이야기됩니다. 흔히 지목되는 대가는 "셸이 느려진다"인데 **이 머신에서 재보니 사실이 아니었고**(§4), 정작 실제 대가 — 설치 스크립트가 **기본 로그인 셸을 바꾸고 `.zshrc`를 덮어쓴다**는 것(§2) — 은 잘 알려져 있지 않습니다.

## 실행 환경

아래 실행 기록은 모두 이 환경에서 **직접 돌린 결과**입니다.

| 항목 | 값 |
| --- | --- |
| OS | macOS 15.7.4 (Darwin 24.6.0), arm64 |
| zsh | 5.9 (arm64-apple-darwin24.0) |
| Oh My Zsh | 로컬 클론, 커밋 `4b65740` (2026-08-29) |
| 설치 스크립트 | 원격 `tools/install.sh` 604줄 (조회: 2026-09-07) |
| 실행 날짜 | 2026-09-07 |

**Oh My Zsh는 버전 번호를 붙여 배포하지 않습니다.** 설치본은 git 저장소이고, "어느 버전인가"는 곧 **어느 커밋인가**입니다.

```console
$ git -C ~/.oh-my-zsh log -1 --format='%h %ad' --date=short
4b65740 2026-08-29
```

그래서 위 표에 커밋 해시를 적었습니다. 이 성질은 §3에서 다시 걸립니다.

---

## 1. 무엇인가 — 셸이 아니라 설정 프레임워크

공식 저장소의 설명입니다.

> Oh My Zsh is an open source, community-driven framework for managing your zsh configuration.
>
> **번역** — Oh My Zsh는 zsh 설정을 관리하기 위한, 오픈 소스이며 커뮤니티가 주도하는 프레임워크입니다.
>
> — [ohmyzsh/ohmyzsh README](https://github.com/ohmyzsh/ohmyzsh) (확인: 2026-09-07). 원문 마크다운에서는 `zsh`가 링크로 걸려 있고 줄이 나뉘어 있습니다 — 렌더링된 문장을 옮겼습니다.

핵심 단어는 **"managing your zsh configuration"** 입니다. zsh를 대체하는 게 아니라 zsh 설정을 관리합니다 — zsh가 먼저 설치돼 있어야 하고, 하는 일은 `.zshrc`가 할 일을 대신 조립해 주는 것입니다.

같은 README에 이런 문장도 있습니다.

> **Oh My Zsh will not make you a 10x developer...but you may feel like one.**
>
> **번역** — Oh My Zsh가 당신을 10배 생산성의 개발자로 만들어 주지는 않습니다... 다만 그런 기분은 들 수 있습니다.
>
> — [ohmyzsh/ohmyzsh README](https://github.com/ohmyzsh/ohmyzsh) (확인: 2026-09-07)

### 몇 개가 들어 있는가 — 숫자는 README가 아니라 사이트에 있습니다

**이 문서의 이전 판은 "README가 300+ optional plugins와 140+ themes를 제공한다고 밝힌다"고 적었습니다. 그 문장은 틀렸습니다.** 오늘 README를 받아 보면 개수를 말하는 자리에 숫자가 없습니다.

```console
$ curl -s https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/README.md | grep -n 'plugins and beautiful themes'
11:in your command prompt, you'll take advantage of the hundreds of powerful plugins and beautiful themes.
```

> you'll take advantage of the hundreds of powerful plugins and beautiful themes
>
> **번역** — 수백 개의 강력한 플러그인과 아름다운 테마를 활용하게 됩니다.
>
> — [ohmyzsh/ohmyzsh README](https://github.com/ohmyzsh/ohmyzsh) (확인: 2026-09-07)

숫자를 말하는 것은 **프로젝트 사이트**입니다.

> Browse 300+ plugins
>
> We currently ship with 150 themes bundled.
>
> **번역** — 300개가 넘는 플러그인을 둘러보세요.
>
> 현재 150개의 테마를 함께 배포하고 있습니다.
>
> — [ohmyz.sh](https://ohmyz.sh/) (확인: 2026-09-07)

이 머신의 클론에서 실제로 센 값입니다.

```console
$ ls ~/.oh-my-zsh/plugins | wc -l
     359
$ ls ~/.oh-my-zsh/themes/*.zsh-theme | wc -l
     143
```

**플러그인은 사이트가 말하는 "300+"를 넘고(359), 테마는 사이트가 말하는 150에 못 미칩니다(143).** 커밋 `4b65740` 기준입니다. 사이트 수치가 언제 갱신된 것인지 알 수 없으므로 이 차이가 감소인지 반올림인지는 **확정하지 않습니다**(맨 아래 절).

**그리고 359개가 들어 있다는 것과 359개가 켜져 있다는 것은 다릅니다** — 켜지는 것은 `.zshrc`의 `plugins=(...)`에 적은 것뿐입니다. 이 구분이 §4의 측정을 읽을 때 중요합니다.

---

## 2. 설치가 실제로 하는 일

공식 설치 명령입니다.

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

**받아서 바로 실행하는 형태**이므로, 무엇을 하는지는 스크립트를 읽어야 알 수 있습니다. 원본을 직접 받아 확인했습니다 (조회: 2026-09-07, 604줄).

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
538:main() {
```

이름만 봐도 세 가지를 한다는 게 드러납니다 — 저장소를 받고(`setup_ohmyzsh`), `.zshrc`를 만들고(`setup_zshrc`), **셸을 바꿉니다**(`setup_shell`). 뒤의 둘을 하나씩 봅니다.

**이 줄 번호는 `master`의 오늘 상태입니다.** 태그가 없으므로(§3) 내일 받으면 달라질 수 있습니다 — 실제로 이전 판을 쓸 때는 603줄이었고 `main()`이 537행이었습니다.

### (a) `.zshrc`를 덮어씁니다

```console
$ grep -n -A3 'pre-oh-my-zsh' /tmp/omz-install.sh | head -8
355:  # Keep most recent old .zshrc at .zshrc.pre-oh-my-zsh, and older ones
356-  # with datestamp of installation that moved them aside, so we never actually
357-  # destroy a user's original zshrc
358-  echo "${FMT_BLUE}Looking for an existing zsh config...${FMT_RESET}"
--
361:  OLD_ZSHRC="$zdot/.zshrc.pre-oh-my-zsh"
362-  if [ -f "$zdot/.zshrc" ] || [ -h "$zdot/.zshrc" ]; then
363-    # Skip this if the user doesn't want to replace an existing .zshrc
```

기존 `.zshrc`는 **`.zshrc.pre-oh-my-zsh`로 옮겨지고**, 그 자리에 Oh My Zsh 템플릿이 놓입니다. 주석이 밝히듯 원본을 지우지는 않습니다.

그래서 "설치했더니 내 설정이 사라졌다"는 상황은 **지워진 게 아니라 옮겨진 것**이고, 복구는 그 파일에서 필요한 줄을 가져오는 것으로 끝납니다. 애초에 덮어쓰지 않게 하려면 `--keep-zshrc`(또는 `KEEP_ZSHRC=yes`)를 줍니다.

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

이건 (a)와 **성격이 다른 변경**입니다. `.zshrc`는 파일 하나지만 로그인 셸은 **계정 속성**이고, 그 사용자의 모든 세션에 영향을 줍니다. 설치 후 새 터미널이 다르게 뜨거나 `ssh`로 붙었을 때 셸이 바뀌어 있다면 원인이 이것입니다 — `dscl`이나 `/etc/passwd`로 확인하고 `chsh -s`로 되돌립니다. 애초에 막으려면 `--skip-chsh` 또는 `--unattended`를 씁니다.

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

**기본 모드는 `prompt`(물어봄), 기본 주기는 13일**입니다. 공식 위키의 설명과 일치합니다 — [Oh My Zsh Wiki — Settings](https://github.com/ohmyzsh/ohmyzsh/wiki/Settings) (확인: 2026-09-07). 모드는 `disabled`·`auto`·`reminder`·`prompt` 중에 고를 수 있습니다(같은 위키).

업데이트의 실체는 저장소를 당겨오는 것입니다.

```console
$ grep -n 'git pull' ~/.oh-my-zsh/tools/upgrade.sh
245:if LANG= git pull --quiet --rebase $remote $branch; then
```

`--rebase`가 붙어 있다는 데서 두 가지가 따라 나옵니다.

첫째, **`~/.oh-my-zsh` 안의 파일을 직접 고쳐 뒀다면 업데이트가 충돌로 실패할 수 있습니다.** 커스터마이즈를 `ZSH_CUSTOM`(기본값 `$ZSH/custom`) 아래에 두라는 것이 이 구조가 의도한 방식이고, 그렇게 해야 구조적으로 해결됩니다.

둘째, **버전 고정이 어렵습니다.** 실행 환경 표에서 커밋 해시를 적은 이유가 이것입니다 — 버전 태그 없이 `master`를 당겨오는 구조라, "같은 버전"을 재현하려면 커밋 해시를 직접 관리해야 합니다. §2에서 설치 스크립트의 줄 번호가 하루 사이에 밀린 것이 같은 성질의 결과입니다. 환경 구성의 재현성이 중요한 자리에서는 이 점이 걸립니다.

---

## 4. 기동 비용 — 실측하면 통념과 다릅니다

"Oh My Zsh 때문에 터미널이 느리다"는 말을 자주 듣습니다. 이 머신에서 재봤습니다.

**측정 조건**: `/usr/bin/time -p env ZDOTDIR=<디렉터리> /bin/zsh -i -c exit`의 `real` 값. macOS 15.7.4 / Apple M4 Pro 14코어 / 24 GiB, zsh 5.9. 각 구성마다 연속 3회. `ZDOTDIR`로 격리했으므로 **이 머신의 실제 `~/.zshrc`는 수정하지 않았습니다.** 측정 날짜 2026-09-07.

```console
--- (1) 설정 없는 zsh (빈 ZDOTDIR) ---
  0.010s
  0.000s
  0.000s
--- (2) Oh My Zsh 코어만 (plugins=()) ---
  0.230s      ← 첫 회
  0.050s
  0.050s
--- (3) Oh My Zsh + git 플러그인 + robbyrussell 테마 ---
  0.200s      ← 첫 회
  0.060s
  0.060s
--- (4) 이 머신의 실제 ~/.zshrc ---
  1.050s
  0.850s
  0.830s
```

**(3)과 (4)의 차이가 핵심입니다.** 기본 구성의 Oh My Zsh는 0.06초인데, 실제 셸은 0.83초가 넘습니다. 나머지 0.77초는 어디서 왔을까요.

`zprof`로 프로파일했습니다. 실제 `~/.zshrc`를 **수정하지 않고**, 격리된 `ZDOTDIR`의 `.zshrc`에서 `zmodload zsh/zprof` 후 그것을 `source`하는 방식입니다.

```console
num  calls                time                       self            name
-----------------------------------------------------------------------------------
 1)    1         204.22   204.22   27.11%    204.21   204.21   27.11%  __conda_activate
 2)    1         378.80   378.80   50.29%    148.50   148.50   19.72%  nvm_auto
 3)    2         214.49   107.24   28.48%     98.30    49.15   13.05%  nvm
 4)    1         100.05   100.05   13.28%     89.29    89.29   11.86%  nvm_ensure_version_installed
 5)  808          47.42     0.06    6.30%     47.42     0.06    6.30%  compdef
 6)    1          47.29    47.29    6.28%     47.29    47.29    6.28%  compdump
 7)    1         144.76   144.76   19.22%     41.60    41.60    5.52%  compinit
 8)    1          16.07    16.07    2.13%     16.00    16.00    2.12%  nvm_die_on_prefix
 9)   22          18.27     0.83    2.43%     15.54     0.71    2.06%  _omz_source
10)    1          10.76    10.76    1.43%     10.76    10.76    1.43%  nvm_is_version_installed
```

**Oh My Zsh가 자기 파일을 읽는 데 쓴 시간(`_omz_source`)은 22회 호출에 18.27ms입니다.** 전체의 2.4%입니다.
시간을 먹는 것은 **버전 매니저**입니다 — `nvm_auto` 계열이 378ms(50.29%), `__conda_activate`가 204ms(27.11%).

다만 완결성을 위해 덧붙이면, **보완 시스템(`compinit`) 144.76ms는 Oh My Zsh가 부르는 것**입니다.

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
| `nvm` 계열 | 379ms | 아닙니다 |
| `conda` | 204ms | 아닙니다 |

**결론: 셸이 느리면 Oh My Zsh를 지우기 전에 `zprof`를 먼저 돌립니다.** 이 머신에서는 범인이 버전 매니저였고, 프레임워크를 지웠어도 0.77초는 그대로 남았을 것입니다.

첫 실행이 0.20~0.23초, 이후가 0.05~0.06초인 것도 눈여겨볼 만합니다 — `compinit`이 만드는 덤프 파일(`ZSH_COMPDUMP`) 캐시 효과입니다.

`compinit`이 부수적으로 만드는 것이 하나 더 있습니다. zsh가 보완 디렉터리 권한을 문제 삼아 **보안 경고**를 내는 경우인데, 위키는 이때 `ZSH_DISABLE_COMPFIX`를 쓰라고 안내하되 **디렉터리 권한이 실제로 안전한데도 경고가 뜨는 경우에 한한다**고 단서를 붙입니다(위 Settings 위키, 확인: 2026-09-07). **경고를 끄는 것과 권한을 고치는 것은 다른 일입니다.**

---

## 5. 데이터 엔지니어에게 실제로 걸리는 지점

여기까지의 내용은 하나로 모입니다. **Oh My Zsh는 `.zshrc`를 관리하는 도구이고, `.zshrc`는 대화형 셸에서만 읽힙니다.** 그래서 프레임워크가 주는 것도, 만드는 문제도 전부 대화형 안에 갇혀 있습니다.

이 사실이 실무에서 두 방향으로 나타납니다.

1. **터미널에서 되던 것이 스크립트·크론·CI에서 안 됩니다.** `.zshrc`에서 정의한 별칭·함수·`PATH`가 비대화형 실행에는 없습니다. 원인이 Oh My Zsh 자체는 아니지만, **설정이 `.zshrc`에 몰리는 구조라 증상이 여기로 모입니다.**
2. **서버·컨테이너·CI 러너에는 들어갈 이유가 없습니다.** 파이프라인이 실행하는 셸은 비대화형이라 프레임워크가 하는 일 대부분이 무의미하고, 기동 시간과 이미지 크기만 늘어납니다.

플러그인 중 데이터 업무와 관련 있어 보이는 것들(`docker`, `kubectl`, `aws`, `gcloud` 등)도 같은 층에 있습니다 — **대체로 보완(completion)과 별칭을 제공하고, 도구 자체의 동작을 바꾸지 않습니다.**

### 그래서 쓸지 말지

로컬 대화형 환경이라면 §4의 실측대로 프레임워크 자체의 비용은 작습니다. 쓰지 않는 쪽으로 기우는 것은 이런 경우입니다(의견).

- **`.zshrc`를 이미 공들여 관리하고 있을 때** — 설치 기본 동작이 덮어쓰기입니다(§2a).
- **설치 과정을 통제해야 하는 환경** — `curl | sh` 형태이고 기본값으로 `chsh`까지 실행합니다(§2b). 회사 정책상 문제가 되면 저장소를 직접 클론하고 `.zshrc`를 손으로 쓰는 편이 낫습니다.
- **환경 구성의 재현성이 목표일 때** — 버전 태그가 없습니다(§3).

---

## 확인하지 못한 것

- **사이트의 "150 themes"와 로컬 클론의 143개가 어긋나는 이유.** §1. 사이트 수치가 언제 갱신된 것인지, 테마가 실제로 줄어든 것인지, 세는 기준이 다른 것인지(`.zsh-theme` 파일만 셌습니다) 확인하지 못했습니다. **확인 필요.**
- **설치 스크립트를 실제로 돌려 보지 않았습니다.** §2의 `.zshrc` 덮어쓰기와 `chsh` 동작은 **소스를 읽은 것**이고, 이 저장소에서 설치하고 되돌려 보지는 않았습니다. 되돌리는 절차도 마찬가지입니다. **미실행.**
- **업데이트 충돌.** §3에서 `--rebase`로부터 따라 나온다고 쓴 것은 소스를 읽은 추론이며, 실제로 파일을 고쳐 두고 업데이트를 돌려 충돌을 재현하지 않았습니다. **미실행.**
- **플러그인 개수에 따른 기동 시간 증가.** §4의 측정은 `plugins=(git)` 하나였습니다. 여러 개를 켰을 때 어떻게 늘어나는지는 재지 않았습니다. **미실행.**
- **`compinit` 보안 경고.** §4에서 언급만 했고 재현하지 않았습니다. **확인 필요.**
- **개별 플러그인의 내용.** §5의 "대체로 보완과 별칭을 제공한다"는 플러그인 폴더 구성에서 유추한 것이며, 하나씩 열어 확인하지 않았습니다. **확인 필요.**
- **다른 OS에서의 동작.** 이 문서의 모든 실행 기록은 macOS 15.7.4에서 나왔습니다. 리눅스에서 설치 스크립트가 `chsh`를 어떻게 다루는지는 확인하지 않았습니다.

---

*작성일: 2026-09-07*
