# restart-fluent 开发文档

本文档面向主题安装、配置、二次开发与问题排查。只想快速用起来的读者请先看 [README](./README.md)。

## 目录

- [安装](#安装)
- [插件与功能对照表](#插件与功能对照表)
- [站点配置](#站点配置)
- [主题配置速查](#主题配置速查)
- [页面与模板](#页面与模板)
- [正文标签](#正文标签)
- [目录结构](#目录结构)
- [常见问题](#常见问题)
- [兼容性](#兼容性)
- [开发与发布](#开发与发布)
- [第三方资源与许可](#第三方资源与许可)

## 安装

### 方式一：git clone / submodule

```bash
cd your-hexo-site
git clone https://github.com/yourname/restart-fluent.git themes/restart-fluent
```

或作为子模块：

```bash
git submodule add https://github.com/yourname/restart-fluent.git themes/restart-fluent
```

之后更新主题：

```bash
git submodule update --remote themes/restart-fluent
```

### 方式二：npm

已发布到 npm 时：

```bash
cd your-hexo-site
npm install hexo-theme-restart-fluent --save
```

包尚未发布时可以直接安装本地目录：

```bash
npm install /path/to/restart-fluent --save
```

Hexo 会从 `node_modules/hexo-theme-restart-fluent` 读取主题。

### 启用

在站点 `_config.yml` 中把主题名改成目录名（npm 安装同样写 `restart-fluent`，不是包名）：

```yaml
theme: restart-fluent
```

然后：

```bash
hexo clean
hexo generate
hexo server
```

## 插件与功能对照表

> 「必需」指主题或 Hexo 基础页面离不开；「可选」指未安装时对应功能自动隐藏或不可用，其余页面正常。
> 标为“非 Hexo 插件”的项由浏览器在运行时加载，不需要 `npm install`。

### 基础

| 功能 | 依赖 | 必需 | 说明 |
|---|---|---|---|
| EJS 模板渲染 | `hexo-renderer-ejs` | 是 | 主题全部模板为 `.ejs`，缺少会报 `No renderer found` |
| Markdown 渲染 | `hexo-renderer-marked`（或其它 Markdown 渲染器） | 是 | 文章正文、标题锚点、摘要都依赖它 |
| 首页信息流 | `hexo-generator-index` | 是 | 生成首页文章列表 |
| 归档 `/archives` | `hexo-generator-archive` | 是 | 主题的归档模板依赖归档生成器提供 `page.posts` |
| 分类详情 `/categories/:name` | `hexo-generator-category` | 是 | 生成各分类文章列表 |
| 标签详情 `/tags/:name` | `hexo-generator-tag` | 是 | 生成各标签文章列表 |
| 分类列表 `/categories` | 无 | — | 手写 `source/categories.md`，`layout: categories` |
| 标签列表 `/tags` | 无 | — | 手写 `source/tags.md`，`layout: tags` |
| 文章目录 | Hexo 内置 `toc()` helper | — | 无插件；依赖 Markdown 渲染器给标题生成 `id` |
| 本地预览 | `hexo-server` | 开发用 | `hexo server` |
| 部署 | `hexo-deployer-git` 等 | 按需 | 与主题无关 |

最小安装（bash；PowerShell 去掉行尾反斜杠写成一行）：

```bash
npm install hexo-renderer-ejs hexo-renderer-marked \
  hexo-generator-index hexo-generator-archive \
  hexo-generator-category hexo-generator-tag
```

### 可选功能

| 功能 | 依赖 | 未安装时 | 说明 |
|---|---|---|---|
| 站内搜索 | `hexo-generator-search` | 搜索页提示索引缺失 | 主题读取 `search.path`（默认 `/search.xml`） |
| RSS / Atom | `hexo-generator-feed` | 页脚 RSS 链接仍在，但会 404 | 可把主题 `rss.enable` 设为 `false` 隐藏入口 |
| 字数 / 阅读时长 | `hexo-symbols-count-time` | 自动隐藏 | 模板会检测 `symbolsCount` / `symbolsTime` 是否存在 |
| 站点地图 | `hexo-generator-sitemap` | 无 `sitemap.xml` | 仅 SEO 用，主题不依赖 |
| 评论 | Twikoo（非 Hexo 插件） | 不渲染评论区 | 需要 `comments.env_id` |
| 说说 | Twikoo（非 Hexo 插件） | 说说页显示未启用提示 | 复用 `comments.env_id`，按 `memos.path` 隔离 |
| 代码高亮 | Hexo 内置 PrismJS | 退回纯文本代码 | 站点配置 `syntax_highlighter: prismjs` |
| 数学公式 | KaTeX（非 Hexo 插件，CDN） | 公式原样显示 | `source/js/extras.js` 中加载 |
| Mermaid 流程图 | mermaid（非 Hexo 插件，CDN） | 代码块保持源码 | `source/js/extras.js` 中加载 |
| 分享二维码 | qrcodejs（非 Hexo 插件，CDN） | 二维码区域为空 | `source/js/extras.js` 中加载 |
| GitHub 仓库卡片 | GitHub REST API（非 Hexo 插件） | 只显示仓库名与链接 | 未认证接口限流，前端有 6 小时缓存 |
| 节假日日历 | holiday-cn / timor.tech 接口（非 Hexo 插件） | 只显示内置节假日表 | 可关闭 `calendar.api.enable` |
| 音乐播放器 | 浏览器原生 Audio，无插件 | 不渲染播放器 | 歌单为空且无节日主题曲时自动关闭 |
| Font Awesome / Prism 资源 | 已包含在主题 `source/lib/` | — | 无需 CDN |
| pjax、日历、播放器、搜索等交互 | 已包含在主题 `source/js/` | — | 无需额外插件 |

可选安装：

```bash
npm install hexo-generator-search hexo-generator-feed \
  hexo-symbols-count-time hexo-generator-sitemap
```

### 第三方 CDN

以下资源在浏览器端按需加载，部署到内网或需要严格 CSP 时，请自行改为本地文件：

| 资源 | 默认来源 | 修改位置 |
|---|---|---|
| Twikoo | `registry.npmmirror.com` | 主题配置 `comments.src` |
| KaTeX | `cdn.jsdelivr.net` | `source/js/extras.js` 的 `KATEX_BASE` |
| mermaid | `cdn.jsdelivr.net` | `source/js/extras.js` 的 `MERMAID_SRC` |
| qrcodejs | `cdn.jsdelivr.net` | `source/js/extras.js` 的 `QR_SRC` |
| 节假日数据 | jsDelivr / timor.tech / GitHub Raw | 主题配置 `calendar.api.urls` |
| GitHub 仓库数据 | `api.github.com` | `source/js/extras.js` 中的请求地址 |

## 站点配置

```yaml
# 主题
theme: restart-fluent

# 首页信息流条数由主题 recent_count 控制，建议关闭 Hexo 的分页孤页
index_generator:
  path: ''
  per_page: 0
  order_by: -date

# 归档一页显示全部，主题自己做年 / 月分组
archive_generator:
  per_page: 0
  yearly: true
  monthly: true

# hexo-generator-search
search:
  path: search.xml
  field: post
  content: true
  format: html

# hexo-generator-feed
feed:
  type: atom
  path: atom.xml
  limit: 20

# 字数 / 阅读时长
symbols_count_time:
  symbols: true
  time: true
  total_symbols: true
  total_time: true

# hexo-generator-sitemap（可选）
sitemap:
  path: sitemap.xml
```

主题配置在 `restart-fluent/_config.yml`。**不要直接改这个文件**，在站点根目录新建 `_config.restart-fluent.yml` 覆盖：

```yaml
# _config.restart-fluent.yml
title: 我的博客
author: Your Name
description: 记录与分享

avatar: images/avatar.jpg

links:
  github: https://github.com/yourname

comments:
  enable: true
  env_id: https://your-twikoo.vercel.app
```

也可以写在站点 `_config.yml` 的 `theme_config:` 下，优先级高于 `_config.restart-fluent.yml`：

```yaml
theme_config:
  title: 我的博客
  author: Your Name
  comments:
    env_id: https://your-twikoo.vercel.app
```

至少需要修改：

- `title` / `author` / `description` / `keywords`
- `avatar`（默认图是示例头像）
- `links`（社交外链，默认空）
- `profile.email` / `profile.github`（关于页联系卡）
- `comments.env_id`（不填则评论和说说都不显示）
- `music.songs`（不填则没有播放器）
- `friends` / `links_apply`（友链页）
- 可选：`wallpaper.image`、`home.hero.*`、`calendar.holidays`

完整选项和注释见 [`_config.yml`](./_config.yml)。

## 主题配置速查

| 配置段 | 关键项 | 作用 |
|---|---|---|
| `appearance` | `scheme` / `acrylic` / `compact` / `effects` | 初始明暗、模糊强度、紧凑模式、光效 |
| `wallpaper` | `enable` / `image` / `opacity` / `dim` | 全站壁纸与暗色遮罩 |
| `accent` | `default` / `palette` | 默认主题色与侧栏色板 |
| `menus` / `menu_icons` | 显示文字 → 路径 / Font Awesome 图标 | 侧栏导航 |
| `links` | 平台名 → URL | 社交外链 |
| `rss` | `enable` / `path` / `title` | RSS 入口；`path` 留空跟随站点 `feed.path` |
| `footer` | `since` / `icp` / `powered_by` | 页脚版权、备案号、Hexo 标识 |
| `music` | `enable` / `songs` / `volume` / `autoplay` / `keep_playing` | 常驻播放器与歌单 |
| `comments` | `enable` / `env_id` / `version` / `src` / `lang` | Twikoo 评论 |
| `home` | `feature` / `view` / `hero.*` | 首页幻灯片与初始视图 |
| `calendar` | `enable` / `widget` / `prompt` / `holidays` / `api` | 月历、节假日提示与接口兜底 |
| `toc` | `enable` | 文章目录 |
| `share` | `enable` | 分享海报与按钮 |
| `search` | `path` / `placeholder` | 搜索索引地址与输入框提示 |
| `about` | `intro` / `facts` | 关于页简介与资料卡 |
| `profile` | `avatar` / `motto` / `email` / `github` / `weibo` / `wechat_qr` | 关于页与首页作者卡 |
| `links_apply` / `friends` | 申请地址 / 友链数组 | 友链页 |
| `memos` | `enable` / `home` / `path` / `recent_count` / `owner_nick` | 说说页与首页最近说说 |

## 页面与模板

在站点 `source/` 下创建以下文件，`layout` 必须与主题模板同名：

| 文件 | `layout` | 对应模板 | 用途 |
|---|---|---|---|
| `source/search.md` | `search` | `search.ejs` | 站内搜索 |
| `source/about/index.md` | `about` | `about.ejs` | 关于页 |
| `source/links.md` | `links` | `links.ejs` | 友链页 |
| `source/categories.md` | `categories` | `categories.ejs` | 分类列表 |
| `source/tags.md` | `tags` | `tags.ejs` | 标签列表 |
| `source/shuoshuo/index.md` | `shuoshuo` | `shuoshuo.ejs` | 说说页 |
| `source/404.md` | `404` | `404.ejs` | 404 页面 |

示例：

```markdown
---
title: 搜索
layout: search
---
输入关键词，匹配标题、正文和标签。
```

```markdown
---
title: 说说
layout: shuoshuo
comments: false
---
```

> 说说页的 `comments: false` 用来避免 Twikoo 在页面底部再挂一份文章评论；说说本身仍使用 `comments.env_id`。
>
> 404 页面会生成 `404.html`，需要托管平台启用自定义 404（GitHub Pages、Cloudflare Pages 默认支持）。

以下路由由生成器自动产生，不需要手写页面：

| 路由 | 模板 | 依赖 |
|---|---|---|
| `/` | `index.ejs` | `hexo-generator-index` |
| `/archives/`、`/archives/:year/`、`/archives/:year/:month/` | `archive.ejs` | `hexo-generator-archive` |
| `/categories/:name/` | `category.ejs` | `hexo-generator-category` |
| `/tags/:name/` | `tag.ejs` | `hexo-generator-tag` |
| 普通独立页面 | `page.ejs` | Hexo 内置页面渲染 |

## 正文标签

```twig
{% heimu 被黑幕遮住的文字 %}

{% ghcard owner/repo %}

{% music /music/song.mp3 | 曲名 | 作者 %}
{% music 1 %}

{% countdown 2026-06-07 09:00 "标题" "高考" day %}
{% countdown 2026-06-07 09:00 "标题" "高考" time %}
```

| 标签 | 说明 |
|---|---|
| `heimu` | 黑幕文字，点击或悬停揭开；颜色跟随明暗主题 |
| `ghcard` | GitHub 仓库卡片，只接受 `owner/repo` 形式，星标与描述由前端获取 |
| `music` | 正文音乐卡片，播放交给常驻播放器；地址可不在歌单里，首次播放自动补入 |
| `countdown` | 正 / 倒计时卡片；`day` 为一句天数，`time` 为翻牌时钟；日期过去后自动改为「已经过去 N 天」 |

补充：

- `music` 用 `|` 分隔地址、曲名、作者，字段内部可以带空格，但不能带 `|`。
- `music 1` 表示 `music.songs` 里的第 1 首；纯数字不会当 URL。
- `countdown` 的日期支持 `2026-06-07` 或 `2026-06-07 09:00` / `2026-06-07T09:00`。
- 所有日期计算都在浏览器里进行，静态构建日与访问日不同也不会算错。

## 目录结构

```text
restart-fluent/
├── _config.yml          # 主题默认配置
├── layout/              # EJS 模板
│   ├── _partial/        # 侧栏、页脚、播放器、评论、日历等
│   ├── layout.ejs       # 全站外壳、<head>、SEO
│   ├── index.ejs        # 首页
│   ├── post.ejs         # 文章页
│   ├── page.ejs         # 普通页面
│   ├── archive.ejs      # 归档
│   ├── category.ejs / tag.ejs
│   ├── categories.ejs / tags.ejs
│   ├── about.ejs / links.ejs / search.ejs / shuoshuo.ejs / 404.ejs
├── scripts/             # Hexo 扩展：辅助函数、数学公式保护、自定义标签
├── source/
│   ├── css/             # 设计令牌与分页面样式
│   ├── js/              # 主题交互
│   ├── images/          # 默认头像、壁纸、favicon（请替换）
│   └── lib/             # Font Awesome 4.7、PrismJS
├── docs/images/         # README 截图
├── package.json
├── README.md
├── DEVELOPMENT.md
└── LICENSE
```

## 常见问题

### 评论或说说没有显示

按顺序检查：

1. `comments.enable` 是否为 `true`
2. `comments.env_id` 是否填写 Twikoo 云函数地址
3. 说说页 front-matter 是否设置了 `layout: shuoshuo`
4. 文章页 / 关于页是否被其他配置关闭了评论

Twikoo 的「发送」按钮默认要求昵称与合法邮箱，填过之后浏览器会记住。

### 搜索页提示索引缺失

安装 `hexo-generator-search`，并确认站点配置与主题配置的路径一致：

```yaml
# 站点 _config.yml
search:
  path: search.xml
  content: true
```

```yaml
# 主题配置
search:
  path: /search.xml
```

### 页脚 RSS 链接 404

安装 `hexo-generator-feed`，或在主题配置里关闭入口：

```yaml
rss:
  enable: false
```

### 播放器没有出现

播放器需要至少一首歌：

- `music.enable: true`
- `music.songs` 非空，或 `calendar.holiday_songs` 非空
- `music.keep_playing: false` 时会退回普通整页跳转，不加载 pjax

### 公式、Mermaid 或二维码不显示

这三项默认从 jsDelivr 加载，网络无法访问 CDN 时不会渲染。请把 `source/js/extras.js` 里的 `KATEX_BASE`、`MERMAID_SRC`、`QR_SRC` 改成可访问地址或本地静态文件。

### 修改样式或脚本后没有生效

- 改了 `scripts/` 或 `_config.yml`：重启 `hexo server`
- 改了 CSS / JS：先 `hexo clean`，再强制刷新浏览器
- 站点开了缓存或 CDN：清理对应缓存

### npm 安装后提示找不到主题

- 包名必须是 `hexo-theme-<主题名>`
- 站点里写 `theme: restart-fluent`，不要写完整包名
- 确认 `node_modules/hexo-theme-restart-fluent` 存在

## 兼容性

- 需要 Hexo 7+、Node.js 18+；已在 Hexo 7.3.0 上构建验证。
- 模板是 EJS，`hexo-renderer-ejs` 必须安装。
- 浏览器需支持 `fetch`、`DOMParser`、CSS `backdrop-filter`、`localStorage`。旧浏览器会退化显示，不影响正文阅读。
- 主题界面文案为中文，暂未接入 Hexo i18n。
- 文章内公式依赖 `scripts/math.js` 在 Markdown 渲染前保护 `$...$` / `$$...$$`；如果同时使用其它会改写公式的渲染器插件，请先确认兼容性。
- 代码高亮模式跟随站点 `syntax_highlighter`。使用 `prismjs` 时，主题会加载自带的 Prism 资源；`prismjs.preprocess: false` 时改为浏览器端高亮。
- pjax 只替换 `#content`。自定义脚本若需要随换页重跑，请放在 `#content` 内，或监听 `restart:page` 事件。
- `source/images/head.jpg`、`wallpaper.jpg`、`favicon.ico` 是示例资源，分发前请按需替换。

## 开发与发布

在本地 Hexo 站点中把主题放到 `themes/restart-fluent`，修改后执行：

```bash
hexo clean
hexo generate
hexo server
```

发布到 npm 前先检查包内容：

```bash
npm pack --dry-run
npm pack
npm publish
```

包名必须是 `hexo-theme-<主题名>`，Hexo 才能从 `node_modules` 找到它；站点里仍然写 `theme: <主题名>`。

如果同时维护站点内的 `themes/restart-fluent` 副本，发布前记得把改动同步到本目录。

## 第三方资源与许可

- Font Awesome 4.7：字体 SIL OFL 1.1，CSS MIT
- PrismJS：MIT
- `source/images/` 下的头像、壁纸、favicon 仅为示例素材，**不包含在主题的 MIT 授权内**，请替换为自己的图片后再分发
- README 截图来自实际站点，仅用于展示主题效果

主题本身采用 [MIT](./LICENSE) 授权。
