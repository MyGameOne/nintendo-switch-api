import type { Env, Variables } from '../types'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { createStandardSuccessResponse, createStandardErrorResponse, createPaginationMeta } from '../utils/response'

const data = new OpenAPIHono<{ Bindings: Env, Variables: Variables }>()

// 游戏数据 Schema
const GameDataSchema = z.object({
  title_id: z.string().describe("游戏 ID"),
  formal_name: z.string().nullable().describe("正式名称"),
  name_zh_hant: z.string().nullable().describe("繁体中文名称"),
  name_zh_hans: z.string().nullable().describe("简体中文名称"),
  name_en: z.string().nullable().describe('英文名称'),
  name_ja: z.string().nullable().describe('日语名称'),
  description: z.string().nullable().describe('简介'),
  publisher_name: z.string().nullable().describe('发行商名称'),
  genre: z.string().nullable().describe('游戏类型'),
  release_date: z.string().nullable().describe('发行日期'),
  hero_banner_url: z.string().nullable().describe('游戏 banner 地址'),
  screenshots: z.string().nullable().describe('游戏截图列表'),
  platform: z.string().nullable().describe('平台'),
  languages: z.string().nullable().describe('游戏支持语言'),
  player_number: z.string().nullable().describe('玩家人数'),
  rom_size: z.number().nullable().describe('游戏大小'),
  rating_age: z.number().nullable().describe('游戏年龄限制'),
  rating_name: z.string().nullable().describe('游戏评级名称'),
  in_app_purchase: z.boolean().nullable().describe("在应用内购买"),
  region: z.string().nullable().describe('游戏区域'),
  created_at: z.string().describe('创建时间'),
  updated_at: z.string().describe('更新时间'),
})

// 游戏列表路由
const gamesListRoute = createRoute({
  method: 'get',
  path: '/games',
  tags: ['Game Data'],
  summary: '获取游戏列表',
  description: '获取游戏数据库中的游戏列表，支持分页和搜索',
  request: {
    query: z.object({
      page: z.string().optional().default('1'),
      limit: z.string().optional().default('20'),
      search: z.string().optional(),
      genre: z.string().optional(),
      publisher: z.string().optional(),
      region: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: '游戏列表获取成功',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(GameDataSchema),
            message: z.string().optional(),
            meta: z.object({
              pagination: z.object({
                page: z.number(),
                limit: z.number(),
                total: z.number(),
                totalPages: z.number(),
                hasNext: z.boolean(),
                hasPrev: z.boolean(),
              }),
            }).optional(),
          }),
        },
      },
    },
    400: {
      description: '请求参数错误',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.null(),
            error: z.string(),
            message: z.string().optional(),
          }),
        },
      },
    },
    500: {
      description: '服务器内部错误',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.null(),
            error: z.string(),
            message: z.string().optional(),
          }),
        },
      },
    },
  },
})

// 游戏详情路由
const gameDetailRoute = createRoute({
  method: 'get',
  path: '/games/{titleId}',
  tags: ['Game Data'],
  summary: '获取游戏详情',
  description: '根据 titleId 获取游戏详细信息',
  request: {
    params: z.object({
      titleId: z.string().regex(/^[0-9A-F]{16}$/i, '游戏 ID 必须是 16 位十六进制字符串'),
    }),
  },
  responses: {
    200: {
      description: '游戏详情获取成功',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: GameDataSchema,
            message: z.string().optional(),
          }),
        },
      },
    },
    400: {
      description: '请求参数错误',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.null(),
            error: z.string(),
            message: z.string().optional(),
          }),
        },
      },
    },
    404: {
      description: '游戏不存在',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.null(),
            error: z.string(),
            message: z.string().optional(),
          }),
        },
      },
    },
    500: {
      description: '服务器内部错误',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.null(),
            error: z.string(),
            message: z.string().optional(),
          }),
        },
      },
    },
  },
})

