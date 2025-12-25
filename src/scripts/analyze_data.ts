import { PrismaClient } from '../generated/client/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { 
    calculateSMA, 
    calculateEMA, 
    calculateBollingerBands, 
    calculateMACD 
} from '../analysis/technical_indicators';
import * as fs from 'fs';
import * as path from 'path';

// 加载环境变量
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

async function main() {
    console.log('正在连接数据库...');
    
    const adapter = new PrismaLibSql({
        url: process.env.DATABASE_URL!,
    });
    const prisma = new PrismaClient({ adapter });

    try {
        console.log('获取历史数据...');
        const rates = await prisma.exchangeRate.findMany({
            orderBy: {
                date: 'asc',
            },
            select: {
                date: true,
                close: true,
            }
        });

        console.log(`获取到 ${rates.length} 条记录`);

        if (rates.length === 0) {
            console.log('没有数据可分析');
            return;
        }

        const closePrices = rates.map(r => r.close);
        const dates = rates.map(r => r.date);

        console.log('正在计算技术指标 (SMA, EMA, Bollinger Bands, MACD)...');
        
        const period = 20;
        const sma20 = calculateSMA(closePrices, period);
        const ema20 = calculateEMA(closePrices, period);
        const bollinger = calculateBollingerBands(closePrices, 20, 2);
        const macd = calculateMACD(closePrices, 12, 26, 9);

        console.log(`\n=== 最近 5 个交易日的分析结果 ===`);
        
        const startIndex = Math.max(0, rates.length - 5);
        
        for (let i = startIndex; i < rates.length; i++) {
            const dateStr = dates[i].toISOString().split('T')[0];
            const close = closePrices[i].toFixed(4);
            
            const sma = sma20[i] ? sma20[i]?.toFixed(4) : 'N/A';
            const ema = ema20[i] ? ema20[i]?.toFixed(4) : 'N/A';
            
            const upper = bollinger.upper[i] ? bollinger.upper[i]?.toFixed(4) : 'N/A';
            const middle = bollinger.middle[i] ? bollinger.middle[i]?.toFixed(4) : 'N/A';
            const lower = bollinger.lower[i] ? bollinger.lower[i]?.toFixed(4) : 'N/A';
            
            const macdLine = macd.macdLine[i] ? macd.macdLine[i]?.toFixed(4) : 'N/A';
            const signalLine = macd.signalLine[i] ? macd.signalLine[i]?.toFixed(4) : 'N/A';
            const histogram = macd.histogram[i] ? macd.histogram[i]?.toFixed(4) : 'N/A';
            
            console.log(`\n日期: ${dateStr} | 收盘价: ${close}`);
            console.log(`  SMA(20): ${sma} | EMA(20): ${ema}`);
            console.log(`  Bollinger(20,2): Upper=${upper} Middle=${middle} Lower=${lower}`);
            console.log(`  MACD(12,26,9): Line=${macdLine} Signal=${signalLine} Hist=${histogram}`);
        }

    } catch (error) {
        console.error('分析过程中出错:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
