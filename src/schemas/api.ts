import { z } from 'zod'

// 通用响应 Schema
export const BaseResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  timestamp: z.string().optional(),
})

// 认证相关 Schema - 不需要任何参数，sessionId 内部生成
export const AuthUrlRequestSchema = z.object({})

export const AuthUrlResponseSchema = BaseResponseSchema.extend({
  authUrl: z.string().optional(),
  sessionId: z.string().optional(),
  instructions: z.array(z.string()).optional(),
})

export const CallbackRequestSchema = z.object({
  callbackUrl: z.string().url('回调 URL 格式不正确'),
})

export const CallbackResponseSchema = BaseResponseSchema.extend({
  sessionToken: z.string().optional(),
})

// 用户信息 Schema
export const UserRequestSchema = z.object({
  sessionToken: z.string(),
})

export const UserInfoSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  imageUri: z.string().optional(),
})

export const UserResponseSchema = BaseResponseSchema.extend({
  user: UserInfoSchema.optional(),
})

// 游戏记录 Schema
export const GameRecordSchema = z.object({
  titleId: z.string(),
  titleName: z.string(),
  titleNameCN: z.string().optional(),
  publisher: z.string().optional(),
  deviceType: z.string(),
  imageUrl: z.string(),
  lastUpdatedAt: z.string(),
  firstPlayedAt: z.string(),
  lastPlayedAt: z.string(),
  totalPlayedDays: z.number(),
  totalPlayedMinutes: z.number(),
})

export const GamesRequestSchema = z.object({
  sessionToken: z.string(),
})

export const GamesResponseSchema = BaseResponseSchema.extend({
  games: z.array(GameRecordSchema).optional(),
})

// 统计信息 Schema
export const StatsResponseSchema = BaseResponseSchema.extend({
  stats: z.object({
    totalGames: z.number(),
    gamesWithChineseName: z.number(),
    chineseNameCoverage: z.string(),
    lastUpdated: z.string(),
    queueStats: z.object({
      pendingCount: z.number(),
    }).optional(),
  }).optional(),
})



// 游戏数据 Schema
export const GameDataSchema = z.object({
  title_id: z.string(),
  formal_name: z.string().nullable(),
  name_zh_hant: z.string().nullable(),
  name_zh_hans: z.string().nullable(),
  name_en: z.string().nullable(),
  name_ja: z.string().nullable(),
  description: z.string().nullable(),
  publisher_name: z.string().nullable(),
  genre: z.string().nullable(),
  release_date: z.string().nullable(),
  hero_banner_url: z.string().nullable(),
  screenshots: z.string().nullable(),
  platform: z.string().nullable(),
  languages: z.string().nullable(),
  player_number: z.string().nullable(),
  rom_size: z.number().nullable(),
  rating_age: z.number().nullable(),
  rating_name: z.string().nullable(),
  in_app_purchase: z.boolean().nullable(),
  region: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const GameDataResponseSchema = BaseResponseSchema.extend({
  game: GameDataSchema.optional(),
})

export const GamesDataResponseSchema = BaseResponseSchema.extend({
  games: z.array(GameDataSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }).optional(),
})