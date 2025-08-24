# Multi-Platform Gaming API Design Document

## Overview

This document outlines the technical design for transforming the current Nintendo Switch API into a comprehensive multi-platform gaming API. The design focuses on creating a scalable, maintainable architecture that can support multiple gaming platforms while preserving existing functionality and ensuring optimal performance on Cloudflare Workers.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
├─────────────────────────────────────────────────────────────┤
│                     API Gateway Layer                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Health    │ │    Stats    │ │      Documentation      │ │
│  │   Routes    │ │   Routes    │ │        Routes           │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Platform Router                           │
│  ┌─────────────────────────────┐ ┌─────────────────────────┐ │
│  │      Nintendo Platform      │ │       Xbox Platform     │ │
│  │  ┌─────────┐ ┌─────────────┐ │ │  ┌─────────┐ ┌─────────┐ │
│  │  │  Auth   │ │    User     │ │ │  │  Auth   │ │  User   │ │
│  │  │ Routes  │ │   Routes    │ │ │  │ Routes  │ │ Routes  │ │
│  │  └─────────┘ └─────────────┘ │ │  └─────────┘ └─────────┘ │
│  │  ┌─────────┐ ┌─────────────┐ │ │  ┌─────────┐ ┌─────────┐ │
│  │  │  Games  │ │    Data     │ │ │  │  Games  │ │ Social  │ │
│  │  │ Routes  │ │   Routes    │ │ │  │ Routes  │ │ Routes  │ │
│  │  └─────────┘ └─────────────┘ │ │  └─────────┘ └─────────┘ │
│  └─────────────────────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Service Layer                             │
│  ┌─────────────────────────────┐ ┌─────────────────────────┐ │
│  │    Nintendo Services        │ │      Xbox Services      │ │
│  │  ┌─────────────────────────┐ │ │  ┌─────────────────────┐ │
│  │  │   Nintendo Auth Service │ │ │  │    Xbox Auth Service│ │
│  │  │   Nintendo API Service  │ │ │  │    Xbox API Service │ │
│  │  │   Database Service      │ │ │  │    (No DB needed)   │ │
│  │  │   KV Service           │ │ │  │                     │ │
│  │  └─────────────────────────┘ │ │  └─────────────────────┘ │
│  └─────────────────────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Shared Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │    Types    │ │   Utils     │ │      Middleware         │ │
│  │             │ │             │ │                         │ │
│  │ • Base      │ │ • Response  │ │ • CORS                  │ │
│  │ • Common    │ │ • Session   │ │ • Error Handling        │ │
│  │ • Platform  │ │ • Crypto    │ │ • Rate Limiting         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                 External Services                           │
│  ┌─────────────────────────────┐ ┌─────────────────────────┐ │
│  │      Nintendo APIs          │ │       Xbox Live APIs    │ │
│  │                             │ │                         │ │
│  │ • accounts.nintendo.com     │ │ • login.live.com        │ │
│  │ • api.accounts.nintendo.com │ │ • profile.xboxlive.com  │ │
│  │ • news-api.entry.nintendo   │ │ • achievements.xbox...  │ │
│  └─────────────────────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                 Cloudflare Storage                          │
│  ┌─────────────────────────────┐ ┌─────────────────────────┐ │
│  │         D1 Database         │ │       KV Storage        │ │
│  │                             │ │                         │ │
│  │ • Nintendo game metadata    │ │ • Session management    │ │
│  │ • Scraping statistics       │ │ • Authentication tokens │ │
│  │ • Game enhancement data     │ │ • Cache data            │ │
│  └─────────────────────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure Design