// 注册游戏列表路由
data.openapi(gamesListRoute, (async (c: any) => {
  const requestId = c.get('requestId')
  console.log(`📋 [${requestId}] 获取游戏列表`)

  try {
    // 解析查询参数
    const page = Math.max(1, Number.parseInt(c.req.query('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(c.req.query('limit') || '20') || 20))
    const search = c.req.query('search')
    const genre = c.req.query('genre')
    const publisher = c.req.query('publisher')
    const region = c.req.query('region')

    const offset = (page - 1) * limit

    // 构建查询条件
    const conditions: string[] = []
    const params: any[] = []

    if (search) {
      conditions.push('(formal_name LIKE ? OR name_zh_hant LIKE ? OR name_zh_hans LIKE ? OR name_en LIKE ?)')
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }

    if (genre) {
      conditions.push('genre LIKE ?')
      params.push(`%${genre}%`)
    }

    if (publisher) {
      conditions.push('publisher_name LIKE ?')
      params.push(`%${publisher}%`)
    }

    if (region) {
      conditions.push('region = ?')
      params.push(region)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 查询总数
    const countQuery = `SELECT COUNT(*) as total FROM games ${whereClause}`
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first()
    const total = (countResult as any)?.total || 0

    // 查询数据
    const dataQuery = `
      SELECT 
        title_id, formal_name, name_zh_hant, name_zh_hans, name_en, name_ja,
        description, publisher_name, genre, release_date, hero_banner_url,
        screenshots, platform, languages, player_number, rom_size,
        rating_age, rating_name, in_app_purchase, region, created_at, updated_at
      FROM games 
      ${whereClause}
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `

    const result = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all()
    const games = result.results || []

    console.log(`✅ [${requestId}] 游戏列表获取成功: ${games.length} 个游戏`)

    return createStandardSuccessResponse(c, games, `获取到 ${games.length} 个游戏`, {
      pagination: createPaginationMeta(page, limit, total),
    })
  }
  catch (error) {
    console.error(`❌ [${requestId}] 游戏列表获取失败:`, error)

    return createStandardErrorResponse(c, 'Database Query Failed', 
      error instanceof Error ? error.message : '数据库查询失败', 500)
  }
}) as any)

// 注册游戏详情路由
data.openapi(gameDetailRoute, (async (c: any) => {
  const requestId = c.get('requestId')
  const titleId = c.req.param('titleId')

  console.log(`🎮 [${requestId}] 获取游戏详情: ${titleId}`)

  try {
    // 验证 titleId 格式
    if (!titleId || !/^[0-9A-F]{16}$/i.test(titleId)) {
      return createStandardErrorResponse(c, 'Invalid Title ID', 'titleId 必须是 16 位十六进制字符串', 400)
    }

    const query = `
      SELECT 
        title_id, formal_name, name_zh_hant, name_zh_hans, name_en, name_ja,
        description, publisher_name, genre, release_date, hero_banner_url,
        screenshots, platform, languages, player_number, rom_size,
        rating_age, rating_name, in_app_purchase, region, created_at, updated_at
      FROM games 
      WHERE title_id = ?
    `

    const result = await c.env.DB.prepare(query).bind(titleId.toUpperCase()).first()

    if (!result) {
      console.log(`❌ [${requestId}] 游戏不存在: ${titleId}`)

      return createStandardErrorResponse(c, 'Game Not Found', `游戏 ${titleId} 不存在`, 404)
    }

    console.log(`✅ [${requestId}] 游戏详情获取成功: ${titleId}`)

    return createStandardSuccessResponse(c, result, '游戏详情获取成功')
  }
  catch (error) {
    console.error(`❌ [${requestId}] 游戏详情获取失败:`, error)

    return createStandardErrorResponse(c, 'Database Query Failed', error instanceof Error ? error.message : '数据库查询失败', 500)
  }
}) as any)

export { data as dataRoutes }
