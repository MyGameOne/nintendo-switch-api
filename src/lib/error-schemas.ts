import { z } from 'zod'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { createErrorSchema } from 'stoker/openapi/schemas'

// 基础响应模式
export const baseResponseSchema = z.object({
  success: z.boolean(),
})

// 成功响应模式
export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  baseResponseSchema.extend({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })

// 错误响应模式
export const errorResponseSchema = baseResponseSchema.extend({
  success: z.literal(false),
  data: z.null(),
  error: z.string(),
  message: z.string().optional(),
})

// 创建标准错误响应
export const createErrorResponse = (
  statusCode: number,
  description: string,
) => ({
  [statusCode]: jsonContent(errorResponseSchema, description),
})

// 创建验证错误响应
export const createValidationErrorResponse = <T extends z.ZodTypeAny>(schema: T) => ({
  [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
    createErrorSchema(schema),
    '验证错误',
  ),
})

// 常用错误响应
export const commonErrorResponses = {
  notFound: createErrorResponse(HttpStatusCodes.NOT_FOUND, '资源未找到'),
  unauthorized: createErrorResponse(HttpStatusCodes.UNAUTHORIZED, '未授权'),
  forbidden: createErrorResponse(HttpStatusCodes.FORBIDDEN, '禁止访问'),
  internalServerError: createErrorResponse(HttpStatusCodes.INTERNAL_SERVER_ERROR, '内部服务器错误'),
}