```
src/
├── app.ts                          # Main application entry
├── platforms/                      # Platform-specific implementations
│   ├── nintendo/                   # Nintendo Switch platform
│   │   ├── handlers/
│   │   │   ├── auth.ts            # Nintendo authentication handlers
│   │   │   ├── user.ts            # Nintendo user handlers
│   │   │   ├── games.ts           # Nintendo games handlers
│   │   │   └── data.ts            # Nintendo data handlers
│   │   ├── services/
│   │   │   ├── nintendo-service.ts # Nintendo API service
│   │   │   ├── database-service.ts # Nintendo database service
│   │   │   └── kv-service.ts      # Nintendo KV service
│   │   ├── routes/
│   │   │   ├── auth.ts            # Nintendo auth routes
│   │   │   ├── user.ts            # Nintendo user routes
│   │   │   ├── games.ts           # Nintendo games routes
│   │   │   └── data.ts            # Nintendo data routes
│   │   └── types.ts               # Nintendo-specific types
│   └── xbox/                      # Xbox Live platform
│       ├── handlers/
│       │   ├── auth.ts            # Xbox authentication handlers
│       │   ├── user.ts            # Xbox user handlers
│       │   ├── games.ts           # Xbox games handlers
│       │   ├── achievements.ts    # Xbox achievements handlers
│       │   └── social.ts          # Xbox social handlers
│       ├── services/
│       │   ├── xbox-auth-service.ts # Xbox authentication service
│       │   └── xbox-api-service.ts  # Xbox API service
│       ├── routes/
│       │   ├── auth.ts            # Xbox auth routes
│       │   ├── user.ts            # Xbox user routes
│       │   ├── games.ts           # Xbox games routes
│       │   ├── achievements.ts    # Xbox achievements routes
│       │   └── social.ts          # Xbox social routes
│       └── types.ts               # Xbox-specific types
├── shared/                        # Shared utilities and types
│   ├── types/
│   │   ├── base.ts               # Base interfaces and types
│   │   ├── api.ts                # API response types
│   │   ├── auth.ts               # Authentication types
│   │   └── platform.ts           # Platform abstraction types
│   ├── utils/
│   │   ├── response.ts           # Response utilities
│   │   ├── session-manager.ts    # Session management
│   │   ├── crypto.ts             # Cryptographic utilities
│   │   └── validation.ts         # Input validation
│   ├── middleware/
│   │   ├── cors.ts               # CORS middleware
│   │   ├── error-handler.ts      # Error handling middleware
│   │   ├── rate-limiter.ts       # Rate limiting middleware
│   │   └── auth-validator.ts     # Authentication validation
│   └── services/
│       ├── platform-registry.ts  # Platform registration service
│       └── health-service.ts     # Health check service
├── routes/                        # Global routes
│   ├── health.ts                 # Health check routes
│   ├── stats.ts                  # Cross-platform statistics
│   └── docs.ts                   # API documentation routes
└── lib/                          # Core application libraries
    ├── create-app.ts             # Application factory
    ├── configure-openapi.ts      # OpenAPI configuration
    └── error-schemas.ts          # Error response schemas
```

## Components and Interfaces

### Platform Abstraction Interface

```typescript
// src/shared/types/platform.ts
export interface PlatformService {
  readonly name: string
  readonly version: string

  // Authentication
  generateAuthUrl: (sessionId: string) => Promise<AuthUrlResponse>
  handleAuthCallback: (code: string, sessionId: string) => Promise<AuthCallbackResponse>

  // User Management
  getUserProfile: (token: string) => Promise<UserProfile>

  // Game Data
  getGameRecords: (token: string) => Promise<GameRecord[]>

  // Health Check
  checkHealth: () => Promise<HealthStatus>
}

export interface AuthUrlResponse {
  authUrl: string
  sessionId: string
  instructions: string[]
}

export interface AuthCallbackResponse {
  sessionToken: string
  expiresAt: number
}

export interface UserProfile {
  id: string
  username: string
  displayName?: string
  avatar?: string
  platform: string
  // Platform-specific data in metadata
  metadata: Record<string, any>
}

export interface GameRecord {
  id: string
  name: string
  platform: string
  lastPlayed: string
  totalPlayTime: number
  // Platform-specific data
  platformData: Record<string, any>
}
```

### Unified API Response Schema

```typescript
// src/shared/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  meta: ResponseMeta
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  platform?: string
}

export interface ResponseMeta {
  timestamp: string
  platform?: string
  version: string
  performance?: {
    responseTime: string
    cacheHit?: boolean
  }
  pagination?: PaginationMeta
}
```

### Platform Registry Service

```typescript
// src/shared/services/platform-registry.ts
export class PlatformRegistry {
  private platforms = new Map<string, PlatformService>()

  register(platform: PlatformService): void
  get(name: string): PlatformService | undefined
  getAll(): PlatformService[]
  isEnabled(name: string): boolean
}
```

## Data Models

### Nintendo Platform Data Models

```typescript
// src/platforms/nintendo/types.ts
export interface NintendoGameRecord extends GameRecord {
  titleId: string
  titleNameCN?: string
  publisher?: string
  deviceType: string
  imageUrl: string
  firstPlayedAt: string
  totalPlayedDays: number
  totalPlayedMinutes: number
}

export interface NintendoUserProfile extends UserProfile {
  nickname: string
  imageUri?: string
}
```

### Xbox Platform Data Models

```typescript
// src/platforms/xbox/types.ts
export interface XboxGameRecord extends GameRecord {
  titleId: string
  gamerscore: number
  achievements: {
    unlocked: number
    total: number
  }
  lastAchievement?: string
}

export interface XboxUserProfile extends UserProfile {
  xuid: string
  gamertag: string
  gamerscore: number
  accountTier: string
  tenureLevel: number
}

export interface XboxAchievement {
  id: string
  name: string
  description: string
  gamerscore: number
  isUnlocked: boolean
  unlockedAt?: string
  rarity: number
}
```

