
/**
 * 简单移动平均线 (SMA)
 * Formula: Sum of last N closing prices / N
 * 
 * @param data - 数据数组
 * @param period - 计算周期 (e.g., 5, 10, 20)
 * @returns 包含 SMA 值的数组，前 period-1 个元素为 null
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
    if (data.length < period) {
        return Array(data.length).fill(null);
    }

    const sma: (number | null)[] = [];
    let sum = 0;

    // 初始窗口
    for (let i = 0; i < period; i++) {
        sum += data[i];
        if (i < period - 1) {
            sma.push(null);
        }
    }
    
    // 第一个 SMA
    sma.push(sum / period);

    // 后续滑动窗口
    for (let i = period; i < data.length; i++) {
        sum = sum - data[i - period] + data[i];
        sma.push(sum / period);
    }

    return sma;
}

/**
 * 指数移动平均线 (EMA)
 * Formula: (Close - Previous EMA) * (2 / (N + 1)) + Previous EMA
 * 
 * @param data - 数据数组
 * @param period - 计算周期
 * @returns 包含 EMA 值的数组
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
    if (data.length < period) {
        return Array(data.length).fill(null);
    }

    const k = 2 / (period + 1);
    const ema: (number | null)[] = Array(period - 1).fill(null);

    // 初始 EMA 通常使用 SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i];
    }
    let prevEma = sum / period;
    ema.push(prevEma);

    // 后续计算
    for (let i = period; i < data.length; i++) {
        const currentEma = (data[i] - prevEma) * k + prevEma;
        ema.push(currentEma);
        prevEma = currentEma;
    }

    return ema;
}

/**
 * 标准差 (Standard Deviation)
 * 使用滑动窗口算法优化计算性能 O(N)
 * 
 * @param data - 数据数组
 * @param period - 计算周期
 * @returns 包含标准差的数组
 */
export function calculateStdDev(data: number[], period: number): (number | null)[] {
    if (data.length < period) {
        return Array(data.length).fill(null);
    }

    const stdDev: (number | null)[] = Array(period - 1).fill(null);
    
    let sum = 0;
    let sumSq = 0;

    // 初始化第一个窗口
    for (let i = 0; i < period; i++) {
        sum += data[i];
        sumSq += data[i] * data[i];
    }

    const calculate = (s: number, sq: number) => {
        const mean = s / period;
        // 方差 = E[X^2] - (E[X])^2
        // 注意：由于浮点数精度问题，有时可能会出现极小的负数，需取绝对值或归零
        const variance = Math.max(0, (sq / period) - (mean * mean));
        return Math.sqrt(variance);
    };

    stdDev.push(calculate(sum, sumSq));

    // 滑动窗口
    for (let i = period; i < data.length; i++) {
        const removeVal = data[i - period];
        const addVal = data[i];

        sum = sum - removeVal + addVal;
        sumSq = sumSq - (removeVal * removeVal) + (addVal * addVal);

        stdDev.push(calculate(sum, sumSq));
    }

    return stdDev;
}

/**
 * 布林带 (Bollinger Bands)
 * Middle Band = SMA(20)
 * Upper Band = Middle Band + (2 * StdDev)
 * Lower Band = Middle Band - (2 * StdDev)
 * 
 * @param data - 数据数组
 * @param period - 计算周期 (默认 20)
 * @param multiplier - 标准差倍数 (默认 2)
 */
export function calculateBollingerBands(data: number[], period: number = 20, multiplier: number = 2): {
    upper: (number | null)[],
    middle: (number | null)[],
    lower: (number | null)[]
} {
    const middle = calculateSMA(data, period);
    const stdDev = calculateStdDev(data, period);
    
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
        if (middle[i] === null || stdDev[i] === null) {
            upper.push(null);
            lower.push(null);
        } else {
            upper.push(middle[i]! + multiplier * stdDev[i]!);
            lower.push(middle[i]! - multiplier * stdDev[i]!);
        }
    }

    return { upper, middle, lower };
}

/**
 * MACD (Moving Average Convergence Divergence)
 * MACD Line = EMA(12) - EMA(26)
 * Signal Line = EMA(9) of MACD Line
 * Histogram = MACD Line - Signal Line
 */
export function calculateMACD(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {
    macdLine: (number | null)[],
    signalLine: (number | null)[],
    histogram: (number | null)[]
} {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);
    
    const macdLine: (number | null)[] = [];
    
    for (let i = 0; i < data.length; i++) {
        if (fastEMA[i] === null || slowEMA[i] === null) {
            macdLine.push(null);
        } else {
            macdLine.push(fastEMA[i]! - slowEMA[i]!);
        }
    }

    // Calculate Signal Line (EMA of MACD Line)
    // Need to handle the initial nulls in macdLine
    // Find first non-null index
    let firstValidIndex = 0;
    while (firstValidIndex < macdLine.length && macdLine[firstValidIndex] === null) {
        firstValidIndex++;
    }

    const validMacdValues = macdLine.slice(firstValidIndex) as number[];
    const validSignalValues = calculateEMA(validMacdValues, signalPeriod);
    
    // Pad signal line with nulls
    const signalLine: (number | null)[] = Array(firstValidIndex).fill(null).concat(validSignalValues);
    
    // Calculate Histogram
    const histogram: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (macdLine[i] === null || signalLine[i] === null) {
            histogram.push(null);
        } else {
            histogram.push(macdLine[i]! - signalLine[i]!);
        }
    }

    return { macdLine, signalLine, histogram };
}
