import type { Context, Next } from 'hono'
import type { Env, Variables } from '../types'

// 安全头中间件
export function securityHeaders() {
  return async (c: Context<{ Bindings: Env, Variables: Variables }>, next: Next) => {
    await next()

    // 设置安全相关的 HTTP 头
    c.res.headers.set('X-Content-Type-Options', 'nosniff')
    c.res.headers.set('X-Frame-Options', 'DENY')
    c.res.headers.set('X-XSS-Protection', '1; mode=block')
    c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

    // 对于 API 响应，设置适当的 Content-Security-Policy
    if (c.req.path.startsWith('/api/')) {
      c.res.headers.set('Content-Security-Policy', 'default-src \'none\'; frame-ancestors \'none\';')
    }
  }
}

// 简单的请求限制中间件（基于内存，适合 Workers）
const requestCounts = new Map<string, { count: number, resetTime: number }>()

export function rateLimit(options: {
  windowMs: number
  max: number
  keyGenerator?: (c: Context<{ Bindings: Env, Variables: Variables }>) => string
}) {
  const { windowMs, max, keyGenerator = c => c.req.header('CF-Connecting-IP') || 'unknown' } = options

  return async (c: Context<{ Bindings: Env, Variables: Variables }>, next: Next) => {
    const key = keyGenerator(c)
    const now = Date.now()
    const windowStart = now - windowMs

    // 清理过期的记录
    for (const [k, v] of requestCounts.entries()) {
      if (v.resetTime < windowStart) {
        requestCounts.delete(k)
      }
    }

    const current = requestCounts.get(key)

    if (!current) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs })
    }
    else if (current.resetTime < now) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs })
    }
    else if (current.count >= max) {
      return c.json({
        success: false,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Max ${max} requests per ${windowMs / 1000} seconds.`,
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      }, 429)
    }
    else {
      current.count++
    }

    // 添加速率限制头
    const remaining = Math.max(0, max - (requestCounts.get(key)?.count || 0))
    c.res.headers.set('X-RateLimit-Limit', max.toString())
    c.res.headers.set('X-RateLimit-Remaining', remaining.toString())
    c.res.headers.set('X-RateLimit-Reset', Math.ceil((requestCounts.get(key)?.resetTime || now) / 1000).toString())

    await next()
  }
}