## Error Handling

### Unified Error System

```typescript
// src/shared/types/base.ts
export class PlatformError extends Error {
  constructor(
    message: string,
    public code: string,
    public platform: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'PlatformError'
  }
}

export class AuthenticationError extends PlatformError {
  constructor(message: string, platform: string, details?: Record<string, any>) {
    super(message, 'AUTH_ERROR', platform, 401, details)
    this.name = 'AuthenticationError'
  }
}

export class RateLimitError extends PlatformError {
  constructor(platform: string, retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT', platform, 429, { retryAfter })
    this.name = 'RateLimitError'
  }
}
```

## Testing Strategy

### Test Structure

```
test/
├── unit/                          # Unit tests
│   ├── platforms/
│   │   ├── nintendo/
│   │   │   ├── services/
│   │   │   └── handlers/
│   │   └── xbox/
│   │       ├── services/
│   │       └── handlers/
│   └── shared/
│       ├── utils/
│       └── services/
├── integration/                   # Integration tests
│   ├── nintendo-api.test.ts
│   ├── xbox-api.test.ts
│   └── cross-platform.test.ts
└── e2e/                          # End-to-end tests
    ├── nintendo-flow.test.ts
    ├── xbox-flow.test.ts
    └── health-check.test.ts
```

### Test Configuration

```typescript
// vitest.config.mts
export default defineConfig({
  test: {
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        DB: 'test-db',
        GAME_IDS: 'test-kv',
        CACHE: 'test-cache'
      }
    },
    setupFiles: ['./test/setup.ts']
  }
})
```

## Performance Considerations

### Caching Strategy

1. **Platform-Isolated Caching**: Each platform manages its own cache keys
2. **Shared Cache Utilities**: Common caching patterns in shared utilities
3. **TTL Management**: Platform-specific cache expiration policies

### Resource Optimization

1. **Lazy Loading**: Platform services loaded only when needed
2. **Connection Pooling**: Reuse HTTP connections where possible
3. **Response Compression**: Automatic gzip compression for large responses

### Monitoring and Metrics

```typescript
// src/shared/utils/metrics.ts
export interface PlatformMetrics {
  platform: string
  endpoint: string
  responseTime: number
  statusCode: number
  errorRate: number
  cacheHitRate: number
}
```

## Security Implementation

### Authentication Flow Security

1. **Token Isolation**: Platform tokens stored separately
2. **Session Management**: Secure session handling with expiration
3. **CSRF Protection**: Cross-site request forgery protection
4. **Rate Limiting**: Per-platform rate limiting

### Data Privacy

1. **Data Minimization**: Only collect necessary user data
2. **Encryption**: Sensitive data encrypted at rest and in transit
3. **Audit Logging**: Track access to sensitive operations
4. **Compliance**: GDPR and platform-specific privacy requirements

## Migration Strategy

### Phase 1: Structure Preparation
- Create new directory structure
- Move existing Nintendo code to platform directory
- Implement shared utilities and types

### Phase 2: Route Migration
- Update route registration to new structure
- Implement backward compatibility layer
- Add deprecation warnings to old endpoints

### Phase 3: Xbox Integration
- Implement Xbox platform services
- Add Xbox-specific routes and handlers
- Test cross-platform functionality

### Phase 4: Optimization and Cleanup
- Remove deprecated endpoints
- Optimize performance
- Complete documentation

## Deployment Considerations

### Cloudflare Workers Configuration

```jsonc
// wrangler.jsonc updates
{
  "name": "gaming-platform-api",
  "compatibility_date": "2025-07-30",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "nintendo-games-db"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "GAME_IDS",
      "id": "nintendo-game-ids"
    },
    {
      "binding": "CACHE",
      "id": "platform-cache"
    }
  ],
  "vars": {
    "ENABLED_PLATFORMS": "nintendo,xbox"
  }
}
```

### Environment Variables

```bash
# Platform Configuration
ENABLED_PLATFORMS=nintendo,xbox

# Nintendo Configuration
NINTENDO_CLIENT_ID=your_nintendo_client_id
NINTENDO_CLIENT_SECRET=your_nintendo_client_secret

# Xbox Configuration
XBOX_CLIENT_ID=your_xbox_client_id
XBOX_CLIENT_SECRET=your_xbox_client_secret
XBOX_REDIRECT_URI=your_xbox_redirect_uri
```

This design provides a solid foundation for the multi-platform gaming API while maintaining flexibility for future platform additions and ensuring optimal performance on Cloudflare Workers.
