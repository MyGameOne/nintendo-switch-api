// 环境变量类型
export interface Env {
  DB: D1Database
  GAME_IDS: KVNamespace  // 游戏 ID 存储
  CACHE: KVNamespace     // 缓存存储
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

// API 响应类型
export interface AuthResponse {
  success: boolean
  authUrl?: string
  sessionId?: string
  instructions?: string[]
  error?: string
}

export interface CallbackResponse {
  success: boolean
  sessionToken?: string
  error?: string
}

export interface GameRecordsResponse {
  success: boolean
  games?: GameRecord[]
  error?: string
}

export interface UserInfoResponse {
  success: boolean
  user?: UserInfo
  error?: string
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
