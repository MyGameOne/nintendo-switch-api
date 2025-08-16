/* eslint-disable ts/explicit-function-return-type */
import type { Context } from 'hono'
import type { Env, Variables } from '../types'
import { DatabaseService } from '../services/database-service'
import { NintendoSwitchService } from '../services/nintendo-service'
import { createStandardSuccessResponse } from '../utils/response'

/**
 * 处理认证 URL 生成请求
 */

export async function handleAuthUrl(c: Context<{ Bindings: Env, Variables: Variables }>) {
  const requestId = c.get('requestId')
  console.log(`🔐 [${requestId}] 生成认证 URL`)

  const nintendoService = new NintendoSwitchService()
  const { authUrl, sessionId } = await nintendoService.generateAuthUrl()

  const data = {
    authUrl,
    sessionId,
    instructions: nintendoService.getAuthInstructions(),
  }

  return createStandardSuccessResponse(c, data, '认证 URL 生成成功')
}

/**
 * 处理认证回调请求
 */
export async function handleAuthCallback(c: Context<{ Bindings: Env, Variables: Variables }>) {
  const requestId = c.get('requestId')
  console.log(`🔐 [${requestId}] 处理认证回调`)

  // 验证请求体
  const body = await c.req.json()
  const { callbackUrl } = body

  if (!callbackUrl || typeof callbackUrl !== 'string') {
    throw new Error('callbackUrl 字段是必需的')
  }

  // 基础格式验证
  if (!NintendoSwitchService.isValidCallbackUrl(callbackUrl)) {
    throw new Error('回调 URL 格式错误')
  }

  const nintendoService = new NintendoSwitchService()
  const sessionToken = await nintendoService.handleAuthCallback(callbackUrl)

  const data = {
    sessionToken,
  }

  return createStandardSuccessResponse(c, data, '认证成功')
}

/**
 * 处理用户信息获取请求
 */
export async function handleUserInfo(c: Context<{ Bindings: Env, Variables: Variables }>) {
  const requestId = c.get('requestId')
  console.log(`👤 [${requestId}] 获取用户信息`)

  // 验证请求体
  const body = await c.req.json()
  const { sessionToken } = body

  if (!sessionToken || typeof sessionToken !== 'string') {
    throw new Error('sessionToken 字段是必需的')
  }

  const nintendoService = new NintendoSwitchService()
  const userInfo = await nintendoService.getUserInfo(sessionToken)

  return createStandardSuccessResponse(c, userInfo, '用户信息获取成功')
}

/**
 * 处理游戏记录获取请求
 */
export async function handleGameRecords(c: Context<{ Bindings: Env, Variables: Variables }>) {
  const requestId = c.get('requestId')
  console.log(`🎮 [${requestId}] 获取游戏记录`)

  // 验证请求体
  const body = await c.req.json()
  const { sessionToken } = body

  if (!sessionToken || typeof sessionToken !== 'string') {
    throw new Error('sessionToken 字段是必需的')
  }

  const nintendoService = new NintendoSwitchService()
  const databaseService = new DatabaseService(c.env)

  // 1. 从任天堂 API 获取游戏记录
  const gameRecords = await nintendoService.getGameRecords(sessionToken)

  // 2. 从 D1 数据库增强游戏信息（添加中文名称和发行商）
  console.log(`🔄 [${requestId}] 增强游戏信息...`)
  const enhancedGameRecords = await databaseService.enhanceGameRecords(gameRecords)

  return createStandardSuccessResponse(c, enhancedGameRecords, `获取到 ${enhancedGameRecords.length} 个游戏记录`, {
    count: enhancedGameRecords.length,
    enhanced: enhancedGameRecords.filter(g => g.titleNameCN).length,
  })
}
