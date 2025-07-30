import type { AccessToken, UserInfo, GameRecord } from '../types';
import { NintendoAPIError } from '../types';
import { SessionManager } from '../utils/session-manager';
import { URLParser } from '../utils/url-parser';

export class NintendoSwitchService {
  private static readonly CLIENT_ID = '5c38e31cd085304b';
  private static readonly USER_AGENT = 'com.nintendo.znej/1.13.0 (Android/7.1.2)';

  private static readonly ENDPOINTS = {
    AUTHORIZE: 'https://accounts.nintendo.com/connect/1.0.0/authorize',
    SESSION_TOKEN: 'https://accounts.nintendo.com/connect/1.0.0/api/session_token',
    ACCESS_TOKEN: 'https://accounts.nintendo.com/connect/1.0.0/api/token',
    USER_INFO: 'https://api.accounts.nintendo.com/2.0.0/users/me',
    GAME_RECORDS: 'https://news-api.entry.nintendo.co.jp/api/v1.2/users/me/play_histories'
  } as const;


  constructor() {
    console.log('🎮 Nintendo Switch 服务初始化完成');
  }

  /**
     * 生成认证 URL
     */
  async generateAuthUrl(): Promise<{ authUrl: string; sessionId: string }> {
    try {
      console.log('🔧 生成认证 URL...');

      // 创建会话状态
      const sessionState = await SessionManager.createSessionState();

      // 生成 code_challenge
      const codeChallenge = await SessionManager.generateCodeChallenge(sessionState.codeVerifier);

      // 编码会话状态
      const encodedState = SessionManager.encodeSessionState(sessionState);

      // 构建认证 URL 参数
      const params = new URLSearchParams({
        state: encodedState,
        redirect_uri: `npf${NintendoSwitchService.CLIENT_ID}://auth`,
        client_id: NintendoSwitchService.CLIENT_ID,
        scope: 'openid user user.mii user.email user.links[].id',
        response_type: 'session_token_code',
        session_token_code_challenge: codeChallenge,
        session_token_code_challenge_method: 'S256',
        theme: 'login_form'
      });

      const authUrl = `${NintendoSwitchService.ENDPOINTS.AUTHORIZE}?${params.toString()}`;

      console.log('✅ 认证 URL 生成成功');
      console.log(`   Session ID: ${sessionState.sessionId}`);
      console.log(`   Code Verifier: ${sessionState.codeVerifier.substring(0, 20)}...`);
      console.log(`   Code Challenge: ${codeChallenge}`);

      return {
        authUrl,
        sessionId: sessionState.sessionId
      };
    } catch (error) {
      console.error('❌ 生成认证 URL 失败:', error);
      throw new NintendoAPIError(
        '生成认证 URL 失败',
        undefined,
        error
      );
    }
  }

  /**
 * 获取认证指导说明
 */
  getAuthInstructions(): string[] {
    return [
      '1. 在新标签页中打开上面的认证链接',
      '2. 使用你的任天堂账户登录',
      '3. 点击"选择此账户"按钮完成授权',
      '4. 页面会显示"此页面的链接无效"或类似信息',
      '5. 复制浏览器地址栏中的完整 URL',
      '6. URL 应该以 "npf5c38e31cd085304b://auth" 开头',
      '7. 将完整的 URL 提交到回调接口'
    ];
  }

  /**
    * 处理认证回调
    */
  async handleAuthCallback(callbackUrl: string): Promise<string> {
    try {
      console.log('🔍 处理认证回调...');
      console.log(`   回调 URL: ${callbackUrl.substring(0, 100)}...`);

      // 解析回调 URL
      const { sessionTokenCode, encodedState } = URLParser.parseCallbackUrl(callbackUrl);

      // 解码并验证会话状态
      const sessionState = SessionManager.decodeSessionState(encodedState);
      SessionManager.validateSessionState(sessionState);

      console.log(`✅ 会话验证成功: ${sessionState.sessionId}`);
      console.log(`   Code Verifier: ${sessionState.codeVerifier.substring(0, 20)}...`);
      console.log(`   Session Token Code: ${sessionTokenCode.substring(0, 50)}...`);

      // 交换 session_token
      const sessionToken = await this.exchangeSessionToken(sessionTokenCode, sessionState.codeVerifier);

      console.log('✅ 认证回调处理完成');
      return sessionToken;
    } catch (error) {
      console.error('❌ 处理认证回调失败:', error);

      if (error instanceof NintendoAPIError || error instanceof Error) {
        throw error;
      }

      throw new NintendoAPIError(
        '处理认证回调失败',
        undefined,
        error
      );
    }
  }


