import type { Context } from 'hono'
import type { Env, Variables } from '../types'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { DatabaseService } from '../services/database-service'
import { createStandardSuccessResponse } from '../utils/response'

const health = new OpenAPIHono<{ Bindings: Env, Variables: Variables }>()

// 定义健康检查的 OpenAPI 路由
const healthRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['System'],
  summary: '健康检查',
  description: '检查 API 服务状态和数据库连接',
  responses: {
    200: {
      description: '服务正常',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              status: z.string(),
              version: z.string(),
              services: z.object({
                database: z.string(),
                kv_storage: z.string(),
                nintendo_api: z.string(),
              }),
              database: z.object({
                connected: z.boolean(),
                totalGames: z.number(),
                gamesWithChineseName: z.number(),
                chineseNameCoverage: z.string(),
                lastUpdated: z.string(),
              }),
              queue: z.object({
                pendingCount: z.number(),
              }),
            }),
            message: z.string().optional(),
          }),
        },
      },
    },
    503: {
      description: '服务不可用',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            error: z.string().optional(),
            message: z.string().optional(),
          }),
        },
      },
    },
  },
})

health.openapi(healthRoute, (async (c: Context<{ Bindings: Env, Variables: Variables }>) => {
  console.log(`🏥 执行健康检查...`)

  try {
    const databaseService = new DatabaseService(c.env)

    // 执行健康检查
    const stats = await databaseService.getStats()

    const healthData = {
      status: 'OK',
      version: '1.0.0',
      services: {
        database: 'connected',
        kv_storage: 'connected',
        nintendo_api: 'available',
      },
      database: {
        connected: true,
        totalGames: stats.totalGames,
        gamesWithChineseName: stats.gamesWithChineseName,
        chineseNameCoverage: stats.chineseNameCoverage,
        lastUpdated: stats.lastUpdated,
      },
      // 显示队列信息（内部统计，不是管理接口）
      queue: {
        pendingCount: stats.queueStats?.pendingCount || 0,
      },
    }

    console.log(`✅  健康检查通过`)

    return createStandardSuccessResponse(c, healthData, '服务运行正常')
  }
  catch (error) {
    console.error(`❌  健康检查失败:`, error)

    return c.json({
      success: false,
      error: 'Service Unavailable',
      message: error instanceof Error ? error.message : '服务不可用',
    }, 503)
  }
}) as any)

export { health as healthRoutes }
