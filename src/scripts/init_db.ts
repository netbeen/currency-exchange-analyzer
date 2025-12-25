import * as fs from 'fs';
import { prisma } from '../utils/db';
import { CSV_FILE_PATH, SYMBOL_DB } from '../utils/config';

/**
 * 解析日期字符串
 * CSV format: "Jun 25 2001" -> Date object
 */
function parseDate(dateStr: string): Date | null {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return date;
    } catch (e) {
        return null;
    }
}

async function main() {
    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error('找不到 CSV 文件:', CSV_FILE_PATH);
        return;
    }

    console.log('开始读取 CSV 文件...');
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
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
                    symbol: SYMBOL_DB,
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
                const { symbol, date, open, high, low, close } = record;
                
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
