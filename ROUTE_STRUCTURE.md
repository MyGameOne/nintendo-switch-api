# 路由结构总览

## 项目结构

```
src/
├── routes/
│   ├── health.ts      # 健康检查
│   ├── stats.ts       # 统计信息
│   ├── auth.ts        # 用户认证
│   ├── user.ts        # 用户信息
│   ├── games.ts       # 游戏记录
│   └── admin.ts       # 管理功能 (新增)
├── handlers/          # 业务处理函数
├── services/          # 服务层
└── index.ts          # 主入口
```

## 路由映射

### 公共 API
- `GET /health` → `healthRoutes`
- `GET /api/stats` → `statsRoutes`

### 用户 API
- `POST /api/auth/*` → `authRoutes`
- `POST /api/user` → `userRoutes`
- `POST /api/games` → `gameRoutes`

### 管理 API (新增)
- `GET|POST|PUT|DELETE /api/admin/*` → `adminRoutes`

## 新增的管理功能

### 数据库管理
- ✅ 游戏列表查询（分页、搜索）
- ✅ 单个游戏详情查询
- ✅ 游戏信息更新
- ✅ 游戏删除（单个/批量）

### KV 存储管理
- ✅ KV 键列表查询
- ✅ KV 值的增删改查
- ✅ 批量 KV 操作
- ✅ 队列清理功能

### 特性
- 🔍 支持搜索和分页
- 📊 统一的响应格式
- 🛡️ 完整的错误处理
- 🚀 TypeScript 类型安全

## 使用方式

1. **启动开发服务器**:
   ```bash
   pnpm dev
   ```

2. **测试管理 API**:
   ```bash
   node test-admin-api.js
   ```

3. **查看 API 文档**:
   - 详细文档: `ADMIN_API.md`
   - 在线查看: `GET /` (404 响应包含所有端点)

## 下一步计划

- [ ] 添加 API Key 认证
- [ ] 实现操作日志
- [ ] 构建 Web 管理界面
- [ ] 添加数据导入/导出功能