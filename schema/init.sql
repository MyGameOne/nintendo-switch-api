-- 游戏基础信息表
CREATE TABLE IF NOT EXISTS games (
  title_id TEXT PRIMARY KEY,           -- 游戏ID (如: 70010000053251)
  formal_name TEXT,                    -- 正式名称
  name_zh_hant TEXT,                   -- 繁体中文名称（从香港网站获取）
  name_zh_hans TEXT,                   -- 简体中文名称（预留）
  name_en TEXT,                        -- 英文名称（预留）
  name_ja TEXT,                        -- 日文名称（预留）
  catch_copy TEXT,                     -- 宣传语
  description TEXT,                    -- 游戏描述
  publisher_name TEXT,                 -- 发行商名称
  publisher_id INTEGER,                -- 发行商ID
  genre TEXT,                          -- 游戏类型
  release_date TEXT,                   -- 发布日期 (YYYY-MM-DD)
  hero_banner_url TEXT,                -- 主横幅图片
  screenshots TEXT,                    -- 截图数组 (JSON)
  platform TEXT DEFAULT 'HAC',        -- 平台标识
  languages TEXT,                      -- 支持语言 (JSON数组)
  player_number TEXT,                  -- 游玩人数信息 (JSON)
  play_styles TEXT,                    -- 游玩模式数组 (JSON)
  rom_size INTEGER,                    -- 游戏大小 (字节)
  rating_age INTEGER,                  -- 年龄分级
  rating_name TEXT,                    -- 分级名称
  in_app_purchase BOOLEAN DEFAULT FALSE, -- 是否含内购
  cloud_backup_type TEXT,              -- 云备份类型
  region TEXT DEFAULT 'HK',            -- 数据来源地区
  data_source TEXT DEFAULT 'scraper',  -- 数据来源
  notes TEXT,                          -- 备注
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_games_name_zh_hant ON games(name_zh_hant);
CREATE INDEX IF NOT EXISTS idx_games_name_zh_hans ON games(name_zh_hans);
CREATE INDEX IF NOT EXISTS idx_games_publisher ON games(publisher_name);
CREATE INDEX IF NOT EXISTS idx_games_genre ON games(genre);
CREATE INDEX IF NOT EXISTS idx_games_release_date ON games(release_date);
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games(updated_at);
CREATE INDEX IF NOT EXISTS idx_games_region ON games(region);

-- 爬虫统计表
CREATE TABLE IF NOT EXISTS scraping_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                  -- 日期 (YYYY-MM-DD)
  total_games INTEGER DEFAULT 0,      -- 总游戏数
  updated_games INTEGER DEFAULT 0,    -- 更新的游戏数
  new_games INTEGER DEFAULT 0,        -- 新增的游戏数
  success_rate REAL DEFAULT 0,        -- 成功率
  errors TEXT,                         -- 错误信息（JSON字符串）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stats_date ON scraping_stats(date);
