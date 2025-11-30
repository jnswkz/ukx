/**
 * Candlestick Chart Module
 * Professional trading chart with candlesticks and volume
 */

/**
 * Calculate font size based on canvas dimensions
 */
function calculateFontSize(canvas) {
    const base = Math.min(canvas.width, canvas.height);
    return Math.max(10, Math.round(base * 0.018));
}

/**
 * Format price for display
 */
function formatPrice(price) {
    if (price >= 1000) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    } else {
        return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 });
    }
}

/**
 * Format volume for display
 */
function formatVolume(volume) {
    if (volume >= 1e6) {
        return (volume / 1e6).toFixed(1) + 'M';
    } else if (volume >= 1e3) {
        return (volume / 1e3).toFixed(1) + 'K';
    } else {
        return volume.toFixed(0);
    }
}

/**
 * Draw Y-axis with price labels
 */
function drawYAxis(ctx, minPrice, maxPrice, chartLeft, chartTop, chartHeight, fontSize) {
    const textColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--text-secondary').trim() || 'rgba(160, 160, 160, 0.9)';
    const gridColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--border-color').trim() || 'rgba(255, 255, 255, 0.05)';
    
    ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    const numTicks = 6;
    const range = maxPrice - minPrice;
    
    for (let i = 0; i <= numTicks; i++) {
        const price = minPrice + (range / numTicks) * i;
        const y = chartTop + chartHeight - (chartHeight / numTicks) * i;
        
        // Ensure labels stay within visible area
        const clampedY = Math.max(chartTop + fontSize/2, Math.min(y, chartTop + chartHeight - fontSize/2));
        
        // Draw horizontal grid line
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartLeft, y);
        ctx.lineTo(ctx.canvas.width - 20, y);
        ctx.stroke();
        
        // Draw price label with proper spacing
        ctx.fillText(formatPrice(price), chartLeft - 15, clampedY);
    }
}

/**
 * Draw X-axis with time labels
 */
