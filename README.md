# Currency Exchange Analyzer

## 项目简介
Currency Exchange Analyzer 是一个专注于 USD/CNY 汇率数据的获取、存储和技术分析工具。该项目旨在为外汇交易分析提供坚实的基础设施，支持从 Yahoo Finance 自动获取历史数据，利用 SQLite 进行高效本地存储，并提供常用的技术指标计算功能。

## 功能特性
- **数据采集**: 自动抓取 USD/CNY 历史汇率数据 (2000年至今)，支持每日更新。
- **数据存储**: 基于 Prisma + SQLite 的轻量级本地存储方案，无需复杂的数据库服务器配置。
- **技术分析**: 内置多种核心技术指标计算：
  - **SMA** (简单移动平均线)
  - **EMA** (指数移动平均线)
  - **Bollinger Bands** (布林带)
  - **MACD** (指数平滑异同移动平均线)
  - **StdDev** (标准差，采用滑动窗口优化算法)

## 技术栈
- **编程语言**: TypeScript / Node.js
- **ORM 框架**: Prisma
- **数据库**: SQLite
- **数据源**: Yahoo Finance (通过 `yahoo-finance2` 库)

## 快速开始

### 1. 环境要求
- Node.js (推荐 v16+)
- npm 或 yarn

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境
项目根目录需要 `.env` 文件来配置数据库连接。如果没有，请创建并添加以下内容（项目已预设）：
```env
DATABASE_URL="file:./dev.db"
```

### 4. 初始化数据库
生成 Prisma Client 并同步数据库结构：
```bash
npm run db:generate
npm run db:push
```

### 5. 获取数据
从 Yahoo Finance 下载最新的 USD/CNY 历史数据，并保存为 CSV 文件到 `data/raw/` 目录：
```bash
npm run fetch-data
```

### 6. 导入数据
将下载的 CSV 数据解析并导入 SQLite 数据库：
```bash
npm run init-db
```

### 7. 运行分析
计算技术指标并输出最近 5 个交易日的详细分析结果：
```bash
npm run analyze
```

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run fetch-data` | 获取最新汇率数据 |
| `npm run init-db` | 初始化并导入数据到数据库 |
| `npm run analyze` | 运行技术分析脚本 |
| `npm run db:studio` | 打开 Prisma Studio 可视化管理数据库 |
| `npm run db:push` | 同步数据库 Schema 变更 |

## 项目结构
```
├── data/
│   └── raw/            # 原始 CSV 数据文件
├── prisma/
│   ├── schema.prisma   # 数据库模型定义
│   └── dev.db          # SQLite 数据库文件 (自动生成)
├── src/
│   ├── analysis/       # 技术指标算法实现
│   │   └── technical_indicators.ts
│   └── scripts/        # 核心功能脚本
│       ├── fetch_data.ts   # 数据获取
│       ├── init_db.ts      # 数据导入
│       └── analyze_data.ts # 数据分析
└── package.json
```

## 开发计划
详见 [PROJECT_PLAN.md](./PROJECT_PLAN.md)。目前已完成第一阶段的数据采集、存储及基础分析功能。

## 许可证
ISC
