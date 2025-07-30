import type { Env, UserInfoResponse } from '../types';
import { NintendoSwitchService } from '../services/nintendo-service';
import { NintendoAPIError } from '../types';

/**
 * 处理用户信息获取请求
 */
export async function handleUserInfo(request: Request, env: Env): Promise<Response> {
  try {
    console.log('📥 收到获取用户信息请求');

    // 验证请求方法
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: '请求方法必须是 POST'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 解析请求体
    let requestBody: { sessionToken?: string };
    try {
      requestBody = await request.json() as { sessionToken?: string };
    } catch (parseError) {
      console.error('❌ JSON 解析失败:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'JSON 格式错误'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sessionToken = requestBody.sessionToken;

    if (!sessionToken || typeof sessionToken !== 'string') {
      console.log('❌ 缺少或无效的 session token');
      const response: UserInfoResponse = {
        success: false,
        error: '缺少有效的 session token'
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔄 调用 getUserInfo 方法...');
    const nintendoService = new NintendoSwitchService();
    const userInfo = await nintendoService.getUserInfo(sessionToken);

    const response: UserInfoResponse = {
      success: true,
      user: userInfo
    };

    console.log('✅ 用户信息获取成功');
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ 获取用户信息失败:', error);

    let errorMessage = '获取用户信息失败';
    let statusCode = 500;

    if (error instanceof NintendoAPIError) {
      errorMessage = error.message;
      statusCode = error.statusCode || 500;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    const response: UserInfoResponse = {
      success: false,
      error: errorMessage
    };

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}