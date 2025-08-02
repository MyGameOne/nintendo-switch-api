import type { Env } from '../types'

/**
 * KV 服务 - 管理游戏 ID 队列和缓存
 */
export class KVService {
  private gameIds: KVNamespace
  private cache: KVNamespace

  constructor(env: Env) {
    this.gameIds = env.GAME_IDS
    this.cache = env.CACHE
  }

  /**
   * 添加游戏 ID 到待爬取队列
   * @param titleId 游戏 ID
   * @param source 来源标识 (如 'user_query')
   */
  async addToQueue(titleId: string, source: string = 'user_query'): Promise<void> {
    const key = `pending:${titleId}`
    const value = JSON.stringify({
      addedAt: Date.now(),
      source,
    })

    await this.gameIds.put(key, value)
    console.log(`📝 游戏 ID ${titleId} 已添加到爬取队列 (来源: ${source})`)
  }

  /**
   * 批量添加游戏 ID 到队列
   * @param titleIds 游戏 ID 数组
   * @param source 来源标识
   */
  async addMultipleToQueue(titleIds: string[], source: string = 'user_query'): Promise<void> {
    if (titleIds.length === 0)
      return

    // 检查哪些 ID 还未在队列中
    const newTitleIds = await this.filterNewTitleIds(titleIds)

    if (newTitleIds.length === 0) {
      console.log('📋 所有游戏 ID 都已在队列中，跳过添加')
      return
    }

    // 批量添加新的 ID
    const promises = newTitleIds.map(titleId => this.addToQueue(titleId, source))
    await Promise.all(promises)

    console.log(`📝 批量添加 ${newTitleIds.length} 个游戏 ID 到爬取队列`)
  }

  /**
   * 检查游戏 ID 是否已在队列中
   * @param titleId 游戏 ID
   * @returns 是否在队列中
   */
  async isInQueue(titleId: string): Promise<boolean> {
    const key = `pending:${titleId}`
    const value = await this.gameIds.get(key)
    return value !== null
  }

  /**
   * 过滤出不在队列中的新游戏 ID
   * @param titleIds 游戏 ID 数组
   * @returns 不在队列中的游戏 ID 数组
   */
  async filterNewTitleIds(titleIds: string[]): Promise<string[]> {
    if (titleIds.length === 0)
      return []

    // 批量检查队列状态
    const checkPromises = titleIds.map(async (titleId) => {
      const inQueue = await this.isInQueue(titleId)
      return { titleId, inQueue }
    })

    const results = await Promise.all(checkPromises)
    return results
      .filter(result => !result.inQueue)
      .map(result => result.titleId)
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(): Promise<{ pendingCount: number }> {
    try {
      // 列出所有 pending: 开头的键
      const list = await this.gameIds.list({ prefix: 'pending:' })

      return {
        pendingCount: list.keys.length,
      }
    }
    catch (error) {
      console.error('获取队列统计失败:', error)
      return { pendingCount: 0 }
    }
  }

  /**
   * 获取待处理的游戏 ID 列表 (供爬虫使用)
   * @param limit 限制数量
   */
  async getPendingGameIds(limit: number = 100): Promise<string[]> {
    try {
      const list = await this.gameIds.list({
        prefix: 'pending:',
        limit,
      })

      return list.keys.map(key => key.name.replace('pending:', ''))
    }
    catch (error) {
      console.error('获取待处理游戏 ID 失败:', error)
      return []
    }
  }

  /**
   * 从队列中移除游戏 ID (爬虫完成后调用)
   * @param titleId 游戏 ID
   */
  async removeFromQueue(titleId: string): Promise<void> {
    const key = `pending:${titleId}`
    await this.gameIds.delete(key)
    console.log(`🗑️ 游戏 ID ${titleId} 已从队列中移除`)
  }

  /**
   * 缓存游戏存在性检查结果
   * @param titleId 游戏 ID
   * @param exists 是否存在于数据库
   * @param ttl TTL (秒)，默认 6 小时
   */
  async cacheGameExists(titleId: string, exists: boolean, ttl: number = 21600): Promise<void> {
    const key = `db:exists:${titleId}`
    await this.cache.put(key, exists.toString(), { expirationTtl: ttl })
  }

  /**
   * 获取缓存的游戏存在性
   * @param titleId 游戏 ID
   * @returns 存在性 (null 表示缓存未命中)
   */
  async getCachedGameExists(titleId: string): Promise<boolean | null> {
    const key = `db:exists:${titleId}`
    const value = await this.cache.get(key)

    if (value === null)
      return null
    return value === 'true'
  }

  /**
   * 批量获取缓存的游戏存在性
   * @param titleIds 游戏 ID 数组
   * @returns Map<titleId, exists | null>
   */
  async getCachedGameExistsBatch(titleIds: string[]): Promise<Map<string, boolean | null>> {
    const results = new Map<string, boolean | null>()

    const promises = titleIds.map(async (titleId) => {
      const exists = await this.getCachedGameExists(titleId)
      return { titleId, exists }
    })

    const batchResults = await Promise.all(promises)

    for (const result of batchResults) {
      results.set(result.titleId, result.exists)
    }

    return results
  }
}