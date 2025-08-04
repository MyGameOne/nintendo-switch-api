import type { Env } from '../types'
import { Hono } from 'hono'

const data = new Hono<{ Bindings: Env }>()

// 获取所有游戏数据
data.get('/games', async (c) => {
  try {
    // 添加可选的限制参数，防止数据过大
    const limitParam = c.req.query('limit')
    const limit = limitParam ? Math.min(Number.parseInt(limitParam), 10000) : 10000 // 最大10000条

    const result = await c.env.DB.prepare(`
      SELECT * FROM games 
      ORDER BY updated_at DESC
      LIMIT ?
    `).bind(limit).all()

    return c.json({
      success: true,
      data: result.results,
      count: result.results?.length || 0,
      limit,
      timestamp: new Date().toISOString(),
    }, 200, {
      'Content-Type': 'application/json; charset=utf-8',
    })
  }
  catch (error) {
    console.error('❌ 获取所有游戏数据失败:', error)
    return c.json({
      success: false,
      error: '获取游戏数据失败',
      timestamp: new Date().toISOString(),
    }, 500, {
      'Content-Type': 'application/json; charset=utf-8',
    })
  }
})

// 根据游戏ID查询单个游戏
data.get('/games/:titleId', async (c) => {
  try {
    const titleId = c.req.param('titleId')

    if (!titleId) {
      return c.json({
        success: false,
        error: '游戏ID是必需的',
        timestamp: new Date().toISOString(),
      }, 400, {
        'Content-Type': 'application/json; charset=utf-8',
      })
    }

    const result = await c.env.DB.prepare(`
      SELECT * FROM games WHERE title_id = ?
    `).bind(titleId).first()

    if (!result) {
      return c.json({
        success: false,
        error: '游戏不存在',
        timestamp: new Date().toISOString(),
      }, 404, {
        'Content-Type': 'application/json; charset=utf-8',
      })
    }

    return c.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }, 200, {
      'Content-Type': 'application/json; charset=utf-8',
    })
  }
  catch (error) {
    console.error('❌ 根据ID查询游戏失败:', error)
    return c.json({
      success: false,
      error: '查询游戏失败',
      timestamp: new Date().toISOString(),
    }, 500, {
      'Content-Type': 'application/json; charset=utf-8',
    })
  }
})

// 根据游戏名称模糊查询
data.get('/games/search/:name', async (c) => {
  try {
    const name = c.req.param('name')

    if (!name) {
      return c.json({
        success: false,
        error: '游戏名称是必需的',
        timestamp: new Date().toISOString(),
      }, 400, {
        'Content-Type': 'application/json; charset=utf-8',
      })
    }

    // 解码URL参数
    const decodedName = decodeURIComponent(name)
    const searchPattern = `%${decodedName}%`

    // 添加限制，防止返回过多结果
    const limitParam = c.req.query('limit')
    const limit = limitParam ? Math.min(Number.parseInt(limitParam), 1000) : 100 // 默认100条，最大1000条

    const result = await c.env.DB.prepare(`
      SELECT * FROM games 
      WHERE formal_name LIKE ? 
         OR name_zh_hant LIKE ? 
         OR name_zh_hans LIKE ? 
         OR name_en LIKE ? 
         OR name_ja LIKE ?
      ORDER BY 
        CASE 
          WHEN formal_name = ? THEN 1
          WHEN name_zh_hant = ? THEN 2
          WHEN name_zh_hans = ? THEN 3
          WHEN name_en = ? THEN 4
          WHEN name_ja = ? THEN 5
          ELSE 6
        END,
        updated_at DESC
      LIMIT ?
    `).bind(
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      decodedName,
      decodedName,
      decodedName,
      decodedName,
      decodedName,
      limit,
    ).all()

    return c.json({
      success: true,
      data: result.results,
      count: result.results?.length || 0,
      query: decodedName,
      limit,
      timestamp: new Date().toISOString(),
    }, 200, {
      'Content-Type': 'application/json; charset=utf-8',
    })
  }
  catch (error) {
    console.error('❌ 根据名称搜索游戏失败:', error)
    return c.json({
      success: false,
      error: '搜索游戏失败',
      timestamp: new Date().toISOString(),
    }, 500, {
      'Content-Type': 'application/json; charset=utf-8',
    })
  }
})

// 高级搜索接口（支持多个查询参数）
data.get('/games/search', async (c) => {
  try {
    const name = c.req.query('name')
    const publisher = c.req.query('publisher')
    const genre = c.req.query('genre')
    const platform = c.req.query('platform')
    const region = c.req.query('region')
    const dataSource = c.req.query('data_source')

    const conditions: string[] = []
    const params: any[] = []

    if (name) {
      conditions.push(`(
        formal_name LIKE ? OR 
        name_zh_hant LIKE ? OR 
        name_zh_hans LIKE ? OR 
        name_en LIKE ? OR 
        name_ja LIKE ?
      )`)
      const namePattern = `%${name}%`
      params.push(namePattern, namePattern, namePattern, namePattern, namePattern)
    }

    if (publisher) {
      conditions.push('publisher_name LIKE ?')
      params.push(`%${publisher}%`)
    }

    if (genre) {
      conditions.push('genre LIKE ?')
      params.push(`%${genre}%`)
    }

    if (platform) {
      conditions.push('platform = ?')
      params.push(platform)
    }

    if (region) {
      conditions.push('region = ?')
      params.push(region)
    }

    if (dataSource) {
      conditions.push('data_source = ?')
      params.push(dataSource)
    }

    // 添加限制
    const limitParam = c.req.query('limit')
    const limit = limitParam ? Math.min(Number.parseInt(limitParam), 1000) : 100 // 默认100条，最大1000条

    let sql = 'SELECT * FROM games'
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`
    }
    sql += ' ORDER BY updated_at DESC LIMIT ?'

    params.push(limit)
    const result = await c.env.DB.prepare(sql).bind(...params).all()

    return c.json({
      success: true,
      data: result.results,
      count: result.results?.length || 0,
      limit,
      filters: {
        name,
        publisher,
        genre,
        platform,
        region,
        data_source: dataSource,
      },
      timestamp: new Date().toISOString(),
    }, 200, {
      'Content-Type': 'application/json; charset=utf-8',
    })
  }
  catch (error) {
    console.error('❌ 高级搜索失败:', error)
    return c.json({
      success: false,
      error: '搜索失败',
      timestamp: new Date().toISOString(),
    }, 500, {
      'Content-Type': 'application/json; charset=utf-8',
    })
  }
})

export { data as dataRoutes }
