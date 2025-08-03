import type { Env } from '../types'
import { Hono } from 'hono'
import { handleUserInfo } from '../handlers/user'

const user = new Hono<{ Bindings: Env }>()

user.post('/', async (c) => {
  return await handleUserInfo(c.req.raw, c.env)
})

export { user as userRoutes }
