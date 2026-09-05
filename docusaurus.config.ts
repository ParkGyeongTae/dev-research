import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: '개발 리서치 노트',
  tagline: '데이터 엔지니어링·개발 전반 학습 리서치 정리',
  favicon: 'img/favicon.svg',

  url: 'https://parkgyeongtae.github.io',
  baseUrl: '/dev-research/',
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
        { to: '/topics/', label: '기술 리서치', position: 'left' },
        { to: '/notes/', label: '단편 노트', position: 'left' },
        { to: '/concepts/', label: '개념 정리', position: 'left' },
        { to: '/authoring/authoring-guide', label: '작성 규칙', position: 'left' },
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
