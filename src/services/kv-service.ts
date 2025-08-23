import type { Env } from '../types'

/**
 * 游戏队列项数据结构
 */
interface QueueItem {
  addedAt: number
  source: string
  status: 'pending' | 'processing' | 'failed'
  failureCount: number
  lastFailedAt?: number
  blacklisted?: boolean
  reason?: string
}

/**
 * KV 服务 - 管理游戏 ID 队列和失败追踪
 * 移除了无效的缓存机制，专注于队列管理和失败追踪
 */
export class KVService {
  private gameIds: KVNamespace
  
  // 配置常量
  private readonly MAX_FAILURE_COUNT = 3 // 最大失败次数
  private readonly BLACKLIST_TTL = 30 * 24 * 60 * 60 // 黑名单 TTL: 30天

  constructor(env: Env) {
    this.gameIds = env.GAME_IDS
  }

  /**
   * 检查游戏是否在黑名单中
   * @param titleId 游戏 ID
   * @returns 是否被黑名单
   */
  async isBlacklisted(titleId: string): Promise<boolean> {
    const blacklistKey = `failed:${titleId}`
    const blacklistData = await this.gameIds.get(blacklistKey)
    
    if (!blacklistData) return false
    
    try {
      const data: QueueItem = JSON.parse(blacklistData)
      return data.blacklisted === true && data.failureCount >= this.MAX_FAILURE_COUNT
    } catch {
      return false
    }
  }

  /**
   * 添加游戏 ID 到待爬取队列 (智能防重复和黑名单检查)
   * @param titleId 游戏 ID
   * @param source 来源标识 (如 'user_query')
   * @returns 是否成功添加
   */
  async addToQueue(titleId: string, source: string = 'user_query'): Promise<boolean> {
    // 1. 检查是否在黑名单中
    if (await this.isBlacklisted(titleId)) {
      console.log(`🚫 游戏 ID ${titleId} 在黑名单中，跳过添加`)
      return false
    }

    const pendingKey = `pending:${titleId}`
    
    // 2. 检查是否已在待处理队列中
    const existing = await this.gameIds.get(pendingKey)
    if (existing !== null) {
      console.log(`⏭️ 游戏 ID ${titleId} 已在队列中，跳过添加`)
      return false
    }

    // 3. 添加到队列
    const queueItem: QueueItem = {
      addedAt: Date.now(),
      source,
      status: 'pending',
      failureCount: 0
    }

    await this.gameIds.put(pendingKey, JSON.stringify(queueItem))
    console.log(`📝 游戏 ID ${titleId} 已添加到爬取队列 (来源: ${source})`)
    return true
  }

  /**
   * 批量添加游戏 ID 到队列 (智能过滤黑名单和重复项)
   * @param titleIds 游戏 ID 数组
   * @param source 来源标识
   * @returns 实际添加的数量
   */
  async addMultipleToQueue(titleIds: string[], source: string = 'user_query'): Promise<number> {
    if (titleIds.length === 0) return 0

    // 批量添加，每个方法内部会检查黑名单和重复
    const results = await Promise.all(
      titleIds.map(titleId => this.addToQueue(titleId, source))
    )

    const addedCount = results.filter(Boolean).length
    
    if (addedCount === 0) {
      console.log('📋 所有游戏 ID 都已在队列中或被黑名单，跳过添加')
    } else {
      console.log(`📝 批量添加 ${addedCount}/${titleIds.length} 个游戏 ID 到爬取队列`)
    }

    return addedCount
  }

  /**
   * 记录游戏爬取失败 (供爬虫项目调用)
   * @param titleId 游戏 ID
   * @param reason 失败原因
   */
  async recordFailure(titleId: string, reason: string = 'scraping_failed'): Promise<void> {
    const pendingKey = `pending:${titleId}`
    const failedKey = `failed:${titleId}`

    // 1. 从待处理队列中移除
    await this.gameIds.delete(pendingKey)

    // 2. 获取或创建失败记录
    let failureData: QueueItem
    const existingFailure = await this.gameIds.get(failedKey)
    
    if (existingFailure) {
      try {
        failureData = JSON.parse(existingFailure)
        failureData.failureCount += 1
        failureData.lastFailedAt = Date.now()
      } catch {
        // 解析失败，创建新记录
        failureData = {
          addedAt: Date.now(),
          source: 'unknown',
          status: 'failed',
          failureCount: 1,
          lastFailedAt: Date.now(),
          reason
        }
      }
    } else {
      failureData = {
        addedAt: Date.now(),
        source: 'unknown',
        status: 'failed',
        failureCount: 1,
        lastFailedAt: Date.now(),
        reason
      }
    }

    // 3. 检查是否需要加入黑名单
    if (failureData.failureCount >= this.MAX_FAILURE_COUNT) {
      failureData.blacklisted = true
      console.log(`🚫 游戏 ID ${titleId} 失败 ${failureData.failureCount} 次，已加入黑名单`)
      
      // 设置较长的 TTL，避免永久占用空间
      await this.gameIds.put(failedKey, JSON.stringify(failureData), {
        expirationTtl: this.BLACKLIST_TTL
      })
    } else {
      console.log(`⚠️ 游戏 ID ${titleId} 失败 ${failureData.failureCount} 次`)
      await this.gameIds.put(failedKey, JSON.stringify(failureData))
    }
  }

