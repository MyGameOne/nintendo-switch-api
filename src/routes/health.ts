import type { Env } from '../types'
import { Hono } from 'hono'
import { DatabaseService } from '../services/database-service'

const health = new Hono<{ Bindings: Env }>()

health.get('/', async (c) => {
  try {
    console.log('🏥 执行健康检查...')

    const databaseService = new DatabaseService(c.env)
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
    return c.json(healthData)
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

    return c.json(healthData, 503)
  }
})

export { health as healthRoutes }
