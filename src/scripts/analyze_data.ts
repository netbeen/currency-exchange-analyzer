import { prisma } from '../utils/db';
import { ANALYSIS_RESULT_FILE } from '../utils/config';
import { 
    calculateSMA, 
    calculateEMA, 
    calculateBollingerBands, 
    calculateMACD 
} from '../analysis/technical_indicators';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log('正在连接数据库...');
    
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

        const us10y = await prisma.bondYield.findMany({
            where: {
                symbol: 'US10Y'
            },
            orderBy: {
                date: 'asc'
            },
            select: {
                date: true,
                value: true
            }
        });

        console.log(`获取到 ${rates.length} 条汇率记录`);
        console.log(`获取到 ${us10y.length} 条 US10Y 记录`);

        if (rates.length === 0) {
            console.log('没有数据可分析');
            return;
        }

        const closePrices = rates.map((r: { close: number }) => r.close);
        const dates = rates.map((r: { date: Date }) => r.date);

        // Align US10Y data with Exchange Rate dates
        const us10yMap = new Map(us10y.map(r => [r.date.toISOString().split('T')[0], r.value]));
        const us10yAligned = dates.map(d => {
            const dateStr = d.toISOString().split('T')[0];
            return us10yMap.get(dateStr) || null;
        });

        console.log('正在计算技术指标 (SMA, EMA, Bollinger Bands, MACD)...');
        
        // 短期
        const sma20 = calculateSMA(closePrices, 20);
        const ema20 = calculateEMA(closePrices, 20);
        
        // 长期 (针对长期投资者)
        const sma50 = calculateSMA(closePrices, 50);
        const sma200 = calculateSMA(closePrices, 200);
        const ema50 = calculateEMA(closePrices, 50);
        const ema200 = calculateEMA(closePrices, 200);

        const bollinger = calculateBollingerBands(closePrices, 20, 2);
        const macd = calculateMACD(closePrices, 12, 26, 9);

        // 保存分析结果到 JSON 文件
        const outputDir = path.dirname(ANALYSIS_RESULT_FILE);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const resultData = {
            dates: dates.map((d: Date) => d.toISOString().split('T')[0]),
            prices: closePrices,
            us10y: us10yAligned,
            indicators: {
                sma20,
                ema20,
                sma50,
                sma200,
                ema50,
                ema200,
                bollinger: {
                    upper: bollinger.upper,
                    middle: bollinger.middle,
                    lower: bollinger.lower
                },
                macd: {
                    line: macd.macdLine,
                    signal: macd.signalLine,
                    histogram: macd.histogram
                }
            }
        };

        fs.writeFileSync(ANALYSIS_RESULT_FILE, JSON.stringify(resultData, null, 2));
        console.log(`\n分析结果已保存至: ${ANALYSIS_RESULT_FILE}`);

        console.log(`\n=== 最近 5 个交易日的分析结果 ===`);
        
        const startIndex = Math.max(0, rates.length - 5);
        
        for (let i = startIndex; i < rates.length; i++) {
            const dateStr = dates[i].toISOString().split('T')[0];
            const close = closePrices[i].toFixed(4);
            
            const sma = sma20[i] ? sma20[i]?.toFixed(4) : 'N/A';
            const ema = ema20[i] ? ema20[i]?.toFixed(4) : 'N/A';
            const sma50Val = sma50[i] ? sma50[i]?.toFixed(4) : 'N/A';
            const sma200Val = sma200[i] ? sma200[i]?.toFixed(4) : 'N/A';
            
            const upper = bollinger.upper[i] ? bollinger.upper[i]?.toFixed(4) : 'N/A';
            const middle = bollinger.middle[i] ? bollinger.middle[i]?.toFixed(4) : 'N/A';
            const lower = bollinger.lower[i] ? bollinger.lower[i]?.toFixed(4) : 'N/A';
            
            const macdLine = macd.macdLine[i] ? macd.macdLine[i]?.toFixed(4) : 'N/A';
            const signalLine = macd.signalLine[i] ? macd.signalLine[i]?.toFixed(4) : 'N/A';
            const histogram = macd.histogram[i] ? macd.histogram[i]?.toFixed(4) : 'N/A';
            
            console.log(`\n日期: ${dateStr} | 收盘价: ${close}`);
            console.log(`  SMA(20): ${sma} | EMA(20): ${ema}`);
            console.log(`  SMA(50): ${sma50Val} | SMA(200): ${sma200Val}`);
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
