
import yahooFinance from 'yahoo-finance2';
import * as fs from 'fs';
import * as path from 'path';
import { US_YIELD_FILE_PATH, RAW_DATA_DIR } from '../utils/config';

const START_DATE = '2001-06-24';

async function fetchUS10Y() {
    console.log('=== 获取美国 10 年期国债收益率 (^TNX) ===');
    try {
        const symbol = '^TNX';
        const yf = new yahooFinance();
        const result = await yf.chart(symbol, {
            period1: START_DATE,
            interval: '1d'
        });

        const quotes = result.quotes;
        if (!quotes || quotes.length === 0) {
            console.log('未获取到 US10Y 数据');
            return;
        }

        console.log(`获取到 ${quotes.length} 条 US10Y 数据`);

        // 准备 CSV 内容
        // Header: date,value
        const header = 'date,value';
        const rows = quotes
            .filter(quote => quote.close !== null && quote.close !== undefined)
            .map(quote => {
                const date = quote.date.toISOString().split('T')[0];
                return `${date},${quote.close}`;
            });

        const csvContent = [header, ...rows].join('\n');

        // 确保目录存在
        if (!fs.existsSync(RAW_DATA_DIR)) {
            fs.mkdirSync(RAW_DATA_DIR, { recursive: true });
        }

        fs.writeFileSync(US_YIELD_FILE_PATH, csvContent);
        console.log(`数据已保存至: ${US_YIELD_FILE_PATH}`);

    } catch (error) {
        console.error('获取 US10Y 数据失败:', error);
    }
}

fetchUS10Y();
