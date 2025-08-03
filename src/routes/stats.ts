import type { Env } from '../types'
import { Hono } from 'hono'
import { DatabaseService } from '../services/database-service'

const stats = new Hono<{ Bindings: Env }>()

stats.get('/', async (c) => {
  try {
    console.log('📊 获取统计信息...')

    const databaseService = new DatabaseService(c.env)
    const statsData = await databaseService.getStats()

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalGames: statsData.totalGames,
        gamesWithChineseName: statsData.gamesWithChineseName,
        chineseNameCoverage: statsData.totalGames > 0
          ? `${((statsData.gamesWithChineseName / statsData.totalGames) * 100).toFixed(1)}%`
          : '0%',
        queueStats: statsData.queueStats,
        lastUpdated: new Date().toISOString(),
      },
    }

    console.log('✅ 统计信息获取成功')
    return c.json(response)
  }
  catch (error) {
    console.error('❌ 获取统计信息失败:', error)

    return c.json({
      success: false,
      error: '获取统计信息失败',
      timestamp: new Date().toISOString(),
    }, 500)
  }
})

export { stats as statsRoutes }
