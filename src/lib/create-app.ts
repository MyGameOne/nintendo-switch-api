import type { Env, Variables } from '../types'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { etag } from 'hono/etag'
import { prettyJSON } from 'hono/pretty-json'
import { notFound, onError, serveEmojiFavicon } from 'stoker/middlewares'
import { defaultHook } from 'stoker/openapi'

import { rateLimit, securityHeaders } from '../middleware/security'

export function createRouter() {
  return new OpenAPIHono<{ Bindings: Env, Variables: Variables }>({
    strict: false,
    defaultHook,
  })
}

export default function createApp() {
  const app = createRouter()

  // 1. 任天堂 Switch 图标
  app.use('*', serveEmojiFavicon('🎮'))

  // 2. 安全头中间件
  app.use('*', securityHeaders())

  // 3. CORS 中间件
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24小时
  }))

  // 4. 请求限制中间件（针对不同路径设置不同限制）
  app.use('/api/auth/*', rateLimit({ windowMs: 60 * 1000, max: 10 })) // 认证接口：每分钟10次
  app.use('/api/games', rateLimit({ windowMs: 60 * 1000, max: 30 })) // 游戏接口：每分钟30次
  app.use('/api/user', rateLimit({ windowMs: 60 * 1000, max: 20 })) // 用户接口：每分钟20次
  app.use('*', rateLimit({ windowMs: 60 * 1000, max: 100 })) // 其他接口：每分钟100次

  // 5. ETag 中间件（用于缓存）
  app.use('/api/stats', etag())
  app.use('/api/data/*', etag())

  // 6. 美化 JSON 输出（仅在开发环境）
  app.use('*', prettyJSON())

  // 使用 stoker 的统一错误处理
  app.notFound(notFound)
  app.onError(onError)

  return app
}