function drawXAxis(ctx, candles, chartLeft, chartTop, chartHeight, candleWidth, candleSpacing, fontSize) {
    const textColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--text-secondary').trim() || 'rgba(160, 160, 160, 0.9)';
    
    ctx.font = `${fontSize}px 'Barlow', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const labelInterval = Math.max(1, Math.floor(candles.length / 8));
    
    candles.forEach((candle, i) => {
        if (i % labelInterval !== 0 && i !== candles.length - 1) return;
        
        const x = chartLeft + i * (candleWidth + candleSpacing) + candleWidth / 2;
        const y = chartTop + chartHeight + 5;
        
        // Format time label
        let label = candle.time;
        if (typeof label === 'string') {
            // If it's a date string
            const date = new Date(label);
            if (!isNaN(date.getTime())) {
                label = date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                });
            }
        }
        
        ctx.fillText(label, x, y);
    });
}

/**
 * Draw a single candlestick
 */
function drawCandle(ctx, candle, x, width, chartTop, chartHeight, minPrice, maxPrice) {
    const isGreen = candle.close >= candle.open;
    const greenColor = '#22c55e';
    const redColor = '#ef4444';
    const color = isGreen ? greenColor : redColor;
    
    const priceRange = maxPrice - minPrice;
    const scale = priceRange > 0 ? chartHeight / priceRange : 1;
    
    // Convert prices to Y coordinates with safety checks
    const openY = chartTop + chartHeight - ((candle.open - minPrice) * scale);
    const closeY = chartTop + chartHeight - ((candle.close - minPrice) * scale);
    const highY = chartTop + chartHeight - ((candle.high - minPrice) * scale);
    const lowY = chartTop + chartHeight - ((candle.low - minPrice) * scale);
    
    // Ensure coordinates are within bounds
    const clampedHighY = Math.max(chartTop, Math.min(highY, chartTop + chartHeight));
    const clampedLowY = Math.max(chartTop, Math.min(lowY, chartTop + chartHeight));
    const clampedOpenY = Math.max(chartTop, Math.min(openY, chartTop + chartHeight));
    const clampedCloseY = Math.max(chartTop, Math.min(closeY, chartTop + chartHeight));
    
    // Draw wick (high-low line) with minimum visible length
    const wickLength = Math.abs(clampedLowY - clampedHighY);
    if (wickLength > 0.5) {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, width * 0.1);
        ctx.beginPath();
        ctx.moveTo(x + width / 2, clampedHighY);
        ctx.lineTo(x + width / 2, clampedLowY);
        ctx.stroke();
    }
    
    // Draw body (open-close rectangle)
    const bodyTop = Math.min(clampedOpenY, clampedCloseY);
    const bodyHeight = Math.abs(clampedCloseY - clampedOpenY);
    const minBodyHeight = 2; // Minimum visible height for better visibility
    
    ctx.fillStyle = color;
    
    if (bodyHeight < minBodyHeight) {
        // Doji or very small body - draw as a thicker horizontal line
        ctx.fillRect(x, bodyTop - minBodyHeight/2, width, minBodyHeight);
    } else {
        // Normal candle body
        ctx.fillRect(x, bodyTop, width, bodyHeight);
    }
}

/**
 * Draw volume bars
 */
function drawVolume(ctx, candles, chartLeft, volumeTop, volumeHeight, candleWidth, candleSpacing) {
    if (!candles || candles.length === 0) return;
    
    const maxVolume = Math.max(...candles.map(c => c.volume || 0));
    if (maxVolume === 0) return;
    
    const greenColor = 'rgba(34, 197, 94, 0.5)';
    const redColor = 'rgba(239, 68, 68, 0.5)';
    
    candles.forEach((candle, i) => {
        const isGreen = candle.close >= candle.open;
        const color = isGreen ? greenColor : redColor;
        const volume = candle.volume || 0;
        
        const barHeight = (volume / maxVolume) * volumeHeight;
        const x = chartLeft + i * (candleWidth + candleSpacing);
        const y = volumeTop + volumeHeight - barHeight;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, candleWidth, barHeight);
    });
    
    // Draw volume label
    const textColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--text-secondary').trim() || 'rgba(160, 160, 160, 0.9)';
    const fontSize = calculateFontSize(ctx.canvas);
    
    ctx.font = `${fontSize}px 'Barlow', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Volume ${formatVolume(candles[candles.length - 1].volume || 0)}`, chartLeft, volumeTop + 5);
}

/**
 * Draw current price indicator
 */
function drawCurrentPriceIndicator(ctx, currentPrice, chartLeft, chartTop, chartHeight, chartWidth, minPrice, maxPrice) {
    const scale = chartHeight / (maxPrice - minPrice);
    const y = chartTop + chartHeight - ((currentPrice - minPrice) * scale);
    
    const priceColor = '#22c55e';
    
    // Draw horizontal dashed line
    ctx.strokeStyle = priceColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartLeft + chartWidth, y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw price label box on the right
    const priceText = formatPrice(currentPrice);
    const fontSize = calculateFontSize(ctx.canvas);
    ctx.font = `600 ${fontSize}px 'JetBrains Mono', monospace`;
    
    const padding = 6;
    const textWidth = ctx.measureText(priceText).width;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = fontSize + padding * 2;
    const boxX = chartLeft + chartWidth;
    const boxY = y - boxHeight / 2;
    
    // Draw box
    ctx.fillStyle = priceColor;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    
    // Draw text
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceText, boxX + padding, y);
}

/**
 * Draw crosshair and tooltip on hover
 */
function drawCrosshair(ctx, mouseX, mouseY, candle, chartLeft, chartTop, chartHeight, chartWidth) {
    const crosshairColor = 'rgba(255, 255, 255, 0.3)';
    
    // Vertical line
    ctx.strokeStyle = crosshairColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(mouseX, chartTop);
    ctx.lineTo(mouseX, chartTop + chartHeight);
    ctx.stroke();
    
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(chartLeft, mouseY);
    ctx.lineTo(chartLeft + chartWidth, mouseY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw tooltip with OHLCV data
    if (candle) {
        const fontSize = calculateFontSize(ctx.canvas);
        const padding = 12;
        const lineHeight = fontSize + 4;
        
        const lines = [
            `O: ${formatPrice(candle.open)}`,
            `H: ${formatPrice(candle.high)}`,
            `L: ${formatPrice(candle.low)}`,
            `C: ${formatPrice(candle.close)}`,
            `V: ${formatVolume(candle.volume || 0)}`
        ];
        
        ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
        const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
        const boxWidth = maxWidth + padding * 2;
        const boxHeight = lines.length * lineHeight + padding * 2;
        
        // Position tooltip
        let tooltipX = mouseX + 15;
        let tooltipY = mouseY - boxHeight / 2;
        
        // Keep tooltip inside canvas
        if (tooltipX + boxWidth > chartLeft + chartWidth) {
            tooltipX = mouseX - boxWidth - 15;
        }
        if (tooltipY < chartTop) tooltipY = chartTop;
        if (tooltipY + boxHeight > chartTop + chartHeight) {
            tooltipY = chartTop + chartHeight - boxHeight;
        }
        
        // Draw tooltip background
        ctx.fillStyle = 'rgba(40, 42, 46, 0.95)';
        ctx.strokeStyle = 'rgba(60, 62, 66, 0.8)';
        ctx.lineWidth = 1;
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 2;
        
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, boxWidth, boxHeight, 6);
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowColor = 'transparent';
        
        // Draw tooltip text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        lines.forEach((line, i) => {
            const color = i === 3 ? (candle.close >= candle.open ? '#22c55e' : '#ef4444') : '#ffffff';
            ctx.fillStyle = color;
            ctx.fillText(line, tooltipX + padding, tooltipY + padding + i * lineHeight);
        });
    }
}

/**
 * Main function to draw candlestick chart
 * @param {string} canvasId - Canvas element ID
 * @param {Array} candles - Array of candle objects with {time, open, high, low, close, volume}
 * @param {Object} options - Drawing options
 */
export function drawCandlestickChart(canvasId, candles, options = {}) {
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
            .getPropertyValue('--card-background').trim() || '#0a0b0d';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    if (!candles || candles.length === 0) {
        ctx.fillStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-secondary').trim() || '#666';
        ctx.font = `${calculateFontSize(canvas)}px 'Barlow', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No data available', width / 2, height / 2);
        return;
    }
    
    // Calculate dimensions with proper margins
    const margin = {
        top: 30,
        right: 90,
        bottom: 60,
        left: 90
    };
    
    const volumeRatio = 0.2; // Volume takes 20% of height
    const chartHeight = (height - margin.top - margin.bottom) * (1 - volumeRatio);
    const volumeHeight = (height - margin.top - margin.bottom) * volumeRatio;
    
    const chartTop = margin.top;
    const chartLeft = margin.left;
    const chartWidth = width - margin.left - margin.right;
    const volumeTop = chartTop + chartHeight + 10;
    
    // Calculate candle dimensions
    const numCandles = candles.length;
    const availableWidth = chartWidth;
    const candleSpacing = 2;
    const candleWidth = Math.max(2, (availableWidth - (numCandles - 1) * candleSpacing) / numCandles);
    
    // Find price range with proper padding
    const allPrices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    
    // Ensure minimum visible range when prices are very close
    // Use percentage of average price to handle high-value assets
    const avgPrice = (minPrice + maxPrice) / 2;
    const minVisibleRange = avgPrice * 0.02; // At least 2% of average price
    const effectiveRange = Math.max(priceRange, minVisibleRange);
    
    // Apply padding - more on bottom, less on top to ensure highest price is always visible
    const paddingPercentBottom = 0.12; // 12% padding on bottom
    const paddingPercentTop = 0.08; // 8% padding on top (less to keep high prices visible)
    const paddingBottom = effectiveRange * paddingPercentBottom;
    const paddingTop = effectiveRange * paddingPercentTop;
    
    // Calculate padded bounds with asymmetric padding
    // Always use actual min/max prices, not centered range
    const paddedMin = minPrice - paddingBottom;
    const paddedMax = maxPrice + paddingTop;
    
    // Ensure we never clip the actual price range
    const finalMin = Math.min(paddedMin, minPrice - paddingBottom);
    const finalMax = Math.max(paddedMax, maxPrice + paddingTop);
    
    const fontSize = calculateFontSize(canvas);
    
    // Draw Y-axis and grid
    drawYAxis(ctx, finalMin, finalMax, chartLeft, chartTop, chartHeight, fontSize);
    
    // Draw candlesticks
    candles.forEach((candle, i) => {
        const x = chartLeft + i * (candleWidth + candleSpacing);
        drawCandle(ctx, candle, x, candleWidth, chartTop, chartHeight, finalMin, finalMax);
    });
    
    // Draw volume bars
    drawVolume(ctx, candles, chartLeft, volumeTop, volumeHeight, candleWidth, candleSpacing);
    
    // Draw X-axis
    drawXAxis(ctx, candles, chartLeft, chartTop, chartHeight, candleWidth, candleSpacing, fontSize);
    
    // Draw current price indicator
    const currentPrice = candles[candles.length - 1].close;
    drawCurrentPriceIndicator(ctx, currentPrice, chartLeft, chartTop, chartHeight, chartWidth, finalMin, finalMax);
    
    // Store data for interactivity
    canvas._candleData = {
        candles,
        chartLeft,
        chartTop,
        chartHeight,
        chartWidth,
        candleWidth,
        candleSpacing,
        paddedMin: finalMin,
        paddedMax: finalMax,
        fontSize
    };
}

