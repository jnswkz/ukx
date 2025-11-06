/**
 * Box Plot Chart Module
 * Displays statistical distribution with quartiles, median, and outliers
 */

/**
 * Calculate statistics for box plot
 */
function calculateBoxStats(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    
    if (n === 0) return null;
    
    const min = sorted[0];
    const max = sorted[n - 1];
    
    // Calculate quartiles
    const q1Index = Math.floor(n * 0.25);
    const medianIndex = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);
    
    const q1 = sorted[q1Index];
    const median = n % 2 === 0 
        ? (sorted[medianIndex - 1] + sorted[medianIndex]) / 2 
        : sorted[medianIndex];
    const q3 = sorted[q3Index];
    
    // Calculate IQR and outlier bounds
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    // Find whiskers (min/max within bounds)
    const lowerWhisker = sorted.find(v => v >= lowerBound) || min;
    const upperWhisker = sorted.reverse().find(v => v <= upperBound) || max;
    sorted.reverse(); // restore order
    
    // Find outliers
    const outliers = sorted.filter(v => v < lowerBound || v > upperBound);
    
    return {
        min,
        max,
        q1,
        median,
        q3,
        lowerWhisker,
        upperWhisker,
        outliers,
        mean: data.reduce((a, b) => a + b, 0) / n
    };
}

/**
 * Calculate font size based on canvas dimensions
 */
function calculateFontSize(canvas) {
    const base = Math.min(canvas.width, canvas.height);
    return Math.max(10, Math.round(base * 0.02));
}

/**
 * Draw a single box plot
 */
