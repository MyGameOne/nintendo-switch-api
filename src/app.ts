import configureOpenAPI from './lib/configure-openapi'
import createApp from './lib/create-app'

// 导入路由
import { authRoutes } from './routes/auth'
import { dataRoutes } from './routes/data'
import { gameRoutes } from './routes/games'
import { healthRoutes } from './routes/health'
import { statsRoutes } from './routes/stats'
import { userRoutes } from './routes/user'

const app = createApp()

// 配置 OpenAPI 文档
configureOpenAPI(app)

// 路由注册
const routes = [
  { path: '/health', router: healthRoutes },
  { path: '/api/stats', router: statsRoutes },
  { path: '/api/auth', router: authRoutes },
  { path: '/api/user', router: userRoutes },
  { path: '/api/games', router: gameRoutes },
  { path: '/api/data', router: dataRoutes },
] as const

// 注册所有路由
routes.forEach(({ path, router }) => {
  app.route(path, router)
})

// 导出应用类型，用于 RPC 客户端
export type AppType = typeof routes[number]['router']

export default app