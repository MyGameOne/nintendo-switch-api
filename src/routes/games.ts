import { createRoute } from '@hono/zod-openapi'
import { z } from 'zod'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { successResponseSchema, commonErrorResponses, createValidationErrorResponse } from '../lib/error-schemas'
import { createRouter } from '../lib/create-app'
import { handleGameRecords } from '../handlers/nintendo'

const games = createRouter()

const tags = ['游戏']

// 游戏记录模式
const gameRecordSchema = z.object({
  titleId: z.string().describe('游戏ID'),
  titleName: z.string().describe('游戏名称'),
  titleNameCN: z.string().optional().describe('中文游戏名称'),
  publisher: z.string().optional().describe('发行商'),
  deviceType: z.string().describe('设备类型'),
  imageUrl: z.string().url().describe('游戏图片URL'),
  lastUpdatedAt: z.string().describe('最后更新时间'),
  firstPlayedAt: z.string().describe('首次游玩时间'),
  lastPlayedAt: z.string().describe('最后游玩时间'),
  totalPlayedDays: z.number().describe('总游玩天数'),
  totalPlayedMinutes: z.number().describe('总游玩分钟数'),
})

// 请求模式
const sessionTokenSchema = z.object({
  sessionToken: z.string().min(1, '会话令牌不能为空').describe('Nintendo Switch 会话令牌'),
})

// 响应元数据模式
const gameRecordsMetaSchema = z.object({
  performance: z.object({
    responseTime: z.string().describe('响应时间'),
  }),
  count: z.number().describe('游戏总数'),
  enhanced: z.number().describe('已增强的游戏数量'),
})

// 获取游戏记录的 OpenAPI 路由
const gameRecordsRoute = createRoute({
  method: 'post',
  path: '/',
  tags,
  summary: '获取游戏记录',
  description: '获取用户的 Nintendo Switch 游戏记录，包含中文名称增强功能',
  request: {
    body: jsonContentRequired(sessionTokenSchema, '会话令牌'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      successResponseSchema(z.array(gameRecordSchema)).extend({
        meta: gameRecordsMetaSchema.optional(),
      }),
      '游戏记录获取成功',
    ),
    ...commonErrorResponses.unauthorized,
    ...createValidationErrorResponse(sessionTokenSchema),
  },
})

// 注册路由
games.openapi(gameRecordsRoute, handleGameRecords)

export { games as gameRoutes }
export type GameRecordsRoute = typeof gameRecordsRoute
