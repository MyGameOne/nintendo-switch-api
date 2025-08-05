import type { Context, Next } from 'hono'
import type { Env, Variables } from '../types'

// 自定义日志中间件，适配 Cloudflare Workers
export function logger() {
  return async (c: Context<{ Bindings: Env, Variables: Variables }>, next: Next) => {
    const start = Date.now()
    const method = c.req.method
    const url = c.req.url
    const userAgent = c.req.header('User-Agent') || 'Unknown'
    const requestId = c.get('requestId') || 'unknown'

    // 记录请求开始
    console.log(`🚀 [${requestId}] ${method} ${url} - Start`)

    await next()

    const end = Date.now()
    const status = c.res.status
    const duration = end - start

    // 根据状态码选择日志级别
    const logLevel = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅'

    console.log(
      `${logLevel} [${requestId}] ${method} ${url} - ${status} (${duration}ms) - ${userAgent}`,
    )

    // 如果是错误状态，记录更多信息
    if (status >= 400) {
      console.log(`📝 [${requestId}] Response headers:`, Object.fromEntries(c.res.headers.entries()))
    }
  }
}