  /**
   * 标记游戏爬取成功 (供爬虫项目调用)
   * @param titleId 游戏 ID
   */
  async markSuccess(titleId: string): Promise<void> {
    const pendingKey = `pending:${titleId}`
    const failedKey = `failed:${titleId}`

    // 从队列和失败记录中移除
    await Promise.all([
      this.gameIds.delete(pendingKey),
      this.gameIds.delete(failedKey)
    ])

    console.log(`✅ 游戏 ID ${titleId} 爬取成功，已从队列中移除`)
  }

  /**
   * 获取队列统计信息 (包含黑名单统计)
   */
  async getQueueStats(): Promise<{ 
    pendingCount: number
    blacklistedCount: number
    failedCount: number
  }> {
    try {
      const [pendingList, failedList] = await Promise.all([
        this.gameIds.list({ prefix: 'pending:' }),
        this.gameIds.list({ prefix: 'failed:' })
      ])

      // 统计黑名单数量
      let blacklistedCount = 0
      for (const key of failedList.keys) {
        try {
          const data = await this.gameIds.get(key.name)
          if (data) {
            const failureData: QueueItem = JSON.parse(data)
            if (failureData.blacklisted) {
              blacklistedCount++
            }
          }
        } catch {
          // 忽略解析错误
        }
      }

      return {
        pendingCount: pendingList.keys.length,
        blacklistedCount,
        failedCount: failedList.keys.length
      }
    }
    catch (error) {
      console.error('获取队列统计失败:', error)
      return { 
        pendingCount: 0, 
        blacklistedCount: 0,
        failedCount: 0
      }
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
   * 从队列中移除游戏 ID (已废弃，请使用 markSuccess 或 recordFailure)
   * @deprecated 使用 markSuccess() 或 recordFailure() 代替
   */
  async removeFromQueue(titleId: string): Promise<void> {
    console.warn(`⚠️ removeFromQueue 已废弃，请使用 markSuccess() 或 recordFailure()`)
    await this.markSuccess(titleId)
  }

  /**
   * 清理过期的失败记录 (管理功能)
   * @param olderThanDays 清理多少天前的记录
   */
  async cleanupFailedRecords(olderThanDays: number = 7): Promise<number> {
    try {
      const failedList = await this.gameIds.list({ prefix: 'failed:' })
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
      
      let cleanedCount = 0
      
      for (const key of failedList.keys) {
        try {
          const data = await this.gameIds.get(key.name)
          if (data) {
            const failureData: QueueItem = JSON.parse(data)
            
            // 清理非黑名单的旧失败记录
            if (!failureData.blacklisted && 
                failureData.lastFailedAt && 
                failureData.lastFailedAt < cutoffTime) {
              await this.gameIds.delete(key.name)
              cleanedCount++
            }
          }
        } catch {
          // 解析失败的记录也删除
          await this.gameIds.delete(key.name)
          cleanedCount++
        }
      }

      console.log(`🧹 清理了 ${cleanedCount} 个过期的失败记录`)
      return cleanedCount
    } catch (error) {
      console.error('清理失败记录时出错:', error)
      return 0
    }
  }

  /**
   * 获取黑名单游戏列表 (管理功能)
   * @param limit 限制数量
   */
  async getBlacklistedGames(limit: number = 50): Promise<string[]> {
    try {
      const failedList = await this.gameIds.list({ prefix: 'failed:', limit })
      const blacklisted: string[] = []

      for (const key of failedList.keys) {
        try {
          const data = await this.gameIds.get(key.name)
          if (data) {
            const failureData: QueueItem = JSON.parse(data)
            if (failureData.blacklisted) {
              blacklisted.push(key.name.replace('failed:', ''))
            }
          }
        } catch {
          // 忽略解析错误
        }
      }

      return blacklisted
    } catch (error) {
      console.error('获取黑名单失败:', error)
      return []
    }
  }
}
