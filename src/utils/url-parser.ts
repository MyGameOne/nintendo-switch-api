import { SessionError } from '../types'

export interface CallbackParams {
  sessionTokenCode: string
  encodedState: string
}

export class URLParser {
  /**
   * 解析任天堂认证回调 URL
   */
  static parseCallbackUrl(callbackUrl: string): CallbackParams {
    if (!callbackUrl || typeof callbackUrl !== 'string') {
      throw new SessionError('回调 URL 不能为空')
    }

    if (!callbackUrl.startsWith('npf5c38e31cd085304b://auth')) {
      throw new SessionError('回调 URL 格式错误，应该以 npf5c38e31cd085304b://auth 开头')
    }

    let sessionTokenCode: string | null = null
    let encodedState: string | null = null

    try {
      // 处理 fragment 格式: npf5c38e31cd085304b://auth#session_token_code=...&state=...
      if (callbackUrl.includes('#')) {
        const fragmentPart = callbackUrl.split('#')[1]
        if (fragmentPart) {
          const params = new URLSearchParams(fragmentPart)
          sessionTokenCode = params.get('session_token_code')
          encodedState = params.get('state')
        }
      }
      // 处理 query parameter 格式: npf5c38e31cd085304b://auth?session_token_code=...&state=...
      else if (callbackUrl.includes('?')) {
        const url = new URL(callbackUrl)
        sessionTokenCode = url.searchParams.get('session_token_code')
        encodedState = url.searchParams.get('state')
      }
    }
    // eslint-disable-next-line unused-imports/no-unused-vars
    catch (error) {
      throw new SessionError('回调 URL 解析失败')
    }

    if (!sessionTokenCode) {
      throw new SessionError('回调 URL 中未找到 session_token_code 参数')
    }

    if (!encodedState) {
      throw new SessionError('回调 URL 中未找到 state 参数')
    }

    return {
      sessionTokenCode,
      encodedState,
    }
  }

  /**
   * 验证回调 URL 格式
   */
  static isValidCallbackUrl(url: string): boolean {
    try {
      this.parseCallbackUrl(url)
      return true
    }
    catch {
      return false
    }
  }
}