/**
 * Add interactive crosshair, zoom, and drag to canvas
 */
export function addCandlestickInteractivity(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !canvas._candleData) return;
    
    // Initialize zoom and pan state
    if (!canvas._chartState) {
        canvas._chartState = {
            zoom: 1,
            panX: 0,
            isDragging: false,
            lastMouseX: 0,
            minZoom: 0.5,
            maxZoom: 10,
            originalCandles: canvas._candleData.candles
        };
    }
    
    const state = canvas._chartState;
    
    // Store original candles
    state.originalCandles = canvas._candleData.candles;
    
    // Function to get visible candles based on zoom and pan
    function getVisibleCandles() {
        const allCandles = state.originalCandles;
        const totalCandles = allCandles.length;
        
        if (totalCandles === 0) return [];
        
        // Calculate visible range
        const visibleCount = Math.max(5, Math.ceil(totalCandles / state.zoom));
        
        // Calculate center based on pan
        const panFactor = state.panX / (canvas.width || 1);
        const centerIndex = Math.floor(totalCandles / 2) - Math.floor(panFactor * totalCandles);
        
        // Calculate start and end indices
        let startIndex = Math.floor(centerIndex - visibleCount / 2);
        let endIndex = Math.ceil(centerIndex + visibleCount / 2);
        
        // Clamp to valid range
        if (startIndex < 0) {
            endIndex = Math.min(totalCandles, endIndex - startIndex);
            startIndex = 0;
        }
        if (endIndex > totalCandles) {
            startIndex = Math.max(0, startIndex - (endIndex - totalCandles));
            endIndex = totalCandles;
        }
        
        return allCandles.slice(startIndex, endIndex);
    }
    
    // Function to redraw with current zoom/pan
    function redraw() {
        const visibleCandles = getVisibleCandles();
        drawCandlestickChart(canvasId, visibleCandles);
        canvas._candleData.candles = visibleCandles;
    }
    
    // Wheel zoom handler
    canvas.addEventListener('wheel', function(event) {
        event.preventDefault();
        
        // Zoom in or out
        const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = state.zoom * zoomDelta;
        
        // Clamp zoom
        if (newZoom >= state.minZoom && newZoom <= state.maxZoom) {
            state.zoom = newZoom;
            redraw();
        }
    }, { passive: false });
    
    // Mouse down - start dragging
    canvas.addEventListener('mousedown', function(event) {
        if (event.button === 0) { // Left mouse button
            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const data = canvas._candleData;
            
            // Only allow dragging in chart area
            if (mouseX >= data.chartLeft && mouseX <= data.chartLeft + data.chartWidth) {
                state.isDragging = true;
                state.lastMouseX = event.clientX;
                canvas.style.cursor = 'grabbing';
            }
        }
    });
    
    // Mouse move - drag or hover
    canvas.addEventListener('mousemove', function(event) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const data = canvas._candleData;
        
        if (state.isDragging) {
            // Dragging mode
            const deltaX = event.clientX - state.lastMouseX;
            state.panX += deltaX;
            state.lastMouseX = event.clientX;
            redraw();
            return;
        }
        
        // Hover mode (tooltip)
        // Check if mouse is in chart area
        if (mouseX < data.chartLeft || mouseX > data.chartLeft + data.chartWidth ||
            mouseY < data.chartTop || mouseY > data.chartTop + data.chartHeight) {
            canvas.style.cursor = state.zoom > 1 ? 'grab' : 'default';
            return;
        }
        
        canvas.style.cursor = 'crosshair';
        
        // Find which candle we're hovering over
        const relativeX = mouseX - data.chartLeft;
        const candleIndex = Math.floor(relativeX / (data.candleWidth + data.candleSpacing));
        
        if (candleIndex >= 0 && candleIndex < data.candles.length) {
            const candle = data.candles[candleIndex];
            
            // Redraw everything
            redraw();
            
            // Draw crosshair and tooltip
            const ctx = canvas.getContext('2d');
            drawCrosshair(ctx, mouseX, mouseY, candle, 
                data.chartLeft, data.chartTop, data.chartHeight, data.chartWidth);
        }
    });
    
    // Mouse up - stop dragging
    canvas.addEventListener('mouseup', function(event) {
        if (event.button === 0) {
            state.isDragging = false;
            canvas.style.cursor = state.zoom > 1 ? 'grab' : 'crosshair';
        }
    });
    
    // Mouse leave
    canvas.addEventListener('mouseleave', function() {
        state.isDragging = false;
        redraw();
        canvas.style.cursor = 'default';
    });
    
    // Double-click to reset to initial view
    canvas.addEventListener('dblclick', function(event) {
        event.preventDefault();
        
        state.zoom = 1;
        state.panX = 0;
        
        redraw();
        canvas.style.cursor = 'default';
    });
    
    // Touch support for mobile
    let touchStartX = 0;
    let touchStartDistance = 0;
    
    canvas.addEventListener('touchstart', function(event) {
        if (event.touches.length === 1) {
            // Single touch - pan
            state.isDragging = true;
            touchStartX = event.touches[0].clientX;
            state.lastMouseX = touchStartX;
        } else if (event.touches.length === 2) {
            // Two touches - zoom
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        }
    }, { passive: true });
    
    canvas.addEventListener('touchmove', function(event) {
        event.preventDefault();
        
        if (event.touches.length === 1 && state.isDragging) {
            // Pan
            const deltaX = event.touches[0].clientX - state.lastMouseX;
            state.panX += deltaX;
            state.lastMouseX = event.touches[0].clientX;
            redraw();
        } else if (event.touches.length === 2) {
            // Zoom
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (touchStartDistance > 0) {
                const zoomDelta = distance / touchStartDistance;
                const newZoom = state.zoom * zoomDelta;
                
                if (newZoom >= state.minZoom && newZoom <= state.maxZoom) {
                    state.zoom = newZoom;
                    redraw();
                }
            }
            
            touchStartDistance = distance;
        }
    }, { passive: false });
    
    canvas.addEventListener('touchend', function() {
        state.isDragging = false;
        touchStartDistance = 0;
    }, { passive: true });
}
