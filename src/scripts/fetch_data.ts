import yahooFinance from 'yahoo-finance2';
import * as fs from 'fs';
import * as path from 'path';
import { SYMBOL, START_DATE, CSV_FILE_PATH } from '../utils/config';

/**
 * 获取 USD/CNY 历史数据
 * 来源: Yahoo Finance
 * 时间范围: 2000-01-01 至今
 */
async function fetchUsdCnyHistory() {
    const symbol = SYMBOL;
    const startDate = START_DATE;
    const endDate = new Date().toISOString().split('T')[0]; // 今天

    console.log(`=== 开始获取 ${symbol} 历史数据 ===`);
    console.log(`时间范围: ${startDate} 至 ${endDate}`);

    try {
        // yahoo-finance2 v3 需要先实例化
        const yf = new yahooFinance();

        // 使用 chart API 获取历史数据
        const result = await yf.chart(symbol, {
            period1: startDate,
            period2: endDate,
            interval: '1d'
        });

        // 提取 quotes 数据
        const quotes = (result as any).quotes;
        
        if (!quotes || quotes.length === 0) {
            console.log('未获取到数据。');
            return;
        }

        console.log(`成功获取 ${quotes.length} 条数据。`);

        // 准备 CSV 内容
        // 字段: date, open, high, low, close, adjClose, volume
        const header = 'date,open,high,low,close,adjClose,volume';
        const rows = quotes.map((quote: any) => {
            const date = quote.date.toISOString().split('T')[0];
            return `${date},${quote.open},${quote.high},${quote.low},${quote.close},${quote.adjclose || quote.close},${quote.volume || 0}`;
        });

        const csvContent = [header, ...rows].join('\n');

        // 保存文件
        const filePath = CSV_FILE_PATH;
        
        // 确保目录存在
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, csvContent);
        console.log(`数据已保存至: ${filePath}`);

        // 显示数据摘要
        const first = quotes[0];
        const last = quotes[quotes.length - 1];

        console.log('\n数据摘要:');
        console.log(`最早记录: ${first.date.toISOString().split('T')[0]} (收盘价: ${first.close})`);
        console.log(`最新记录: ${last.date.toISOString().split('T')[0]} (收盘价: ${last.close})`);

    } catch (error) {
        console.error('获取数据失败:', error);
    }
}

// 运行函数
fetchUsdCnyHistory();
