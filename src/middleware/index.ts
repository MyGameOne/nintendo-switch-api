export { logger } from './logger'
export { rateLimit, securityHeaders } from './security'

// 中间件配置常量
export const MIDDLEWARE_CONFIG = {
  // 请求限制配置
  RATE_LIMITS: {
    AUTH: { windowMs: 60 * 1000, max: 10 }, // 认证接口：每分钟10次
    GAMES: { windowMs: 60 * 1000, max: 30 }, // 游戏接口：每分钟30次
    USER: { windowMs: 60 * 1000, max: 20 }, // 用户接口：每分钟20次
    ADMIN: { windowMs: 60 * 1000, max: 5 }, // 管理接口：每分钟5次
    DEFAULT: { windowMs: 60 * 1000, max: 100 }, // 其他接口：每分钟100次
  },

  // CORS 配置
  CORS: {
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposeHeaders: ['X-Request-ID', 'X-Response-Time', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400, // 24小时
  },

  // 缓存配置
  CACHE: {
    STATS_TTL: 300, // 统计信息缓存5分钟
    GAME_DATA_TTL: 3600, // 游戏数据缓存1小时
  },
} as const
