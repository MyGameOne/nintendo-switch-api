# Gaming Platform API 实现计划

## Phase 1: 项目重构 (2-3 天)

### 1.1 项目重命名
- [ ] 更新 package.json name: "gaming-platform-api"
- [ ] 更新 wrangler.jsonc name: "gaming-platform-api"
- [ ] 更新 README.md 项目描述

### 1.2 目录结构调整
```
src/
├── platforms/
│   ├── nintendo/
│   │   ├── handlers/
│   │   ├── services/
│   │   ├── routes/
│   │   └── types.ts
│   └── xbox/
│       ├── handlers/
│       ├── services/
│       ├── routes/
│       └── types.ts
├── shared/
│   ├── types.ts
│   ├── utils/
│   ├── middleware/
│   └── services/
└── app.ts
```

### 1.3 路由重构
- [ ] 将现有路由移动到 `/api/nintendo/*`
- [ ] 更新路由注册逻辑
- [ ] 保持向后兼容性（可选）

## Phase 2: Xbox 认证实现 (3-5 天)

### 2.1 Microsoft OAuth2 流程
```typescript
// src/platforms/xbox/services/xbox-auth-service.ts
class XboxAuthService {
  // Step 1: Microsoft OAuth2
  async getMicrosoftAuthUrl(): Promise<string>
  async exchangeMicrosoftCode(code: string): Promise<MicrosoftToken>

  // Step 2: Xbox Live Authentication
  async authenticateXboxLive(msToken: string): Promise<XboxLiveToken>

  // Step 3: XSTS Token
  async getXSTSToken(xblToken: string): Promise<XSTSToken>
}
```

### 2.2 认证端点
- [ ] `POST /api/xbox/auth/url` - 获取认证 URL
- [ ] `POST /api/xbox/auth/callback` - 处理认证回调
- [ ] `POST /api/xbox/auth/refresh` - 刷新令牌

## Phase 3: Xbox API 客户端 (1-2 天)

### 3.1 核心服务
```typescript
// src/platforms/xbox/services/xbox-service.ts
class XboxService {
  // 用户信息
  async getUserProfile(xuid: string): Promise<XboxUserProfile>
  async getUserSettings(xuids: string[]): Promise<UserSettings>

  // 游戏数据
  async getGameRecords(xuid: string): Promise<XboxGameRecord[]>
  async getAchievements(xuid: string, titleId?: string): Promise<Achievement[]>

  // 社交功能
  async getFriends(xuid: string): Promise<Friend[]>
  async getPresence(xuids: string[]): Promise<PresenceRecord[]>
}
```

### 3.2 API 端点
- [ ] `POST /api/xbox/user/profile` - 用户档案
- [ ] `POST /api/xbox/user/games` - 游戏记录
- [ ] `POST /api/xbox/achievements` - 成就信息
- [ ] `POST /api/xbox/social/friends` - 好友列表
- [ ] `POST /api/xbox/presence` - 在线状态

## Phase 4: 类型定义和错误处理 (1-2 天)

### 4.1 类型系统
```typescript
// src/platforms/xbox/types.ts
export interface XboxAuthData {
  userHash: string
  xstsToken: string
  expiresAt: number
}

export interface XboxUserProfile {
  xuid: string
  gamertag: string
  gamerscore: number
  accountTier: string
  // ...
}
```

### 4.2 错误处理
- [ ] Xbox API 特定错误码
- [ ] 认证失败处理
- [ ] 速率限制处理

## Phase 5: 测试和文档 (1-2 天)

### 5.1 测试
- [ ] 单元测试
- [ ] 集成测试
- [ ] 端到端测试

### 5.2 文档
- [ ] API 文档更新
- [ ] 使用示例
- [ ] 部署指南

## 技术难点和解决方案

### 1. Xbox 认证复杂性
**问题**: Xbox Live 认证需要多步骤 OAuth2 流程
**解决方案**:
- 参考官方文档实现标准 OAuth2 流程
- 使用 Cloudflare Workers 原生 fetch API
- 实现令牌缓存和刷新机制

### 2. Cloudflare Workers 限制
**问题**: 不支持 Node.js 特定库
**解决方案**:
- 使用纯 Web API 实现
- 避免依赖 Node.js 内置模块
- 使用 Cloudflare Workers 兼容的库

### 3. 项目架构调整
**问题**: 现有代码需要重构
**解决方案**:
- 渐进式重构，保持功能完整性
- 使用共享类型和工具函数
- 保持 API 向后兼容性

## 成本和资源评估

### Cloudflare 资源使用
- **Workers**: 现有免费额度足够
- **D1**: Xbox 不需要额外数据库存储
- **KV**: 仅用于会话管理，使用量很少

### 开发资源
- **时间**: 8-12 天
- **复杂度**: 中等
- **风险**: 低（Xbox API 相对稳定）

## 优先级建议

1. **高优先级**: Xbox 认证流程（核心功能）
2. **中优先级**: 基础 API 端点（用户、游戏）
3. **低优先级**: 高级功能（社交、成就详情）

## 成功指标

- [ ] 成功实现 Xbox Live 认证
- [ ] 获取用户基本信息和游戏记录
- [ ] API 响应时间 < 2 秒
- [ ] 错误率 < 1%
- [ ] 文档完整性 > 90%