function drawSingleBox(ctx, stats, x, width, chartTop, chartHeight, minValue, maxValue, color, label) {
    const range = maxValue - minValue;
    if (range === 0) return;
    
    const scale = chartHeight / range;
    
    // Helper to convert value to y-coordinate
    const valueToY = (value) => chartTop + chartHeight - ((value - minValue) * scale);
    
    // Box plot colors
    const boxColor = color;
    const medianColor = '#ffffff';
    const whiskerColor = color;
    const outlierColor = color;
    
    const boxLeft = x - width / 2;
    const boxRight = x + width / 2;
    const centerX = x;
    
    // Draw whiskers (lines)
    ctx.strokeStyle = whiskerColor;
    ctx.lineWidth = 2;
    
    // Upper whisker
    ctx.beginPath();
    ctx.moveTo(centerX, valueToY(stats.upperWhisker));
    ctx.lineTo(centerX, valueToY(stats.q3));
    ctx.stroke();
    
    // Lower whisker
    ctx.beginPath();
    ctx.moveTo(centerX, valueToY(stats.lowerWhisker));
    ctx.lineTo(centerX, valueToY(stats.q1));
    ctx.stroke();
    
    // Whisker caps
    const capWidth = width * 0.4;
    ctx.beginPath();
    ctx.moveTo(centerX - capWidth / 2, valueToY(stats.upperWhisker));
    ctx.lineTo(centerX + capWidth / 2, valueToY(stats.upperWhisker));
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX - capWidth / 2, valueToY(stats.lowerWhisker));
    ctx.lineTo(centerX + capWidth / 2, valueToY(stats.lowerWhisker));
    ctx.stroke();
    
    // Draw box (Q1 to Q3)
    const q1Y = valueToY(stats.q1);
    const q3Y = valueToY(stats.q3);
    const boxHeight = q1Y - q3Y;
    
    // Box shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    // Box fill with gradient
    const gradient = ctx.createLinearGradient(boxLeft, q3Y, boxLeft, q1Y);
    gradient.addColorStop(0, boxColor + '99');
    gradient.addColorStop(1, boxColor + 'CC');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(boxLeft, q3Y, width, boxHeight);
    
    // Box border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(boxLeft, q3Y, width, boxHeight);
    
    // Draw median line
    ctx.strokeStyle = medianColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(boxLeft, valueToY(stats.median));
    ctx.lineTo(boxRight, valueToY(stats.median));
    ctx.stroke();
    
    // Draw mean indicator (diamond)
    const meanY = valueToY(stats.mean);
    const diamondSize = 6;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(centerX, meanY - diamondSize);
    ctx.lineTo(centerX + diamondSize, meanY);
    ctx.lineTo(centerX, meanY + diamondSize);
    ctx.lineTo(centerX - diamondSize, meanY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw outliers
    ctx.fillStyle = outlierColor;
    stats.outliers.forEach(outlier => {
        const outlierY = valueToY(outlier);
        ctx.beginPath();
        ctx.arc(centerX, outlierY, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // Draw label
    if (label) {
        ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-primary').trim() || '#ffffff';
        ctx.font = `600 ${calculateFontSize(ctx.canvas)}px 'Barlow', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, centerX, chartTop + chartHeight + 10);
    }
}

/**
 * Draw Y-axis labels and gridlines
 */
function drawYAxis(ctx, minValue, maxValue, chartLeft, chartTop, chartWidth, chartHeight) {
    const textColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--text-secondary').trim() || 'rgba(216, 222, 233, 0.8)';
    const gridColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--border-color').trim() || 'rgba(255, 255, 255, 0.05)';
    
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = `${calculateFontSize(ctx.canvas) - 2}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const numTicks = 6;
    const range = maxValue - minValue;
    
    for (let i = 0; i <= numTicks; i++) {
        const value = minValue + (range / numTicks) * i;
        const y = chartTop + chartHeight - (chartHeight / numTicks) * i;
        
        // Draw gridline
        ctx.beginPath();
        ctx.moveTo(chartLeft, y);
        ctx.lineTo(chartLeft + chartWidth, y);
        ctx.stroke();
        
        // Draw label
        let label;
        if (value >= 1000) {
            label = `$${(value / 1000).toFixed(1)}k`;
        } else if (value >= 1) {
            label = `$${value.toFixed(0)}`;
        } else {
            label = `$${value.toFixed(2)}`;
        }
        
        ctx.fillText(label, chartLeft - 10, y);
    }
}

/**
 * Draw legend
 */
function drawLegend(ctx, chartLeft, chartTop) {
    const items = [
        { label: 'Median', color: '#ffffff', shape: 'line' },
        { label: 'Mean', color: '#fbbf24', shape: 'diamond' },
        { label: 'Outlier', color: '#22c55e', shape: 'circle' }
    ];
    
    const fontSize = calculateFontSize(ctx.canvas) - 2;
    const itemSpacing = 80;
    let x = chartLeft;
    const y = chartTop - 30;
    
    ctx.font = `${fontSize}px 'Barlow', sans-serif`;
    ctx.textBaseline = 'middle';
    
    items.forEach(item => {
        if (item.shape === 'line') {
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 20, y);
            ctx.stroke();
        } else if (item.shape === 'diamond') {
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.moveTo(x + 10, y - 5);
            ctx.lineTo(x + 15, y);
            ctx.lineTo(x + 10, y + 5);
            ctx.lineTo(x + 5, y);
            ctx.closePath();
            ctx.fill();
        } else if (item.shape === 'circle') {
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.arc(x + 10, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-secondary').trim() || 'rgba(216, 222, 233, 0.8)';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, x + 25, y);
        
        x += itemSpacing;
    });
}

/**
 * Main function to draw box plot chart
 * @param {string} canvasId - Canvas element ID
 * @param {Object} data - Data object with structure:
 *   Single series: { values: [numbers], label: 'Label' }
 *   Multiple series: { series: [{ values: [numbers], label: 'Label', color: '#hex' }] }
 * @param {Object} options - Drawing options (optional)
 */
export function drawBoxPlot(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas element with ID "${canvasId}" not found.`);
        return;
    }
    
    // Resize canvas to match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    const bgColor = options.backgroundColor || 
        getComputedStyle(document.documentElement)
            .getPropertyValue('--card-background').trim() || '#1a1b1e';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Determine if single or multiple series
    const isSingleSeries = Array.isArray(data.values);
    const series = isSingleSeries 
        ? [{ values: data.values, label: data.label || 'Data', color: options.color || '#22c55e' }]
        : data.series;
    
    if (!series || series.length === 0) {
        ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-secondary').trim() || '#666';
        ctx.font = `${calculateFontSize(canvas)}px 'Barlow', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No data available', width / 2, height / 2);
        return;
    }
    
    // Calculate statistics for all series
    const allStats = series.map(s => ({
        stats: calculateBoxStats(s.values),
        label: s.label,
        color: s.color || '#22c55e'
    })).filter(s => s.stats !== null);
    
    if (allStats.length === 0) {
        ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-secondary').trim() || '#666';
        ctx.font = `${calculateFontSize(canvas)}px 'Barlow', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No valid data', width / 2, height / 2);
        return;
    }
    
    // Calculate overall min/max for consistent scale
    const allValues = allStats.flatMap(s => [
        s.stats.lowerWhisker,
        s.stats.upperWhisker,
        ...s.stats.outliers
    ]);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    
    // Add 10% padding to scale
    const range = maxValue - minValue;
    const paddedMin = minValue - range * 0.1;
    const paddedMax = maxValue + range * 0.1;
    
    // Chart dimensions
    const margin = {
        top: 60,
        right: 40,
        bottom: 50,
        left: 80
    };
    
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const chartTop = margin.top;
    const chartLeft = margin.left;
    
    // Draw Y-axis
    drawYAxis(ctx, paddedMin, paddedMax, chartLeft, chartTop, chartWidth, chartHeight);
    
    // Draw legend
    drawLegend(ctx, chartLeft, chartTop);
    
    // Calculate box positions
    const numBoxes = allStats.length;
    const boxSpacing = chartWidth / (numBoxes + 1);
    const boxWidth = Math.min(boxSpacing * 0.6, 80);
    
    // Draw each box plot
    allStats.forEach((item, index) => {
        const x = chartLeft + boxSpacing * (index + 1);
        drawSingleBox(
            ctx,
            item.stats,
            x,
            boxWidth,
            chartTop,
            chartHeight,
            paddedMin,
            paddedMax,
            item.color,
            item.label
        );
    });
    
    // Draw chart title if provided
    if (options.title) {
        ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-primary').trim() || '#ffffff';
        ctx.font = `700 ${calculateFontSize(canvas) + 2}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(options.title, width / 2, 10);
    }
}
