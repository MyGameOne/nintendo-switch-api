import type { Env, GameRecord } from '../types'
import { KVService } from './kv-service'

export class DatabaseService {
  private db: D1Database
  private kvService: KVService

  constructor(env: Env) {
    this.db = env.DB
    this.kvService = new KVService(env)
  }

  // 根据游戏 ID 批量获取中文名称和发行商信息
  async getGameEnhancements(titleIds: string[]): Promise<Map<string, { name_zh_hant?: string, publisher_name?: string }>> {
    if (titleIds.length === 0)
      return new Map()

    try {
      // 构建 SQL 查询
      const placeholders = titleIds.map(() => '?').join(',')
      const query = `
        SELECT title_id, name_zh_hant, publisher_name 
        FROM games 
        WHERE title_id IN (${placeholders})
      `

      const { results } = await this.db.prepare(query).bind(...titleIds).all()

      // 创建查找映射
      const enhancementMap = new Map<string, { name_zh_hant?: string, publisher_name?: string }>()

      if (results) {
        for (const row of results as any[]) {
          enhancementMap.set(row.title_id, {
            name_zh_hant: row.name_zh_hant,
            publisher_name: row.publisher_name,
          })
        }
      }

      console.log(`📊 从数据库获取到 ${enhancementMap.size} 个游戏的增强信息`)
      return enhancementMap
    }
    catch (error) {
      console.error('数据库查询失败:', error)
      return new Map()
    }
  }

  // 增强游戏记录（添加中文名称和发行商）
  async enhanceGameRecords(gameRecords: GameRecord[]): Promise<GameRecord[]> {
    const titleIds = gameRecords.map(game => game.titleId)

    // 1. 获取游戏增强信息
    const enhancements = await this.getGameEnhancements(titleIds)

    // 2. 智能队列管理：找出数据库中不存在的游戏 ID
    await this.manageGameQueue(titleIds, enhancements)

    // 3. 返回增强后的游戏记录
    return gameRecords.map((record) => {
      const enhancement = enhancements.get(record.titleId)
      return {
        ...record,
        titleNameCN: enhancement?.name_zh_hant || undefined,
        publisher: enhancement?.publisher_name || undefined,
      }
    })
  }

  /**
   * 智能队列管理：将数据库中不存在的游戏 ID 添加到爬取队列
   * 这是内部功能，不对外暴露
   */
  private async manageGameQueue(
    titleIds: string[],
    enhancements: Map<string, { name_zh_hant?: string, publisher_name?: string }>,
  ): Promise<void> {
    try {
      // 找出数据库中不存在的游戏 ID
      const missingTitleIds = titleIds.filter(titleId => !enhancements.has(titleId))

      if (missingTitleIds.length === 0) {
        console.log('📋 所有游戏都已在数据库中，无需添加到队列')
        return
      }

      // 批量添加到 KV 队列，KV 服务会自动去重
      await this.kvService.addMultipleToQueue(missingTitleIds, 'user_query')

      // 缓存存在性检查结果
      const cachePromises = [
        // 缓存存在的游戏
        ...Array.from(enhancements.keys()).map(titleId =>
          this.kvService.cacheGameExists(titleId, true),
        ),
        // 缓存不存在的游戏
        ...missingTitleIds.map(titleId =>
          this.kvService.cacheGameExists(titleId, false),
        ),
      ]

      await Promise.all(cachePromises)

      console.log(`🎯 智能队列管理完成: ${missingTitleIds.length} 个新游戏已添加到爬取队列`)
    }
    catch (error) {
      console.error('❌ 队列管理失败:', error)
      // 队列管理失败不应该影响主要功能，所以只记录错误
    }
  }

  /**
   * 检查游戏是否存在于数据库中
   * @param titleIds 游戏 ID 数组
   * @returns 存在的游戏 ID 集合
   */
  async checkGamesExist(titleIds: string[]): Promise<Set<string>> {
    if (titleIds.length === 0)
      return new Set()

    try {
      const placeholders = titleIds.map(() => '?').join(',')
      const query = `SELECT title_id FROM games WHERE title_id IN (${placeholders})`

      const { results } = await this.db.prepare(query).bind(...titleIds).all()

      const existingIds = new Set<string>()
      if (results) {
        for (const row of results as any[]) {
          existingIds.add(row.title_id)
        }
      }

      return existingIds
    }
    catch (error) {
      console.error('检查游戏存在性失败:', error)
      return new Set()
    }
  }

  // 获取数据库统计信息
  async getStats(): Promise<{
    totalGames: number
    gamesWithChineseName: number
    chineseNameCoverage: string
    lastUpdated: string
    queueStats?: { pendingCount: number }
  }> {
    try {
      const [totalResult, chineseResult, lastUpdatedResult] = await Promise.all([
        this.db.prepare('SELECT COUNT(*) as count FROM games').first(),
        this.db.prepare('SELECT COUNT(*) as count FROM games WHERE name_zh_hant IS NOT NULL').first(),
        this.db.prepare('SELECT MAX(updated_at) as last_updated FROM games').first()
      ])

      const totalGames = (totalResult as any)?.count || 0
      const gamesWithChineseName = (chineseResult as any)?.count || 0
      const chineseNameCoverage = totalGames > 0 
        ? `${((gamesWithChineseName / totalGames) * 100).toFixed(1)}%`
        : '0%'

      // 获取队列统计（内部信息，可以在统计中显示）
      const queueStats = await this.kvService.getQueueStats().catch(() => ({ pendingCount: 0 }))

      return {
        totalGames,
        gamesWithChineseName,
        chineseNameCoverage,
        lastUpdated: (lastUpdatedResult as any)?.last_updated || new Date().toISOString(),
        queueStats,
      }
    }
    catch (error) {
      console.error('获取统计信息失败:', error)
      return { 
        totalGames: 0, 
        gamesWithChineseName: 0,
        chineseNameCoverage: '0%',
        lastUpdated: new Date().toISOString()
      }
    }
  }
}