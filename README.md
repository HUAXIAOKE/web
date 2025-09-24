# Huaxiaoke 华小科官网

## 快速开始

```bash
# 1) 安装依赖
npm install

# 2) 启动开发
npm run dev

# 3) 生产构建
npm run build
npm run preview
```

## 项目结构

### 主要目录

```
src/
├─ layouts/ 主布局（Layout.astro）
├─ pages/ 路由与 API（/api/Gallery.js）
├─ scripts/ 交互脚本（导航/时间轴/音乐/Live2D/主题）
└─ styles/ 页面样式（全局/活动/时间轴/画廊/关于）
public/ 静态资源（img/json/audio/models 等）

```

## 定制与主题
- 调整全局配色/阴影：`src/styles/index.css` 与各页 `:root` 变量
- 主题切换：`src/scripts/isinline.js` + `dayornight.js`
- 活动页样式与卡片：`src/styles/activity.css`（支持分类筛选）
- 时间轴样式：`src/styles/calender.css`
- 画廊交互：`src/scripts/imageGallery.js` + `public/json/gallery.json`

## 待完善功能 🚧

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

## 数据与内容
- 活动/时间轴/画廊内容位于 `public/json`，按需增删字段即可生效
- 图片放置于 `public/img/...`；Live2D 模型位于 `public/models/...`

## 发布
- 纯静态产物位于 `dist/`，任意静态服务可托管
- Vercel/静态空间均可直接部署

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