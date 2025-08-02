import type { Env } from './types'
import { handleAuthCallback, handleAuthUrl } from './handlers/auth'
import { handleGameRecords } from './handlers/games'
import { handleAddToQueue, handleQueueStats } from './handlers/queue'
import { handleUserInfo } from './handlers/user'
import { DatabaseService } from './services/database-service'

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const startTime = Date.now()

    // CORS 处理
    if (request.method === 'OPTIONS') {
      return createCORSResponse()
    }

    // 路由处理
    try {
      let response: Response

      switch (url.pathname) {
        case '/health':
          response = await handleHealth(env)
          break

        case '/api/auth/url':
          response = await handleAuthUrl(request, env)
          break

        case '/api/auth/callback':
          response = await handleAuthCallback(request, env)
          break

        case '/api/user':
          response = await handleUserInfo(request, env)
          break

        case '/api/games':
          response = await handleGameRecords(request, env)
          break

        case '/api/stats':
          response = await handleStats(env)
          break

        case '/api/admin/queue/stats':
          response = await handleQueueStats(request, env)
          break

        case '/api/admin/queue/add':
          response = await handleAddToQueue(request, env)
          break

        default:
          response = new Response(JSON.stringify({
            success: false,
            error: 'Not Found',
            availableEndpoints: [
              'GET /health',
              'POST /api/auth/url',
              'POST /api/auth/callback',
              'POST /api/user',
              'POST /api/games',
              'GET /api/stats',
              'GET /api/admin/queue/stats',
              'POST /api/admin/queue/add',
            ],
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
      }

      // 添加 CORS 头和性能指标
      addCORSHeaders(response)
      addPerformanceHeaders(response, startTime)

      return response
    }
    catch (error) {
      console.error('❌ Worker 全局错误:', error)

      const errorResponse = new Response(JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })

      addCORSHeaders(errorResponse)
      return errorResponse
    }
  },
}

/**
 * 创建 CORS 预检响应
 */
function createCORSResponse(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24小时
    },
  })
}

/**
 * 添加 CORS 头
 */
function addCORSHeaders(response: Response): void {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

/**
 * 添加性能指标头
 */
function addPerformanceHeaders(response: Response, startTime: number): void {
  const duration = Date.now() - startTime
  response.headers.set('X-Response-Time', `${duration}ms`)
  response.headers.set('X-Timestamp', new Date().toISOString())
}

/**
 * 健康检查
 */
async function handleHealth(env: Env): Promise<Response> {
  try {
    console.log('🏥 执行健康检查...')

    const databaseService = new DatabaseService(env)
    const stats = await databaseService.getStats()

    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected',
        nintendo_api: 'available',
      },
      stats,
    }

    console.log('✅ 健康检查通过')
    return new Response(JSON.stringify(healthData), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    console.error('❌ 健康检查失败:', error)

    const healthData = {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      services: {
        database: 'disconnected',
        nintendo_api: 'unknown',
      },
    }

    return new Response(JSON.stringify(healthData), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * 统计信息接口
 */
async function handleStats(env: Env): Promise<Response> {
  try {
    console.log('📊 获取统计信息...')

    const databaseService = new DatabaseService(env)
    const stats = await databaseService.getStats()

    const statsData = {
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalGames: stats.totalGames,
        gamesWithChineseName: stats.gamesWithChineseName,
        chineseNameCoverage: stats.totalGames > 0
          ? `${((stats.gamesWithChineseName / stats.totalGames) * 100).toFixed(1)}%`
          : '0%',
        queueStats: stats.queueStats,
        lastUpdated: new Date().toISOString(),
      },
    }

    console.log('✅ 统计信息获取成功')
    return new Response(JSON.stringify(statsData), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    console.error('❌ 获取统计信息失败:', error)

    return new Response(JSON.stringify({
      success: false,
      error: '获取统计信息失败',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
