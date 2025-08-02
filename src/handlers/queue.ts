import type { Env, QueueStatsResponse } from '../types'
import { KVService } from '../services/kv-service'

/**
 * 获取队列统计信息
 */
export async function handleQueueStats(request: Request, env: Env): Promise<Response> {
  try {
    console.log('📊 获取队列统计信息...')

    // 验证请求方法
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({
        success: false,
        error: '请求方法必须是 GET',
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const kvService = new KVService(env)

    // 获取队列统计
    const queueStats = await kvService.getQueueStats()

    // 获取部分待处理游戏 ID (最多显示 20 个)
    const pendingGames = await kvService.getPendingGameIds(20)

    const response: QueueStatsResponse = {
      success: true,
      stats: {
        pendingCount: queueStats.pendingCount,
        pendingGames,
      },
    }

    console.log(`✅ 队列统计获取成功: ${queueStats.pendingCount} 个待处理游戏`)

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    console.error('❌ 获取队列统计失败:', error)

    const response: QueueStatsResponse = {
      success: false,
      error: '获取队列统计失败',
    }

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * 手动添加游戏 ID 到队列
 */
export async function handleAddToQueue(request: Request, env: Env): Promise<Response> {
  try {
    console.log('📝 收到手动添加游戏 ID 请求')

    // 验证请求方法
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: '请求方法必须是 POST',
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 解析请求体
    let requestBody: { titleIds?: string | string[] }
    try {
      requestBody = await request.json() as { titleIds?: string | string[] }
    }
    catch (parseError) {
      console.error('❌ JSON 解析失败:', parseError)
      return new Response(JSON.stringify({
        success: false,
        error: 'JSON 格式错误',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { titleIds } = requestBody

    if (!titleIds) {
      return new Response(JSON.stringify({
        success: false,
        error: '缺少 titleIds 参数',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 标准化为数组
    const titleIdArray = Array.isArray(titleIds) ? titleIds : [titleIds]

    // 验证游戏 ID 格式 (16位十六进制)
    const validTitleIds = titleIdArray.filter(id =>
      typeof id === 'string' && /^[0-9a-fA-F]{16}$/i.test(id),
    )

    if (validTitleIds.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: '没有有效的游戏 ID (需要16位十六进制格式)',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const kvService = new KVService(env)
    await kvService.addMultipleToQueue(validTitleIds, 'manual')

    console.log(`✅ 手动添加 ${validTitleIds.length} 个游戏 ID 到队列`)

    return new Response(JSON.stringify({
      success: true,
      message: `成功添加 ${validTitleIds.length} 个游戏 ID 到队列`,
      addedIds: validTitleIds,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    console.error('❌ 手动添加游戏 ID 失败:', error)

    return new Response(JSON.stringify({
      success: false,
      error: '添加游戏 ID 失败',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}