import { PrismaClient } from '../generated/client/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as fs from 'fs';
import * as path from 'path';

// 加载环境变量
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const CSV_PATH = path.join(__dirname, '../../data/raw/usd_cny_history_2001_2025.csv');

/**
 * 解析日期字符串
 * CSV format: "Jun 25 2001" -> Date object
 */
function parseDate(dateStr: string): Date | null {
    try {
        // dateStr example: "Mon Jun 25 2001 07:00:00 GMT+0800 (China Standard Time)"
        // or potentially simpler depending on the CSV parsing. 
        // Based on previous `head` output: "Mon Jun 25 2001 07:00:00 GMT+0800 (China Standard Time)"
        // This can be directly parsed by new Date() in Node.js
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date;
    } catch (e) {
        return null;
    }
}

async function main() {
    if (!fs.existsSync(CSV_PATH)) {
        console.error('找不到 CSV 文件:', CSV_PATH);
        return;
    }

    console.log('开始读取 CSV 文件...');
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.split('\n');
    // Header: date,open,high,low,close,adjClose,volume
    // 这里的顺序必须与 fetch_data.ts 保持一致
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');

    console.log(`找到 ${dataLines.length} 条数据，准备导入...`);

    const batchSize = 500;
    const records = [];
    let skipCount = 0;

    for (const line of dataLines) {
        // CSV line parsing
        const parts = line.split(',');
        if (parts.length >= 5) {
            // date,open,high,low,close,adjClose,volume
            const [rawDate, open, high, low, close] = parts;
            const date = parseDate(rawDate);
            
            // 确保所有数值都是有效的数字
            const openVal = parseFloat(open);
            const highVal = parseFloat(high);
            const lowVal = parseFloat(low);
            const closeVal = parseFloat(close);

            if (date && !isNaN(openVal) && !isNaN(highVal) && !isNaN(lowVal) && !isNaN(closeVal)) {
                records.push({
                    symbol: 'USDCNY',
                    date: date,
                    open: openVal,
                    high: highVal,
                    low: lowVal,
                    close: closeVal,
                });
            } else {
                skipCount++;
            }
        }
    }

    console.log(`解析完成: 有效记录 ${records.length} 条，跳过 ${skipCount} 条。`);

    if (records.length > 0) {
        console.log('正在写入数据库...');
        // SQLite 不支持 createMany 的 skipDuplicates，改用 transaction + upsert
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const operations = batch.map(record => {
                // 确保 create 中包含所有必填字段
                // 显式地从 record 中提取字段，确保 TypeScript 不会遗漏
                const { symbol, date, open, high, low, close } = record;
                
                // 确保数值字段不为 NaN 或 undefined
                // if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
                //     console.error('Invalid record found:', record);
                //     throw new Error('Invalid numeric value in record');
                // }

                return prisma.exchangeRate.upsert({
                    where: {
                        symbol_date: {
                            symbol,
                            date
                        }
                    },
                    update: {
                        open,
                        high,
                        low,
                        close
                    },
                    create: {
                        symbol,
                        date,
                        open,
                        high,
                        low,
                        close
                    },
                });
            });
            
            await prisma.$transaction(operations);
            process.stdout.write(`\r已处理: ${Math.min(i + batchSize, records.length)} / ${records.length}`);
        }
        console.log('\n导入完成。');
    }

    const count = await prisma.exchangeRate.count();
    console.log(`数据库当前总记录数: ${count}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
