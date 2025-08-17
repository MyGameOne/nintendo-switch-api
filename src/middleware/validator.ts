import type { Context, Next } from 'hono'
import type { Env, Variables } from '../types'
import { z } from 'zod'
import { createErrorResponse, createValidationErrorResponse } from '../utils/response'

// 通用验证中间件
export function validator<T extends z.ZodSchema>(schema: T, target: 'json' | 'query' | 'param' = 'json') {
  return async (c: Context<{ Bindings: Env, Variables: Variables }>, next: Next) => {
    try {
      let data: unknown

      switch (target) {
        case 'json':
          data = await c.req.json()
          break
        case 'query':
          data = c.req.query()
          break
        case 'param':
          data = c.req.param()
          break
        default:
          data = await c.req.json()
      }

      const result = schema.safeParse(data)

      if (!result.success) {
        console.log(`⚠️ 验证失败:`, {
          target,
          errors: result.error.issues,
          data,
        })

        const validationErrors = result.error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }))

        return createValidationErrorResponse(c, validationErrors)
      }

      // 将验证后的数据存储到上下文中
      c.set('validatedData', result.data)

      await next()
    }
    catch (error) {
      console.error(`❌  验证中间件错误:`, error)

      const message = target === 'json' ? '无效的 JSON 格式' : '参数解析失败'
      return createErrorResponse(c, 'Validation Error', {
        message,
        status: 400,
      })
    }
  }
}

// 常用的验证 Schema
export const CommonSchemas = {
  // 游戏 ID 验证
  titleId: z.string()
    .length(16, '游戏 ID 必须是16位字符')
    .regex(/^[0-9A-F]+$/i, '游戏 ID 必须是十六进制格式'),

  // 会话令牌验证
  sessionToken: z.string()
    .min(1, '会话令牌不能为空')
    .max(1000, '会话令牌过长'),

  // 分页参数验证
  pagination: z.object({
    page: z.string()
      .optional()
      .default('1')
      .transform(val => Math.max(1, Number.parseInt(val) || 1)),
    limit: z.string()
      .optional()
      .default('20')
      .transform(val => Math.min(100, Math.max(1, Number.parseInt(val) || 20))),
  }),

  // 搜索参数验证
  search: z.object({
    q: z.string()
      .min(1, '搜索关键词不能为空')
      .max(100, '搜索关键词过长')
      .optional(),
    genre: z.string().optional(),
    publisher: z.string().optional(),
  }),
}
