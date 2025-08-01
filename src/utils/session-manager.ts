import type { SessionState } from '../types'
import { SessionError } from '../types'

export class SessionManager {
  private static readonly SESSION_MAX_AGE = 10 * 60 * 1000 // 10分钟

  /**
   * 编码会话状态到 Base64 字符串
   */
  static encodeSessionState(sessionState: SessionState): string {
    try {
      const jsonString = JSON.stringify(sessionState)
      return btoa(jsonString)
    }
    catch (error) {
      throw new SessionError('会话状态编码失败')
    }
  }

  /**
   * 从 Base64 字符串解码会话状态
   */
  static decodeSessionState(encodedState: string): SessionState {
    try {
      const jsonString = atob(encodedState)
      const sessionState = JSON.parse(jsonString) as SessionState

      // 验证必需字段
      if (!sessionState.sessionId || !sessionState.codeVerifier || !sessionState.timestamp) {
        throw new SessionError('会话状态格式无效')
      }

      return sessionState
    }
    catch (error) {
      if (error instanceof SessionError) {
        throw error
      }
      throw new SessionError('会话状态解码失败')
    }
  }

  /**
   * 验证会话状态是否有效
   */
  static validateSessionState(sessionState: SessionState): void {
    const now = Date.now()
    const age = now - sessionState.timestamp

    if (age > this.SESSION_MAX_AGE) {
      throw new SessionError(`认证会话已过期（${Math.round(age / 1000)}秒前创建）`)
    }

    if (age < 0) {
      throw new SessionError('会话时间戳无效')
    }
  }

  /**
   * 创建新的会话状态
   */
  static async createSessionState(): Promise<SessionState> {
    const sessionId = crypto.randomUUID()
    const codeVerifier = await this.generateCodeVerifier()

    return {
      sessionId,
      codeVerifier,
      timestamp: Date.now(),
    }
  }

  /**
   * 生成 PKCE code_verifier
   */
  private static async generateCodeVerifier(): Promise<string> {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  /**
   * 生成 PKCE code_challenge
   */
  static async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }
}
