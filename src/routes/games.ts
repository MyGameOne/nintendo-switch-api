import type { Env } from '../types'
import { Hono } from 'hono'
import { handleGameRecords } from '../handlers/games'

const games = new Hono<{ Bindings: Env }>()

games.post('/', async (c) => {
  return await handleGameRecords(c.req.raw, c.env)
})

export { games as gameRoutes }
