import { createRoute } from '@hono/zod-openapi'
import { z } from 'zod'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { successResponseSchema, commonErrorResponses, createValidationErrorResponse } from '../lib/error-schemas'
import { createRouter } from '../lib/create-app'
import { handleAuthCallback, handleAuthUrl } from '../handlers/nintendo'

const auth = createRouter()

const tags = ['认证']

// 认证 URL 响应模式
const authUrlDataSchema = z.object({
  authUrl: z.string().url().describe('Nintendo 认证 URL'),
  sessionId: z.string().describe('会话 ID'),
  instructions: z.array(z.string()).describe('认证操作指导'),
})

// 获取认证 URL 的 OpenAPI 路由
const authUrlRoute = createRoute({
  method: 'post',
  path: '/url',
  tags,
  summary: '获取认证 URL',
  description: '生成 Nintendo 账户认证 URL，sessionId 自动生成',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      successResponseSchema(authUrlDataSchema),
      '认证 URL 生成成功',
    ),
    ...commonErrorResponses.internalServerError,
  },
})

// 认证回调请求模式
const callbackRequestSchema = z.object({
  callbackUrl: z.string().url('回调 URL 格式不正确').describe('Nintendo 认证回调 URL'),
})

// 认证回调响应模式
const callbackDataSchema = z.object({
  sessionToken: z.string().describe('会话令牌'),
})

// 认证回调的 OpenAPI 路由
const authCallbackRoute = createRoute({
  method: 'post',
  path: '/callback',
  tags,
  summary: '处理认证回调',
  description: '处理 Nintendo 账户认证回调，获取会话令牌',
  request: {
    body: jsonContentRequired(callbackRequestSchema, '认证回调数据'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      successResponseSchema(callbackDataSchema),
      '认证成功',
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        success: z.literal(false),
        data: z.null(),
        error: z.string(),
        message: z.string().optional(),
      }),
      '认证失败',
    ),
    ...createValidationErrorResponse(callbackRequestSchema),
  },
})

// 注册路由
auth.openapi(authUrlRoute, handleAuthUrl)
auth.openapi(authCallbackRoute, handleAuthCallback)

export { auth as authRoutes }
export type AuthUrlRoute = typeof authUrlRoute
export type AuthCallbackRoute = typeof authCallbackRoute
