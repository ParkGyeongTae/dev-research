import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

// sitemap의 ignorePatterns가 baseUrl이 붙은 라우트 경로와 대조되므로,
// 두 곳이 어긋나지 않게 한 곳에서 정의한다.
const baseUrl = '/dev-research/';

const config: Config = {
  title: '개발 리서치 노트',
  tagline: '데이터 엔지니어링·개발 전반 학습 리서치 정리',
  favicon: 'img/favicon.svg',

  url: 'https://parkgyeongtae.github.io',
  baseUrl,
  organizationName: 'ParkGyeongTae',
  projectName: 'dev-research',
  trailingSlash: false,

  // 깨진 링크는 경고가 아니라 빌드 실패로 다룬다 — MkDocs에서는 경고만 뜨고 배포가 통과했다.
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',
  onDuplicateRoutes: 'throw',

  i18n: {
    defaultLocale: 'ko',
    locales: ['ko'],
  },

  markdown: {
    // .md는 CommonMark, .mdx만 MDX로 파싱한다.
    // 템플릿의 <기술명> 같은 꺾쇠 자리표시자를 MDX가 JSX 태그로 오해하는 것을 막는다.
    format: 'detect',
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/ParkGyeongTae/dev-research/edit/main/',
          showLastUpdateTime: true,
        },
        blog: false,
        sitemap: {
          // 로컬 검색 결과 페이지는 색인될 내용이 없다. 넣어두면 서치 콘솔에
          // "크롤링됨 - 현재 색인이 생성되지 않음"으로만 쌓인다.
          // 패턴은 baseUrl이 붙은 실제 라우트 경로와 대조된다(/dev-research/search).
          ignorePatterns: [`${baseUrl}search`],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['ko', 'en'],
        indexBlog: false,
        docsRouteBasePath: '/',
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: '개발 리서치 노트',
      items: [
        // 대분류가 늘어나도 navbar가 넘치지 않도록 드롭다운 하나로 묶는다.
        // 순서는 각 폴더 `_category_.json`의 position과 맞춘다.
        {
          type: 'dropdown',
          label: '분류',
          position: 'left',
          items: [
            { to: '/languages/', label: '언어' },
            { to: '/backend/', label: '백엔드' },
            { to: '/frontend/', label: '프론트엔드' },
            { to: '/data-engineering/', label: '데이터 엔지니어링' },
            { to: '/data-analytics/', label: '데이터 분석' },
            { to: '/infrastructure/', label: '인프라' },
            { to: '/database/', label: '데이터베이스' },
            { to: '/llm/', label: 'LLM' },
          ],
        },
        {
          href: 'https://github.com/ParkGyeongTae/dev-research',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `개발 리서치 노트 · <a href="https://github.com/ParkGyeongTae/dev-research">GitHub</a>`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'sql', 'python', 'java', 'scala', 'docker'],
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
