import type { Env, GameRecordsResponse } from '../types';
import { NintendoSwitchService } from '../services/nintendo-service';
import { DatabaseService } from '../services/database-service';
import { NintendoAPIError } from '../types';

/**
 * 处理游戏记录获取请求
 */
export async function handleGameRecords(request: Request, env: Env): Promise<Response> {
  try {
    console.log('📥 收到获取游戏记录请求');

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
      const response: GameRecordsResponse = {
        success: false,
        error: '缺少有效的 session token'
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔄 开始获取游戏记录...');
    const nintendoService = new NintendoSwitchService();
    const databaseService = new DatabaseService(env);

    // 1. 从任天堂 API 获取游戏记录
    const gameRecords = await nintendoService.getGameRecords(sessionToken);

    // 2. 从 D1 数据库增强游戏信息（添加中文名称和发行商）
    console.log('🔄 增强游戏信息...');
    const enhancedGameRecords = await databaseService.enhanceGameRecords(gameRecords);

    console.log('✅ 游戏记录获取和增强完成');

    const response: GameRecordsResponse = {
      success: true,
      games: enhancedGameRecords
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ 获取游戏记录失败:', error);

    let errorMessage = '获取游戏记录失败';
    let statusCode = 500;

    if (error instanceof NintendoAPIError) {
      errorMessage = error.message;
      statusCode = error.statusCode || 500;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    const response: GameRecordsResponse = {
      success: false,
      error: errorMessage
    };

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}