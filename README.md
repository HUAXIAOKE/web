# Huaxiaoke 华小科官网

## 快速开始

```bash
# 1) 安装前端依赖
npm install

# 2) 启动开发
npm run dev

# 3) 启动后端
cd backend
go mod tidy
air
```

## 项目结构

```
src/
├── layouts/           Astro 布局组件 (Layout.astro, SubLayout.astro)
├── pages/             路由页面 (首页/足迹/画廊/活动/关于) + API 路由
│   └── activity/      活动报名(signup) + 详情页([slug])
├── components/        Astro UI 组件 (HomePage, Navigation, MusicPlayer 等)
├── scripts/           前端交互脚本 (导航/时间轴/音乐/主题/内容加载)
└── styles/            页面样式 (index/activity/calender/gallery/about 等)

backend/
├── main.go            入口 + 路由注册
├── config/            配置常量 (端口/数据库路径)
├── handler/           HTTP 处理器 (activity/timeline/gallery/about/music/auth/bilibili/upload)
├── middleware/         CORS 中间件
├── model/             数据结构定义
├── store/             数据库初始化 + Schema 迁移 + 种子数据
├── admin/             内嵌后台管理 SPA (单文件 HTML + CSS)
└── go.mod / go.sum

script/
├── build.mjs          一键部署 (构建 → 打包 → SCP 上传 → Docker 部署)
├── optimize-assets.mjs 资源优化 (图片转 WebP / 字体子集化)
└── download-vendor.mjs 下载 FontAwesome CDN 资源

public/                静态资源 (img/audio/models/ 等, 被 .gitignore 忽略)
```

## 后端 API

Go 后端提供 RESTful API (端口 1037)，SQLite 数据库，30+ 路由，支持：
- 活动/时间轴/画廊/关于/音乐 CRUD
- B站集成 (最新动态抓取/封面代理/DASH 音频流/二维码 OAuth 登录)
- 文件上传 (自动转 WebP)
- 认证系统 (HMAC-SHA256 Bearer Token)
- Schema 迁移系统 (v1→v6)
- 内嵌后台管理系统

## 构建与部署

```bash
npm run build          # Astro 构建 → dist/
npm run preview        # 预览构建产物
npm run optimize       # 资源优化 (图片转 WebP + 字体子集化)
npm run release        # 优化 → 构建 → 一键部署
```

部署目标: 纯静态 `dist/` 目录, 可托管于 Nginx/Vercel 等任意静态服务器。

## 技术栈

- **框架**: Astro 6
- **后端**: Go (net/http) + SQLite (modernc, 纯 Go 无 CGO)
- **UI**: MUI v7 + Emotion + Remix Icon
- **能力**: APLayer (音乐播放器), PixiJS Live2D (虚拟形象), JSZip, SheetJS
- **B站集成**: 动态抓取、封面代理、音频流代理、二维码 OAuth 登录
- **构建**: Vite (Astro 内置), Bun
