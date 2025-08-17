import type { Env, Variables } from '../types'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { z } from 'zod'
import { DatabaseService } from '../services/database-service'
import { createStandardSuccessResponse } from '../utils/response'

const stats = new OpenAPIHono<{ Bindings: Env, Variables: Variables }>()

// 定义统计信息的 OpenAPI 路由
const statsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['System'],
  summary: '获取统计信息',
  description: '获取数据库统计信息和队列状态',
  responses: {
    200: {
      description: '统计信息获取成功',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              totalGames: z.number(),
              gamesWithChineseName: z.number(),
              chineseNameCoverage: z.string(),
              lastUpdated: z.string(),
              queueStats: z.object({
                pendingCount: z.number(),
              }).optional(),
            }),
            message: z.string().optional(),
          }),
        },
      },
    },
  },
})

stats.openapi(statsRoute, (async (c: any) => {
  console.log(`📊 获取统计信息...`)

  const databaseService = new DatabaseService(c.env)
  const statsData = await databaseService.getStats()

  const data = {
    totalGames: statsData.totalGames,
    gamesWithChineseName: statsData.gamesWithChineseName,
    chineseNameCoverage: statsData.chineseNameCoverage,
    lastUpdated: statsData.lastUpdated,
    // 显示队列统计（内部信息，用于了解系统状态）
    queueStats: statsData.queueStats,
  }

  console.log(`✅ 统计信息获取成功`)

  return createStandardSuccessResponse(c, data, '统计信息获取成功')
}) as any)

export { stats as statsRoutes }
