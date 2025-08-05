import { Scalar } from '@scalar/hono-api-reference'
import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Env, Variables } from '../types'

export default function configureOpenAPI(app: OpenAPIHono<{ Bindings: Env, Variables: Variables }>) {
  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Nintendo Switch API',
      description: '一个用于获取任天堂 Switch 游戏记录的 Cloudflare Workers API',
      contact: {
        name: 'API Support',
        url: 'https://github.com/MyGameOne/nintendo-switch-api',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:8787',
        description: 'Development server',
      },
      {
        url: 'https://nintendo-switch-api.y1149221897.workers.dev/',
        description: 'Production server',
      },
    ],
  })

  app.get('/docs', Scalar({
    url: '/openapi.json',
    theme: 'kepler',
    layout: 'modern',
    defaultHttpClient: {
      targetKey: 'js',
      clientKey: 'fetch',
    },
  }))
}