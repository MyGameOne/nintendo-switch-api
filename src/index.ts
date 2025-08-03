import type { Env } from './types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { timing } from 'hono/timing'
import { authRoutes } from './routes/auth'
import { gameRoutes } from './routes/games'
import { healthRoutes } from './routes/health'
import { statsRoutes } from './routes/stats'
import { userRoutes } from './routes/user'

// 创建 Hono 应用实例
const app = new Hono<{ Bindings: Env }>()

// 添加 CORS 和性能监控中间件
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24小时
}))

app.use('*', timing())

// 添加性能指标头中间件
app.use('*', async (c, next) => {
  const startTime = Date.now()
  await next()
  const duration = Date.now() - startTime
  c.res.headers.set('X-Response-Time', `${duration}ms`)
  c.res.headers.set('X-Timestamp', new Date().toISOString())
})

// 路由注册
app.route('/health', healthRoutes)
app.route('/api/stats', statsRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/user', userRoutes)
app.route('/api/games', gameRoutes)

// 404 处理
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    availableEndpoints: {
      public: [
        'GET /health',
        'GET /api/stats',
      ],
      auth: [
        'POST /api/auth/url',
        'POST /api/auth/callback',
        'POST /api/user',
        'POST /api/games',
      ],

    },
  }, 404, {
    'Content-Type': 'application/json; charset=utf-8',
  })
})

// 错误处理
app.onError((err, c) => {
  console.error('❌ Worker 全局错误:', err)
  return c.json({
    success: false,
    error: 'Internal Server Error',
    timestamp: new Date().toISOString(),
  }, 500)
})

export default app
