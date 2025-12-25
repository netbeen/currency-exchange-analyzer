let charts = [];
let totalDataPoints = 0;
let isDark = false;

// Vertical Line Plugin
const verticalLinePlugin = {
    id: 'verticalLine',
    afterDraw: (chart) => {
        if (chart.tooltip?._active?.length) {
            const activePoint = chart.tooltip._active[0].element;
            const x = activePoint.x;
            const topY = chart.scales.y.top;
            const bottomY = chart.scales.y.bottom;
            const ctx = chart.ctx;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, topY);
            ctx.lineTo(x, bottomY);
            ctx.lineWidth = 1;
            // Use theme-aware color
            const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
            ctx.strokeStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.restore();
        }
    }
};

Chart.register(verticalLinePlugin);

// Initialize theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDark = savedTheme === 'dark';
    } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyTheme();
}

function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    applyTheme();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    updateChartsTheme();
}

function updateChartsTheme() {
    if (charts.length === 0) return;

    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#b0b0b0' : '#666';
    const titleColor = isDark ? '#e0e0e0' : '#333';

    charts.forEach(chart => {
        // Update scales
        if (chart.options.scales) {
            Object.values(chart.options.scales).forEach(scale => {
                if (scale.grid) {
                    scale.grid.color = gridColor;
                }
                if (scale.ticks) {
                    scale.ticks.color = textColor;
                }
                if (scale.title) {
                    scale.title.color = textColor;
                }
            });
        }
        
        // Update plugins
        if (chart.options.plugins) {
            if (chart.options.plugins.title) {
                chart.options.plugins.title.color = titleColor;
            }
            if (chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = textColor;
            }
        }

        // Special handling for Price Chart text color (close price line is #333 by default)
        if (chart.data.datasets) {
            chart.data.datasets.forEach(dataset => {
                if (dataset.label === '收盘价') {
                    dataset.borderColor = isDark ? '#e0e0e0' : '#333';
                }
            });
        }

        chart.update();
    });
}

async function loadData() {
    initTheme();
    try {
        const response = await fetch('analysis_results.json');
        const data = await response.json();
        totalDataPoints = data.dates.length;
        renderCharts(data);
        // Apply theme after charts are created
        updateChartsTheme();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('加载数据失败，请确保 analysis_results.json 存在。');
    }
}

function updateTimeRange(days, btn) {
    // Update button styles
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Calculate min index
    let minIndex = 0;
    if (days > 0) {
        minIndex = Math.max(0, totalDataPoints - days);
    }

    // Update all charts
    charts.forEach(chart => {
        chart.options.scales.x.min = minIndex;
        chart.options.scales.x.max = totalDataPoints - 1;
        chart.update();
    });
}

function syncCharts(sourceChart) {
    const min = sourceChart.scales.x.min;
    const max = sourceChart.scales.x.max;

    charts.forEach(chart => {
        if (chart === sourceChart) return;
        
        chart.options.scales.x.min = min;
        chart.options.scales.x.max = max;
        chart.update('none');
    });
}

function syncHover(event, activeElements, chart) {
    if (!activeElements || activeElements.length === 0) {
        // Clear other charts
        charts.forEach(c => {
            if (c === chart) return;
            c.setActiveElements([]);
            c.tooltip.setActiveElements([]);
            c.update();
        });
        return;
    }

    const activeIndex = activeElements[0].index;

    charts.forEach(c => {
        if (c === chart) return;

        // Find elements at the same index
        const otherActiveElements = [];
        c.data.datasets.forEach((dataset, datasetIndex) => {
            // Check if dataset is visible and has data
            if (!c.isDatasetVisible(datasetIndex)) return;
            
            const meta = c.getDatasetMeta(datasetIndex);
            if (meta.data[activeIndex]) {
                otherActiveElements.push({ datasetIndex, index: activeIndex });
            }
        });

        if (otherActiveElements.length > 0) {
            c.setActiveElements(otherActiveElements);
            c.tooltip.setActiveElements(otherActiveElements);
            c.update();
        }
    });
}

function renderCharts(data) {
    const ctxPrice = document.getElementById('priceChart').getContext('2d');
    const ctxMacd = document.getElementById('macdChart').getContext('2d');
    
    // Common zoom options
    const zoomOptions = {
        pan: {
            enabled: true,
            mode: 'x',
            onPan: ({chart}) => syncCharts(chart)
        },
        zoom: {
            wheel: {
                enabled: false, // Disable wheel zoom
            },
            pinch: {
                enabled: true
            },
            mode: 'x',
            onZoom: ({chart}) => syncCharts(chart)
        }
    };

    // Common hover options
    const hoverOptions = {
        mode: 'index',
        intersect: false,
        onHover: (event, activeElements, chart) => syncHover(event, activeElements, chart)
    };

    // 主图表：价格 + SMA + EMA + Bollinger
    const priceChart = new Chart(ctxPrice, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [
                {
                    label: '收盘价',
                    data: data.prices,
                    borderColor: '#333',
                    borderWidth: 2,
                    pointRadius: 0,
                    yAxisID: 'y'
                },
                {
                    label: 'SMA(20)',
                    data: data.indicators.sma20,
                    borderColor: '#2196F3',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    borderDash: [5, 5]
                },
                {
                    label: 'EMA(20)',
                    data: data.indicators.ema20,
                    borderColor: '#4CAF50',
                    borderWidth: 1.5,
                    pointRadius: 0
                },
                {
                    label: 'Bollinger Upper',
                    data: data.indicators.bollinger.upper,
                    borderColor: 'rgba(255, 152, 0, 0.5)',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Bollinger Lower',
                    data: data.indicators.bollinger.lower,
                    borderColor: 'rgba(255, 152, 0, 0.5)',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: '-1' // Fill to the previous dataset (Upper)
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            onHover: hoverOptions.onHover,
            plugins: {
                title: {
                    display: true,
                    text: '价格趋势与均线指标'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(4);
                            }
                            return label;
                        }
                    }
                },
                zoom: zoomOptions
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '汇率'
                    }
                }
            }
        }
    });

    // MACD 图表
    const macdChart = new Chart(ctxMacd, {
        type: 'bar',
        data: {
            labels: data.dates,
            datasets: [
                {
                    type: 'line',
                    label: 'MACD Line',
                    data: data.indicators.macd.line,
                    borderColor: '#2196F3',
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    type: 'line',
                    label: 'Signal Line',
                    data: data.indicators.macd.signal,
                    borderColor: '#FF5722',
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    type: 'bar',
                    label: 'Histogram',
                    data: data.indicators.macd.histogram,
                    backgroundColor: (context) => {
                        const value = context.raw;
                        return value >= 0 ? '#4CAF50' : '#F44336';
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            onHover: hoverOptions.onHover,
            plugins: {
                title: {
                    display: true,
                    text: 'MACD (12, 26, 9)'
                },
                zoom: zoomOptions
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: '数值'
                    }
                }
            }
        }
    });

    charts = [priceChart, macdChart];
}

loadData();
