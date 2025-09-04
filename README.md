启动 Astro 开发服务器 : npm run dev

构建并预览你的网站: npm run build

基本写完了

差一个活动界面和主界面和后台相关问题

懒得写

todo：  
1. index.astro 全局网页  
2. js或者其他方式切换内容，在于index.astro中的PartTwo（比如画廊就是<card></card>）  
3. 桌宠（后端解决办法）  
~~4. 网页音乐播放~~  
5. 画廊点击展示原图卡片以及图片信息  
6. 关于我们  
~~7. 当期活动~~  
8. 直播资讯  
~~9. 活动相关组件（新声歌会投稿！！！急急急）~~  
10. 不会写layout，component

目前组件解释：
1. public太弱智不解释了
2. api是画廊读取public中img/illustration的接口
3. scripts中：
    - gallery.js 画廊相关js
    - navhover 导航栏悬停动画
    - timeout.js 动画延时（意义不明）
    - roll.js 自定义返回滚动
    - stars.js 白色粒子背景
4. styles中：
    - gallery.css 画廊相关样式
    - index.css 全局样式