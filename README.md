# Huaxiaoke 华小科官网

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

### 主要目录

```
src/
├── components/          # Astro 组件（待完善）
├── layouts/            # 页面布局
│   └── Layout.astro    # 主布局文件
├── pages/              # 页面路由
│   ├── index.astro     # 主页
│   └── api/           # API 接口
│       └── Gallery.js  # 画廊图片接口
├── scripts/           # JavaScript 功能模块
└── styles/            # CSS 样式文件

public/
├── audio/             # 音频文件
├── font/              # 字体文件
├── img/               # 图片资源
├── json/              # 数据配置文件
├── lib/               # 第三方库
└── models/            # Live2D 模型文件
```

## 功能模块

### 已完成功能 ✅

1. **SPA 单页应用导航**
   - 文件：[`src/scripts/spa-navigation.js`](src/scripts/spa-navigation.js)
   - 功能：页面间无刷新切换，支持浏览器历史记录

2. **导航栏动画效果**
   - 文件：[`src/scripts/navhover.js`](src/scripts/navhover.js)
   - 功能：悬停滑块动画，激活状态管理

3. **Live2D 桌宠系统**
   - 文件：[`src/scripts/live2d.js`](src/scripts/live2d.js)
   - 功能：基于 PIXI.js 的 Live2D 模型展示，支持鼠标追踪

4. **画廊展示系统**
   - 文件：[`src/scripts/imageGallery.js`](src/scripts/imageGallery.js)
   - API：[`src/pages/api/Gallery.js`](src/pages/api/Gallery.js)
   - 功能：动态加载插画作品，支持详情卡片展示

5. **音乐播放器**
   - 文件：[`src/scripts/music-player.js`](src/scripts/music-player.js)
   - 配置：[`public/json/music.json`](public/json/music.json)
   - 功能：背景音乐播放，支持播放列表和音量控制

6. **直播资讯时间轴**
   - 文件：[`src/scripts/timeline.js`](src/scripts/timeline.js)
   - 配置：[`public/json/timeline.json`](public/json/timeline.json)
   - 功能：时间轴展示，支持键盘导航和滚动指示器

7. **当期活动页面**
   - 文件：[`src/scripts/activity.js`](src/scripts/activity.js)
   - 配置：[`public/json/activity.json`](public/json/activity.json)
   - 功能：翻页书本动画，活动报名表单

8. **星空背景动画**
   - 文件：[`src/scripts/stars.js`](src/scripts/stars.js)
   - 功能：动态粒子背景效果

9. **主题切换系统**
   - 文件：[`src/scripts/dayornight.js`](src/scripts/dayornight.js)
   - 功能：明暗主题切换

10. **关于我们页面**
    - 文件：[`src/scripts/slide.js`](src/scripts/slide.js)
    - 配置：[`public/json/about.json`](public/json/about.json)
    - 功能：抽屉式内容切换

### 待完善功能 🚧

1. **组件化重构**
   - 将现有功能模块化为 Astro 组件
   - 优化代码复用性

2. **画廊详情优化**
   - 图片原图查看功能
   - 作品详细信息展示

3. **后台管理系统**
   - 内容管理接口
   - 数据动态更新

4. **移动端适配**
   - 响应式布局优化
   - 触摸操作支持

## 核心脚本说明

### 导航与路由
- [`spa-navigation.js`](src/scripts/spa-navigation.js) - SPA 路由管理，页面切换逻辑
- [`navhover.js`](src/scripts/navhover.js) - 导航栏交互动画

### 内容展示
- [`imageGallery.js`](src/scripts/imageGallery.js) - 插画画廊功能
- [`timeline.js`](src/scripts/timeline.js) - 直播资讯时间轴
- [`activity.js`](src/scripts/activity.js) - 活动页面翻书动画
- [`slide.js`](src/scripts/slide.js) - 关于页面内容滑动

### 交互效果
- [`live2d.js`](src/scripts/live2d.js) - Live2D 桌宠系统
- [`stars.js`](src/scripts/stars.js) - 星空粒子背景
- [`music-player.js`](src/scripts/music-player.js) - 音乐播放控制

### 工具类
- [`content-loader.js`](src/scripts/content-loader.js) - 动态内容加载
- [`dayornight.js`](src/scripts/dayornight.js) - 主题切换
- [`roll.js`](src/scripts/roll.js) - 自定义滚动效果
- [`isinline.js`](src/scripts/isinline.js) - 内联检测工具

## 样式文件说明

- [`index.css`](src/styles/index.css) - 全局样式和基础布局
- [`gallery.css`](src/styles/gallery.css) - 画廊页面样式
- [`calender.css`](src/styles/calender.css) - 时间轴页面样式
- [`activity.css`](src/styles/activity.css) - 活动页面样式
- [`about.css`](src/styles/about.css) - 关于页面样式

## 数据配置

### JSON 配置文件
- [`music.json`](public/json/music.json) - 音乐播放列表
- [`gallery.json`](public/json/gallery.json) - 画廊图片信息
- [`timeline.json`](public/json/timeline.json) - 时间轴数据
- [`activity.json`](public/json/activity.json) - 活动信息
- [`about.json`](public/json/about.json) - 关于页面内容

### 资源文件
- `public/img/Illustration/` - 插画作品图片
- `public/models/Huaxiaoke/` - Live2D 模型文件
- `public/audio/` - 背景音乐文件

## 技术栈

- **框架**: Astro
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **动画**: CSS Animations, PIXI.js
- **桌宠**: Live2D Cubism SDK
- **构建**: Vite (Astro 内置)

## 开发注意事项

1. Live2D 模型需要 PIXI.js 和 Cubism SDK 支持
2. 所有页面切换通过 SPA 导航管理，避免直接修改 DOM
3. 使用 CSS 变量实现主题切换和响应式设计
4. JSON 配置文件修改后需要刷新页面生效