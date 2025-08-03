# Nintendo Switch API

一个用于获取任天堂 Switch 游戏记录的 Cloudflare Workers API。

## 功能特性

- 🎮 获取任天堂 Switch 游戏记录
- 🔐 安全的 OAuth 认证流程
- 🌐 支持中文游戏名称增强
- 📊 游戏统计信息
- ⚡ 基于 Cloudflare Workers 的高性能部署

## API 接口

### 公开接口

- `GET /health` - 健康检查
- `GET /api/stats` - 获取公开统计信息

### 认证接口

- `POST /api/auth/url` - 获取认证 URL
- `POST /api/auth/callback` - 处理认证回调
- `POST /api/user` - 获取用户信息
- `POST /api/games` - 获取游戏记录

## 部署

### 1. 环境变量配置

```bash
# D1 数据库
wrangler d1 create nintendo-switch-games

# KV 命名空间
wrangler kv:namespace create "GAME_IDS"
wrangler kv:namespace create "CACHE"
```

### 2. 更新 wrangler.toml

```toml
name = "nintendo-switch-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "nintendo-switch-games"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "GAME_IDS"
id = "your-game-ids-kv-id"

[[kv_namespaces]]
binding = "CACHE"
id = "your-cache-kv-id"
```

### 3. 初始化数据库

```bash
wrangler d1 execute nintendo-switch-games --file=./schema/init.sql
```

### 4. 部署

```bash
npm run deploy
``

### 所需权限

创建 Cloudflare API Token 时需要以下权限：

- `Account - Cloudflare D1:Edit`
- `Account - Account Settings:Read`

详细说明请参考 [ADMIN_ARCHITECTURE.md](./ADMIN_ARCHITECTURE.md)

## 开发

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

### 类型检查

```bash
npm run type-check
```

## 技术栈

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Language**: TypeScript

## 安全性

- 使用任天堂官方 OAuth 流程
- 不存储用户敏感信息
- 支持 CORS 和安全头设置

## 许可证

MIT License
