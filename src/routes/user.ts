import { createRoute } from '@hono/zod-openapi'
import { z } from 'zod'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { successResponseSchema, commonErrorResponses, createValidationErrorResponse } from '../lib/error-schemas'
import { createRouter } from '../lib/create-app'
import { handleUserInfo } from '../handlers/nintendo'

const user = createRouter()

const tags = ['用户']

// 会话令牌请求模式
const sessionTokenSchema = z.object({
  sessionToken: z.string().min(1, '会话令牌不能为空').describe('Nintendo Switch 会话令牌'),
})

// 用户信息响应模式
const userInfoSchema = z.object({
  id: z.string().describe('用户ID'),
  nickname: z.string().describe('用户昵称'),
  imageUri: z.string().optional().describe('用户头像URL'),
})

// 获取用户信息的 OpenAPI 路由
const userInfoRoute = createRoute({
  method: 'post',
  path: '/',
  tags,
  summary: '获取用户信息',
  description: '获取 Nintendo 账户用户信息，包括用户ID、昵称和头像',
  request: {
    body: jsonContentRequired(sessionTokenSchema, '会话令牌'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      successResponseSchema(userInfoSchema),
      '用户信息获取成功',
    ),
    ...commonErrorResponses.unauthorized,
    ...createValidationErrorResponse(sessionTokenSchema),
  },
})

// 注册路由
user.openapi(userInfoRoute, handleUserInfo)

export { user as userRoutes }
export type UserInfoRoute = typeof userInfoRoute