  /**
    * 交换 session_token
    */
  private async exchangeSessionToken(sessionTokenCode: string, codeVerifier: string): Promise<string> {
    try {
      console.log('🔄 交换 session token...');

      const body = new URLSearchParams({
        client_id: NintendoSwitchService.CLIENT_ID,
        session_token_code: sessionTokenCode,
        session_token_code_verifier: codeVerifier
      });

      const response = await fetch(NintendoSwitchService.ENDPOINTS.SESSION_TOKEN, {
        method: 'POST',
        headers: {
          'User-Agent': NintendoSwitchService.USER_AGENT,
          'Accept-Language': 'en-US',
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Host': 'accounts.nintendo.com',
          'Connection': 'Keep-Alive',
          'Accept-Encoding': 'gzip'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Session token 交换失败: ${response.status}`);
        console.error(`   错误响应: ${errorText}`);

        throw new NintendoAPIError(
          `获取 session token 失败: ${response.status} ${errorText}`,
          response.status
        );
      }

      const data = await response.json() as { session_token: string };

      if (!data.session_token) {
        throw new NintendoAPIError('响应中缺少 session_token');
      }

      console.log('✅ Session token 交换成功');
      return data.session_token;
    } catch (error) {
      if (error instanceof NintendoAPIError) {
        throw error;
      }

      console.error('❌ 交换 session token 异常:', error);
      throw new NintendoAPIError(
        '交换 session token 时发生异常',
        undefined,
        error
      );
    }
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(sessionToken: string): Promise<AccessToken> {
    try {
      console.log('🔑 获取访问令牌...');

      const body = JSON.stringify({
        client_id: NintendoSwitchService.CLIENT_ID,
        session_token: sessionToken,
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token'
      });

      const response = await fetch(NintendoSwitchService.ENDPOINTS.ACCESS_TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': NintendoSwitchService.USER_AGENT
        },
        body
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ 获取访问令牌失败: ${response.status}`);
        console.error(`   错误响应: ${errorText}`);

        throw new NintendoAPIError(
          `获取访问令牌失败: ${response.status} ${errorText}`,
          response.status
        );
      }

      const accessToken = await response.json() as AccessToken;

      if (!accessToken.access_token) {
        throw new NintendoAPIError('响应中缺少 access_token');
      }

      console.log('✅ 访问令牌获取成功');
      return accessToken;
    } catch (error) {
      if (error instanceof NintendoAPIError) {
        throw error;
      }

      console.error('❌ 获取访问令牌异常:', error);
      throw new NintendoAPIError(
        '获取访问令牌时发生异常',
        undefined,
        error
      );
    }
  }

  /**
  * 获取用户信息
  */
  async getUserInfo(sessionToken: string): Promise<UserInfo> {
    try {
      console.log('👤 获取用户信息...');

      if (!sessionToken || typeof sessionToken !== 'string') {
        throw new NintendoAPIError('Session token 无效');
      }

      const accessToken = await this.getAccessToken(sessionToken);

      console.log('📡 请求用户信息 API...');
      const response = await fetch(NintendoSwitchService.ENDPOINTS.USER_INFO, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken.access_token}`,
          'User-Agent': NintendoSwitchService.USER_AGENT,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`⚠️ 获取用户信息失败: ${response.status}`);

        // 对于用户信息，我们返回默认值而不是抛出错误
        return {
          id: 'unknown',
          nickname: 'Nintendo User',
          imageUri: undefined
        };
      }

      const userData = await response.json() as any;

      const userInfo: UserInfo = {
        id: userData.id || 'unknown',
        nickname: userData.nickname || userData.screenName || 'Nintendo User',
        imageUri: userData.mii?.imageUri
      };

      console.log('✅ 用户信息获取成功');
      console.log(`   用户ID: ${userInfo.id}`);
      console.log(`   昵称: ${userInfo.nickname}`);

      return userInfo;
    } catch (error) {
      if (error instanceof NintendoAPIError) {
        throw error;
      }

      console.error('❌ 获取用户信息异常:', error);

      // 对于用户信息获取失败，返回默认值
      return {
        id: 'unknown',
        nickname: 'Nintendo User',
        imageUri: undefined
      };
    }
  }


  /**
   * 获取游戏记录
   */
  async getGameRecords(sessionToken: string): Promise<GameRecord[]> {
    try {
      console.log('🎮 获取游戏记录...');

      if (!sessionToken || typeof sessionToken !== 'string') {
        throw new NintendoAPIError('Session token 无效');
      }

      const accessToken = await this.getAccessToken(sessionToken);

      console.log('📡 请求游戏记录 API...');
      const response = await fetch(NintendoSwitchService.ENDPOINTS.GAME_RECORDS, {
        method: 'GET',
        headers: {
          'Authorization': `${accessToken.token_type} ${accessToken.access_token}`,
          'User-Agent': NintendoSwitchService.USER_AGENT,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ 获取游戏记录失败: ${response.status}`);
        console.error(`   错误响应: ${errorText}`);

        throw new NintendoAPIError(
          `获取游戏记录失败: ${response.status} ${errorText}`,
          response.status
        );
      }

      const data = await response.json() as { playHistories: GameRecord[] };
      const games = data.playHistories || [];

      console.log(`✅ 游戏记录获取成功: ${games.length} 个游戏`);

      return games;
    } catch (error) {
      if (error instanceof NintendoAPIError) {
        throw error;
      }

      console.error('❌ 获取游戏记录异常:', error);
      throw new NintendoAPIError(
        '获取游戏记录时发生异常',
        undefined,
        error
      );
    }
  }


  /**
   * 验证回调 URL 格式
   */
  static isValidCallbackUrl(url: string): boolean {
    return URLParser.isValidCallbackUrl(url);
  }

}
