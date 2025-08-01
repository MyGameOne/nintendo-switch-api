🏗️ 整体架构设计
核心思路
我们要建立一个智能的、去重的游戏数据管理系统，使用 KV 作为游戏 ID 的中央管理器，D1 作为游戏详细数据的存储，两个项目协同工作。

📊 数据存储策略
KV 存储结构
GAME_IDS 命名空间：
├── "pending:{titleId}" → "待爬取" (值: timestamp)
├── "scraped:{titleId}" → "已爬取" (值: last_scraped_time)
├── "failed:{titleId}" → "爬取失败" (值: error_info)
└── "queue:all" → "所有待处理ID列表" (值: JSON数组)

CACHE 命名空间：
├── "game:{titleId}" → 游戏详情缓存 (TTL: 1小时)
├── "user:{userId}:games" → 用户游戏记录缓存 (TTL: 10分钟)
└── "stats:summary" → 系统统计缓存 (TTL: 5分钟)
D1 数据库
games 表：存储完整的游戏元数据
scraping_stats 表：存储爬取统计信息
🔄 完整工作流程
流程 1：用户查询游戏记录（API 项目）
用户请求 /api/games 获取游戏记录
从 Nintendo API 获取用户的游戏列表（包含 titleId）
智能去重检查：
遍历每个 titleId
检查 KV scraped:{titleId} 是否存在
如果不存在，添加到 KV pending:{titleId}
从 D1 查询已有游戏的中文名称和发行商信息
合并数据返回给用户
后台异步：更新 queue:all 列表供爬虫使用
流程 2：爬虫数据采集（Scraper 项目）
爬虫启动时从 KV 读取 queue:all 获取待爬取列表
二次去重检查：
对每个 titleId，检查 D1 中是否已存在
检查数据是否过期（比如超过30天）
只爬取真正需要的游戏
执行爬取操作
状态更新：
成功：更新 KV scraped:{titleId}
失败：更新 KV failed:{titleId}
从 pending:{titleId} 中移除
将数据写入 D1 数据库
流程 3：缓存策略
读取优先级：KV 缓存 → D1 数据库 → Nintendo API
写入策略：同时更新 D1 和 KV 缓存
TTL 管理：不同数据设置不同过期时间
🎯 去重优化策略
三层去重机制
KV 层去重：检查 scraped:{titleId} 避免重复标记
D1 层去重：检查数据库中是否已存在且较新
时间戳去重：基于最后更新时间判断是否需要重新爬取
成本控制
批量操作：使用 KV 的 list 和 bulk 操作
智能缓存：热点数据缓存，冷数据按需查询
延迟写入：非关键数据异步写入
🔧 API 设计
新增管理接口
GET /api/admin/game-ids - 查看游戏 ID 状态
POST /api/admin/game-ids - 手动添加游戏 ID
DELETE /api/admin/game-ids/{id} - 移除游戏 ID
POST /api/admin/sync - 手动触发同步
GET /api/admin/stats - 详细统计信息
现有接口优化
/api/games - 增加智能去重逻辑
/api/stats - 增加 KV 使用统计
📈 监控和维护
关键指标
KV 读写次数和成本
D1 查询次数和响应时间
去重命中率
爬取成功率
自动化任务
定期清理过期的 KV 数据
监控免费额度使用情况
自动重试失败的爬取任务
这个架构的核心优势是：

智能去重：避免重复工作，节省资源
动态管理：无需修改代码文件，通过 API 管理
成本可控：在免费额度内高效运行
数据一致：两个项目间实时同步
可扩展性：支持未来功能扩展
