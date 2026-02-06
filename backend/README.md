# 华小科后端 API

基于 Go 标准库 + SQLite 的轻量后端，为前端提供数据接口。

## 快速启动

```bash
cd backend
go mod tidy        # 安装依赖
go run .           # 启动开发服务器 (默认 :1037)
```

首次启动会自动从 `../public/json/` 读取种子数据写入 `data.db`。

## API 列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/activities` | 当期活动列表（按日期倒序） |
| GET | `/api/timeline` | 时间轴（标题 + 事件列表） |
| GET | `/api/gallery` | 画廊作品列表 |
| GET | `/api/about` | 关于我们卡片 |
| GET | `/api/music` | 歌曲列表 |

## 项目结构

```
backend/
├── main.go           # 入口，路由注册
├── config/           # 配置常量
├── handler/          # HTTP 处理器
├── middleware/        # CORS 等中间件
├── model/            # 数据结构定义
├── store/            # 数据库初始化 + 种子数据
├── data.db           # SQLite 数据文件（自动生成）
└── go.mod
```

## 部署

编译为单二进制，配合 Nginx 反代使用：

```bash
CGO_ENABLED=0 go build -o huaxiaoke-server .
```

Nginx 参考：
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:1037;
}
```
