import type { Env, GameRecord } from '../types';

export class DatabaseService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  // 根据游戏 ID 批量获取中文名称和发行商信息
  async getGameEnhancements(titleIds: string[]): Promise<Map<string, { name_zh?: string; publisher_name?: string }>> {
    if (titleIds.length === 0) return new Map();

    try {
      // 构建 SQL 查询
      const placeholders = titleIds.map(() => '?').join(',');
      const query = `
        SELECT title_id, name_zh, publisher_name 
        FROM games 
        WHERE title_id IN (${placeholders})
      `;

      const { results } = await this.db.prepare(query).bind(...titleIds).all();

      // 创建查找映射
      const enhancementMap = new Map<string, { name_zh?: string; publisher_name?: string }>();
      
      if (results) {
        for (const row of results as any[]) {
          enhancementMap.set(row.title_id, {
            name_zh: row.name_zh,
            publisher_name: row.publisher_name
          });
        }
      }

      console.log(`📊 从数据库获取到 ${enhancementMap.size} 个游戏的增强信息`);
      return enhancementMap;
    } catch (error) {
      console.error('数据库查询失败:', error);
      return new Map();
    }
  }

  // 增强游戏记录（添加中文名称和发行商）
  async enhanceGameRecords(gameRecords: GameRecord[]): Promise<GameRecord[]> {
    const titleIds = gameRecords.map(game => game.titleId);
    const enhancements = await this.getGameEnhancements(titleIds);

    return gameRecords.map(record => {
      const enhancement = enhancements.get(record.titleId);
      return {
        ...record,
        titleNameCN: enhancement?.name_zh || undefined,
        publisher: enhancement?.publisher_name || undefined,
      };
    });
  }

  // 获取数据库统计信息
  async getStats(): Promise<{ totalGames: number; gamesWithChineseName: number }> {
    try {
      const totalResult = await this.db.prepare('SELECT COUNT(*) as count FROM games').first();
      const chineseResult = await this.db.prepare('SELECT COUNT(*) as count FROM games WHERE name_zh IS NOT NULL').first();

      return {
        totalGames: (totalResult as any)?.count || 0,
        gamesWithChineseName: (chineseResult as any)?.count || 0
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return { totalGames: 0, gamesWithChineseName: 0 };
    }
  }
}
