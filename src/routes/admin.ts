import type { Env } from '../types'

import { Hono } from 'hono'
import { handleAddToQueue, handleQueueStats } from '../handlers/queue'

const admin = new Hono<{ Bindings: Env }>()

// 队列管理路由
admin.get('/queue/stats', async (c) => {
  return await handleQueueStats(c.req.raw, c.env)
})

admin.post('/queue/add', async (c) => {
  return await handleAddToQueue(c.req.raw, c.env)
})

// ==================== 数据库管理 API ====================

// 获取游戏列表（分页）
admin.get('/games', async (c) => {
  try {
    const page = Number.parseInt(c.req.query('page') || '1')
    const limit = Number.parseInt(c.req.query('limit') || '20')
    const search = c.req.query('search') || ''
    const offset = (page - 1) * limit

    let query = `
      SELECT title_id, formal_name, name_zh, publisher_name, 
             release_date, genre, price, created_at, updated_at
      FROM games 
    `
    let countQuery = 'SELECT COUNT(*) as count FROM games'
    const params: any[] = []

    // 搜索功能
    if (search) {
      const searchCondition = ` WHERE (formal_name LIKE ? OR name_zh LIKE ? OR title_id LIKE ?)`
      query += searchCondition
      countQuery += searchCondition
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const [games, totalResult] = await Promise.all([
      c.env.DB.prepare(query).bind(...params).all(),
      c.env.DB.prepare(countQuery).bind(...(search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [])).first(),
    ])

    const total = (totalResult as any)?.count || 0

    return c.json({
      success: true,
      data: games.results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    console.error('❌ 获取游戏列表失败:', error)
    return c.json({
      success: false,
      error: '获取游戏列表失败',
    }, 500)
  }
})

// 获取单个游戏详情
admin.get('/games/:titleId', async (c) => {
  try {
    const titleId = c.req.param('titleId')

    const game = await c.env.DB.prepare(`
      SELECT * FROM games WHERE title_id = ?
    `).bind(titleId).first()

    if (!game) {
      return c.json({
        success: false,
        error: '游戏不存在',
      }, 404)
    }

    return c.json({
      success: true,
      data: game,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    console.error('❌ 获取游戏详情失败:', error)
    return c.json({
      success: false,
      error: '获取游戏详情失败',
    }, 500)
  }
})

// 更新游戏信息
admin.put('/games/:titleId', async (c) => {
  try {
    const titleId = c.req.param('titleId')
    const body = await c.req.json()

    // 允许更新的字段
    const allowedFields = [
      'formal_name',
      'name_zh',
      'name_en',
      'name_ja',
      'description',
      'publisher_name',
      'genre',
      'release_date',
      'price',
      'is_free',
      'in_app_purchase',
      'rating_age',
      'rating_name',
    ]

    const updateFields: string[] = []
    const updateValues: any[] = []

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = ?`)
        updateValues.push(body[field])
      }
    }

    if (updateFields.length === 0) {
      return c.json({
        success: false,
        error: '没有提供有效的更新字段',
      }, 400)
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP')
    updateValues.push(titleId)

    const query = `
      UPDATE games 
      SET ${updateFields.join(', ')} 
      WHERE title_id = ?
    `

    const result = await c.env.DB.prepare(query).bind(...updateValues).run()

    if (!result.success || result.meta.changes === 0) {
      return c.json({
        success: false,
        error: '游戏不存在或更新失败',
      }, 404)
    }

    return c.json({
      success: true,
      message: '游戏信息更新成功',
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    console.error('❌ 更新游戏信息失败:', error)
    return c.json({
      success: false,
      error: '更新游戏信息失败',
    }, 500)
  }
})

// 删除游戏
admin.delete('/games/:titleId', async (c) => {
  try {
    const titleId = c.req.param('titleId')

    const result = await c.env.DB.prepare(`
      DELETE FROM games WHERE title_id = ?
    `).bind(titleId).run()

    if (!result.success || result.meta.changes === 0) {
      return c.json({
        success: false,
        error: '游戏不存在',
      }, 404)
    }

    return c.json({
      success: true,
      message: '游戏删除成功',
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    console.error('❌ 删除游戏失败:', error)
    return c.json({
      success: false,
      error: '删除游戏失败',
    }, 500)
  }
})

// 批量删除游戏
admin.post('/games/batch-delete', async (c) => {
  try {
    const { titleIds } = await c.req.json()

    if (!Array.isArray(titleIds) || titleIds.length === 0) {
      return c.json({
        success: false,
        error: '请提供有效的游戏ID数组',
      }, 400)
    }

    const placeholders = titleIds.map(() => '?').join(',')
    const result = await c.env.DB.prepare(`
      DELETE FROM games WHERE title_id IN (${placeholders})
    `).bind(...titleIds).run()

    return c.json({
      success: true,
      message: `成功删除 ${result.meta.changes} 个游戏`,
      deletedCount: result.meta.changes,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    console.error('❌ 批量删除游戏失败:', error)
    return c.json({
      success: false,
      error: '批量删除游戏失败',
    }, 500)
  }
})

// ==================== KV 管理 API ====================

// 获取 KV 键列表
admin.get('/kv/keys', async (c) => {
  try {
    const prefix = c.req.query('prefix') || ''
    const limit = Number.parseInt(c.req.query('limit') || '100')
    const cursor = c.req.query('cursor')

    // 根据前缀选择不同的 KV 命名空间
    let namespace: KVNamespace
    if (prefix.startsWith('cache:') || prefix.startsWith('db:')) {
      namespace = c.env.CACHE
    }
    else {
      namespace = c.env.GAME_IDS
    }

    const listOptions: any = { limit }
    if (prefix)
      listOptions.prefix = prefix
    if (cursor)
      listOptions.cursor = cursor

    const keys = await namespace.list(listOptions)

    return c.json({
      success: true,
      data: {
        keys: keys.keys,
        listComplete: keys.list_complete,
        cursor: keys.list_complete ? null : keys.keys[keys.keys.length - 1]?.name,
      },
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    console.error('❌ 获取 KV 键列表失败:', error)
    return c.json({
      success: false,
      error: '获取 KV 键列表失败',
    }, 500)
  }
})

// 获取 KV 值
admin.get('/kv/value/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const namespace = c.req.query('namespace') || 'game_ids'

    let kvNamespace: KVNamespace
    if (namespace === 'cache') {
      kvNamespace = c.env.CACHE
    }
    else {
      kvNamespace = c.env.GAME_IDS
    }

    const value = await kvNamespace.get(key)

    if (value === null) {
      return c.json({
        success: false,
        error: '键不存在',
      }, 404)
    }

    // 尝试解析 JSON
    let parsedValue
    try {
      parsedValue = JSON.parse(value)
    }
    catch {
      parsedValue = value
    }

    return c.json({
      success: true,
      data: {
        key,
        value: parsedValue,
        rawValue: value,
      },
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    console.error('❌ 获取 KV 值失败:', error)
    return c.json({
      success: false,
      error: '获取 KV 值失败',
    }, 500)
  }
})

// 设置 KV 值
admin.put('/kv/value/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const { value, namespace = 'game_ids', ttl } = await c.req.json()

    let kvNamespace: KVNamespace
    if (namespace === 'cache') {
      kvNamespace = c.env.CACHE
    }
    else {
      kvNamespace = c.env.GAME_IDS
    }

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    const options: any = {}
    if (ttl)
      options.expirationTtl = ttl

    await kvNamespace.put(key, stringValue, options)

    return c.json({
      success: true,
      message: 'KV 值设置成功',
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    console.error('❌ 设置 KV 值失败:', error)
    return c.json({
      success: false,
      error: '设置 KV 值失败',
    }, 500)
  }
})

// 删除 KV 键
admin.delete('/kv/value/:key', async (c) => {
  try {
    const key = c.req.param('key')
    const namespace = c.req.query('namespace') || 'game_ids'

    let kvNamespace: KVNamespace
    if (namespace === 'cache') {
      kvNamespace = c.env.CACHE
    }
    else {
      kvNamespace = c.env.GAME_IDS
    }

    await kvNamespace.delete(key)

    return c.json({
      success: true,
      message: 'KV 键删除成功',
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    console.error('❌ 删除 KV 键失败:', error)
    return c.json({
      success: false,
      error: '删除 KV 键失败',
    }, 500)
  }
})

// 批量删除 KV 键
admin.post('/kv/batch-delete', async (c) => {
  try {
    const { keys, namespace = 'game_ids' } = await c.req.json()

    if (!Array.isArray(keys) || keys.length === 0) {
      return c.json({
        success: false,
        error: '请提供有效的键数组',
      }, 400)
    }

    let kvNamespace: KVNamespace
    if (namespace === 'cache') {
      kvNamespace = c.env.CACHE
    }
    else {
      kvNamespace = c.env.GAME_IDS
    }

    const deletePromises = keys.map(key => kvNamespace.delete(key))
    await Promise.all(deletePromises)

    return c.json({
      success: true,
      message: `成功删除 ${keys.length} 个 KV 键`,
      deletedCount: keys.length,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    console.error('❌ 批量删除 KV 键失败:', error)
    return c.json({
      success: false,
      error: '批量删除 KV 键失败',
    }, 500)
  }
})

// 清理过期的队列项
admin.post('/kv/cleanup', async (c) => {
  try {
    const { olderThanHours = 24 } = await c.req.json()
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000)

    // 获取所有 pending 键
    const keys = await c.env.GAME_IDS.list({ prefix: 'pending:' })
    let cleanedCount = 0

    for (const keyInfo of keys.keys) {
      const value = await c.env.GAME_IDS.get(keyInfo.name)
      if (value) {
        try {
          const data = JSON.parse(value)
          if (data.addedAt && data.addedAt < cutoffTime) {
            await c.env.GAME_IDS.delete(keyInfo.name)
            cleanedCount++
          }
        }
        catch {
          // 如果解析失败，删除这个无效的键
          await c.env.GAME_IDS.delete(keyInfo.name)
          cleanedCount++
        }
      }
    }

    return c.json({
      success: true,
      message: `清理完成，删除了 ${cleanedCount} 个过期项`,
      cleanedCount,
      timestamp: new Date().toISOString(),
    })
  }
  catch (error) {
    console.error('❌ 清理 KV 失败:', error)
    return c.json({
      success: false,
      error: '清理 KV 失败',
    }, 500)
  }
})

export { admin as adminRoutes }
