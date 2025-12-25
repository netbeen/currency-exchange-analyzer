import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

// 定义项目根目录
export const PROJECT_ROOT = path.resolve(__dirname, '../../');

// 数据相关路径
export const DATA_DIR = path.join(PROJECT_ROOT, 'data');
export const RAW_DATA_DIR = path.join(DATA_DIR, 'raw');
export const CSV_FILENAME = 'usd_cny_history_2001_2025.csv';
export const CSV_FILE_PATH = path.join(RAW_DATA_DIR, CSV_FILENAME);

// 公共目录（Web 可视化）
export const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
export const ANALYSIS_RESULT_FILE = path.join(PUBLIC_DIR, 'analysis_results.json');

// 交易对配置
export const SYMBOL = 'USDCNY=X';
export const SYMBOL_DB = 'USDCNY';
export const START_DATE = '2000-01-01';
