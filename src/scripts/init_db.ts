import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../utils/db';
import { CSV_FILE_PATH, SYMBOL_DB, US_YIELD_FILE_PATH, RAW_DATA_DIR } from '../utils/config';

// ETF Paths - REMOVED

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

async function importExchangeRates() {
    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error('找不到 Exchange Rate CSV 文件:', CSV_FILE_PATH);
        return;
    }

    console.log('开始读取 Exchange Rate CSV 文件...');
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = csvContent.split('\n');
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');

    console.log(`找到 ${dataLines.length} 条数据，准备导入...`);

    const batchSize = 500;
    const records = [];
    let skipCount = 0;

    for (const line of dataLines) {
        const parts = line.split(',');
        if (parts.length >= 5) {
            const [rawDate, open, high, low, close] = parts;
            const date = parseDate(rawDate);
            
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
        console.log('正在写入数据库 (Exchange Rates)...');
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
        console.log('\nExchange Rates 导入完成。');
    }
}

async function importBondYields(filePath: string, symbol: string) {
    if (!fs.existsSync(filePath)) {
        console.error(`找不到 Bond Yield CSV 文件: ${filePath}`);
        return;
    }

    console.log(`开始读取 Bond Yield CSV 文件 (${symbol})...`);
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n');
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');

    console.log(`找到 ${dataLines.length} 条数据，准备导入...`);

    const batchSize = 500;
    const records = [];
    let skipCount = 0;

    for (const line of dataLines) {
        const parts = line.split(',');
        if (parts.length >= 2) {
            // date,value
            const [rawDate, value] = parts;
            const date = parseDate(rawDate);
            const val = parseFloat(value);

            if (date && !isNaN(val)) {
                records.push({
                    symbol: symbol,
                    date: date,
                    value: val
                });
            } else {
                skipCount++;
            }
        }
    }

    console.log(`解析完成: 有效记录 ${records.length} 条，跳过 ${skipCount} 条。`);

    if (records.length > 0) {
        console.log(`正在写入数据库 (${symbol})...`);
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const operations = batch.map(record => {
                const { symbol, date, value } = record;
                
                return prisma.bondYield.upsert({
                    where: {
                        symbol_date: {
                            symbol,
                            date
                        }
                    },
                    update: {
                        value
                    },
                    create: {
                        symbol,
                        date,
                        value
                    },
                });
            });
            
            await prisma.$transaction(operations);
            process.stdout.write(`\r已处理: ${Math.min(i + batchSize, records.length)} / ${records.length}`);
        }
        console.log(`\n${symbol} 导入完成。`);
    }
}

async function main() {
    await importExchangeRates();
    await importBondYields(US_YIELD_FILE_PATH, 'US10Y');

    const rateCount = await prisma.exchangeRate.count();
    const bondCount = await prisma.bondYield.count();
    console.log(`数据库当前状态: Exchange Rates: ${rateCount}, Bond Yields: ${bondCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
