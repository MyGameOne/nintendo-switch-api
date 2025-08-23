// 环境变量类型
export interface Env {
  DB: D1Database
  GAME_IDS: KVNamespace // 游戏 ID 存储和失败追踪
}

// Hono 上下文变量类型
export interface Variables {
  validatedData: any
}

// 统一 API 响应格式
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
  meta?: {
    pagination?: PaginationMeta
    performance?: PerformanceMeta
    [key: string]: any
  }
}

// 分页元数据
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// 性能元数据
export interface PerformanceMeta {
  responseTime: string
  cacheHit?: boolean
  dbQueries?: number
}

// 中间件相关类型
export interface RequestContext {
  startTime: number
  userAgent?: string
  clientIP?: string
}

export interface RateLimitInfo {
  count: number
  resetTime: number
}

export interface LogEntry {
  method: string
  url: string
  status: number
  duration: number
  userAgent: string
  timestamp: string
  error?: string
}

// 会话状态数据
export interface SessionState {
  sessionId: string
  codeVerifier: string
  timestamp: number
}

// 任天堂 API 相关类型
export interface AccessToken {
  access_token: string
  token_type: string
  expires_in: number
}

export interface UserInfo {
  id: string
  nickname: string
  imageUri?: string
}

export interface GameRecord {
  titleId: string
  titleName: string
  titleNameCN?: string
  publisher?: string
  deviceType: string
  imageUrl: string
  lastUpdatedAt: string
  firstPlayedAt: string
  lastPlayedAt: string
  totalPlayedDays: number
  totalPlayedMinutes: number
}

// 游戏数据库记录类型
export interface GameData {
  title_id: string
  formal_name: string | null
  name_zh_hant: string | null
  name_zh_hans: string | null
  name_en: string | null
  name_ja: string | null
  catch_copy: string | null
  description: string | null
  publisher_name: string | null
  publisher_id: number | null
  genre: string | null
  release_date: string | null
  hero_banner_url: string | null
  screenshots: string | null
  platform: string | null
  languages: string | null
  player_number: string | null
  play_styles: string | null
  rom_size: number | null
  rating_age: number | null
  rating_name: string | null
  in_app_purchase: boolean | null
  cloud_backup_type: string | null
  region: string | null
  data_source: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// 统计信息类型
export interface DatabaseStats {
  totalGames: number
  gamesWithChineseName: number
  chineseNameCoverage: string
  lastUpdated: string
  queueStats?: {
    pendingCount: number
    blacklistedCount: number
    failedCount: number
  }
}

// 认证相关数据类型
export interface AuthUrlData {
  authUrl: string
  sessionId: string
  instructions: string[]
}

export interface CallbackData {
  sessionToken: string
}

export class NintendoAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown,
  ) {
    super(message)
    this.name = 'NintendoAPIError'
  }
}

export class SessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SessionError'
  }
}
