/* eslint-disable ts/explicit-function-return-type */
import type { Context } from 'hono'
import type { ApiResponse, Env, PaginationMeta, Variables } from '../types'

/**
 * 创建错误响应数据
 */
export function createErrorData(
  c: Context<{ Bindings: Env, Variables: Variables }>,
  error: string,
  options: {
    message?: string
    meta?: Record<string, any>
  } = {},
): ApiResponse<null> {
  const { message, meta } = options

  return {
    success: false,
    data: null,
    error,
    message,
    timestamp: new Date().toISOString(),
    meta,
  }
}

/**
 * 创建标准化的成功响应
 * 简化版本，移除冗余字段
 */
export function createStandardSuccessResponse<T, M extends Record<string, any> = object>(
  c: Context<{ Bindings: Env, Variables: Variables }>,
  data: T,
  message?: string,
  meta?: M,
) {
  const response: any = {
    success: true as const,
    data,
  }

  if (message) {
    response.message = message
  }

  if (meta && Object.keys(meta).length > 0) {
    response.meta = meta
  }

  return c.json(response, 200)
}

/**
 * 创建标准化的错误响应
 * 简化版本，移除冗余字段
 */
export function createStandardErrorResponse(
  c: Context<{ Bindings: Env, Variables: Variables }>,
  error: string,
  message?: string,
  status: 400 | 401 | 404 | 422 | 500 = 400,
) {
  const response: any = {
    success: false as const,
    data: null,
    error,
  }

  if (message) {
    response.message = message
  }

  return c.json(response, status)
}

/**
 * 创建符合 stoker 模式的错误响应
 * 用于与 OpenAPI 路由定义兼容
 */
export function createStokerErrorResponse(
  c: Context<{ Bindings: Env, Variables: Variables }>,
  error: string,
  message?: string,
  status: 400 | 401 | 404 | 422 | 500 = 400,
) {
  return c.json({
    success: false as const,
    data: null,
    error,
    message,
    timestamp: new Date().toISOString(),
  }, status)
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  c: Context<{ Bindings: Env, Variables: Variables }>,
  error: string,
  options?: {
    message?: string
    status?: number
    details?: any
  },
): Response {
  const status = options?.status || 500
  const errorData = createErrorData(c, error, {
    message: options?.message,
    meta: options?.details ? { details: options.details } : undefined,
  })
  return c.json(errorData, status as any)
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(
  c: Context<{ Bindings: Env, Variables: Variables }>,
  errors: Array<{ field: string, message: string, code: string }>,
): Response {
  return createErrorResponse(c, 'Validation Error', {
    message: '请求参数验证失败',
    status: 400,
    details: { validationErrors: errors },
  })
}

/**
 * 创建分页元数据
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

/**
 * 包装异步处理器，统一错误处理
 */
export function withErrorHandling<T extends any[]>(
  handler: (c: Context<{ Bindings: Env, Variables: Variables }>, ...args: T) => Promise<Response>,
) {
  return async (c: Context<{ Bindings: Env, Variables: Variables }>, ...args: T): Promise<Response> => {
    try {
      return await handler(c, ...args)
    }
    catch (error) {
      console.error(`❌  处理器错误:`, error)

      // 根据错误类型返回不同的响应
      if (error instanceof Error) {
        if (error.name === 'NintendoAPIError') {
          return createErrorResponse(c, 'Nintendo API Error', {
            message: error.message,
            status: 502,
          })
        }
        else if (error.name === 'SessionError') {
          return createErrorResponse(c, 'Session Error', {
            message: error.message,
            status: 401,
          })
        }
        else if (error.name === 'ValidationError') {
          return createErrorResponse(c, 'Validation Error', {
            message: error.message,
            status: 400,
          })
        }
      }

      return createErrorResponse(c, 'Internal Server Error', {
        message: error instanceof Error ? error.message : '服务器内部错误',
        status: 500,
      })
    }
  }
}
