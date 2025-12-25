# Database Access Layer

此目录 (`src/db`) 预留用于存放数据库访问代码。

## 建议结构
- `connection.ts`: 管理 SQLite 数据库连接
- `dao/`: 数据访问对象 (Data Access Objects)，封装具体的 SQL 查询
- `models/`: 类型定义

## 示例
当您开始编写业务逻辑时，可以在这里创建 `RateDAO.ts` 来查询汇率数据，而不是在每个脚本里直接写 SQL。
