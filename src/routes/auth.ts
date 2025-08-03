import type { Env } from '../types'
import { Hono } from 'hono'
import { handleAuthCallback, handleAuthUrl } from '../handlers/auth'

const auth = new Hono<{ Bindings: Env }>()

auth.post('/url', async (c) => {
  return await handleAuthUrl(c.req.raw, c.env)
})

auth.post('/callback', async (c) => {
  return await handleAuthCallback(c.req.raw, c.env)
})

export { auth as authRoutes }
