import type { AuthResponse, CallbackResponse, Env } from '../types'
import { NintendoSwitchService } from '../services/nintendo-service'
import { NintendoAPIError, SessionError } from '../types'

/**
 * 处理认证 URL 生成请求
 */
export async function handleAuthUrl(request: Request, env: Env): Promise<Response> {
  try {
    console.log('📥 收到认证 URL 生成请求')

    const nintendoService = new NintendoSwitchService()
    const { authUrl, sessionId } = await nintendoService.generateAuthUrl()

    const response: AuthResponse = {
      success: true,
      authUrl,
      sessionId,
      instructions: nintendoService.getAuthInstructions(),
    }

    console.log('✅ 认证 URL 生成成功')
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    console.error('❌ 生成认证 URL 失败:', error)

    let errorMessage = '生成认证 URL 失败'
    if (error instanceof NintendoAPIError) {
      errorMessage = error.message
    }

    const response: AuthResponse = {
      success: false,
      error: errorMessage,
    }

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * 处理认证回调请求
 */
export async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
  try {
    console.log('📥 收到认证回调请求')

    // 验证请求方法
    if (request.method !== 'POST') {
      console.log('❌ 请求方法错误:', request.method)
      return new Response(JSON.stringify({
        success: false,
        error: '请求方法必须是 POST',
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 验证 Content-Type
    const contentType = request.headers.get('Content-Type')
    if (!contentType || !contentType.includes('application/json')) {
      console.log('❌ Content-Type 错误:', contentType)
      return new Response(JSON.stringify({
        success: false,
        error: 'Content-Type 必须是 application/json',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 解析请求体
    let requestBody: { callbackUrl?: string }
    try {
      requestBody = await request.json() as { callbackUrl?: string }
    }
    catch (parseError) {
      console.error('❌ JSON 解析失败:', parseError)
      return new Response(JSON.stringify({
        success: false,
        error: 'JSON 格式错误',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const callbackUrl = requestBody.callbackUrl

    if (!callbackUrl || typeof callbackUrl !== 'string') {
      console.log('❌ callbackUrl 字段缺失或格式错误')
      return new Response(JSON.stringify({
        success: false,
        error: 'callbackUrl 字段是必需的，且必须是字符串',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 基础格式验证
    if (!NintendoSwitchService.isValidCallbackUrl(callbackUrl)) {
      console.log('❌ 回调 URL 格式验证失败')
      return new Response(JSON.stringify({
        success: false,
        error: '回调 URL 格式错误',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('🔄 开始处理认证回调...')
    const nintendoService = new NintendoSwitchService()
    const sessionToken = await nintendoService.handleAuthCallback(callbackUrl)

    const response: CallbackResponse = {
      success: true,
      sessionToken,
    }

    console.log('✅ 认证回调处理成功')
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    console.error('❌ 处理认证回调失败:', error)

    let errorMessage = '认证失败'
    let statusCode = 400

    if (error instanceof SessionError) {
      errorMessage = error.message
      statusCode = 400
    }
    else if (error instanceof NintendoAPIError) {
      errorMessage = error.message
      statusCode = error.statusCode || 500
    }
    else if (error instanceof Error) {
      errorMessage = error.message
    }

    const response: CallbackResponse = {
      success: false,
      error: errorMessage,
    }

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
