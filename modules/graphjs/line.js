function calculate_font_color(backgroundColor) {
    const rgb = backgroundColor.match(/\d+/g).slice(0, 3).map(Number);
    const luminance = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
    return luminance > 186 ? '#000000' : '#FFFFFF';
}

function calculate_font_size(ctx)
{
    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;
    const base = Math.min(canvasW, canvasH);
    return Math.max(10, Math.round(base * 0.03)) > 12 ? Math.max(10, Math.round(base * 0.03)) : 12;
}

/**
 * Draw a data point (only visible when highlighted)
 */
function spawn_point(ctx, x, y, pointColor, isHighlighted = false) {
    // Only draw points when highlighted
    if (!isHighlighted) return;
    
    const radius = 6;
    
    // Outer glow
    ctx.shadowColor = pointColor;
    ctx.shadowBlur = 15;
    
    ctx.fillStyle = pointColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Inner white dot
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
}


/**
 * Draw line with smooth curves that pass through all points
 */
function draw_line(ctx, points, lineColor) {
    if (points.length < 2) return;
    
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    // Use cardinal spline to create smooth curve through all points
    if (points.length === 2) {
        // Just a straight line for 2 points
        ctx.lineTo(points[1].x, points[1].y);
    } else {
        // For 3+ points, use bezier curves that pass through each point
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];
            
            // Calculate control points for bezier curve
            const tension = 0.3; // Adjust curve smoothness (0 = straight, 1 = very smooth)
            
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
    }
    
    ctx.stroke();
}

/**
 * Draw vertical crosshair line
 */
function draw_dashed_line(ctx, x, margin, color = 'rgba(255, 255, 255, 0.3)') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, margin);
    ctx.lineTo(x, ctx.canvas.height - margin);
    ctx.stroke();
    ctx.setLineDash([]);
}

/**
 * Draw modern tooltip with formatted data
 */
function draw_tooltip(ctx, x, y, label, value, fontSize = 12, theme = null) {
    ctx.save();

    const font = `600 ${fontSize}px 'JetBrains Mono', 'Arial', monospace`;
    ctx.font = font;
    ctx.textBaseline = 'top'; 
    ctx.textAlign = 'left';

    const paddingX = 14;
    const paddingY = 12;
    const lineHeight = fontSize + 6;
    
    // Format value as currency
    const formattedValue = typeof value === 'number'
        ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
        : value;
    
    const labelWidth = ctx.measureText(label).width;
    const valueWidth = ctx.measureText(formattedValue).width;
    const boxWidth = Math.max(labelWidth, valueWidth) + paddingX * 2;
    const boxHeight = lineHeight * 2 + paddingY * 2 - 4;

    // Keep tooltip inside canvas
    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;
    let bx = x + 15;
    let by = y - boxHeight / 2; 

    if (bx + boxWidth + 10 > canvasW) bx = x - boxWidth - 15;
    if (bx < 10) bx = 10;
    if (by < 10) by = 10; 
    if (by + boxHeight + 10 > canvasH) by = canvasH - boxHeight - 10;

    // Use theme colors if provided, otherwise fallback to dark theme
    const tooltipBg = theme?.tooltip?.bg || 'rgba(40, 42, 46, 0.95)';
    const tooltipBorder = theme?.tooltip?.border || 'rgba(60, 62, 66, 0.8)';
    const tooltipText = theme?.tooltip?.text || '#ffffff';
    const tooltipLabel = theme?.tooltip?.label || 'rgba(160, 160, 160, 0.9)';
    
    // Subtle shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    // Tooltip background
    ctx.fillStyle = tooltipBg;
    ctx.strokeStyle = tooltipBorder;
    ctx.lineWidth = 1;

    // Draw rounded rectangle
    const r = 6;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.arcTo(bx + boxWidth, by, bx + boxWidth, by + boxHeight, r);
    ctx.arcTo(bx + boxWidth, by + boxHeight, bx, by + boxHeight, r);
    ctx.arcTo(bx, by + boxHeight, bx, by, r);
    ctx.arcTo(bx, by, bx + boxWidth, by, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Reset shadow for text
    ctx.shadowColor = 'transparent';
    
    // Draw value (large)
    ctx.fillStyle = tooltipText;
    ctx.font = `600 ${fontSize + 1}px 'JetBrains Mono', 'Arial', monospace`;
    ctx.fillText(formattedValue, bx + paddingX, by + paddingY);
    
    // Draw label (smaller)
    ctx.fillStyle = tooltipLabel;
    ctx.font = `400 ${fontSize - 2}px 'JetBrains Mono', 'Arial', monospace`;
    ctx.fillText(label, bx + paddingX, by + paddingY + lineHeight);

    ctx.restore();
}
/**
 * Main drawing function with improved rendering
 */
function draw(canvas, data, theme, highlightIndex = -1) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Support both old API (backgroundColor, lineColor, pointColor) and new API (theme object)
    let backgroundColor, lineColor, pointColor, gridColor, textColor;
    
    if (typeof theme === 'string') {
        // Old API: draw(canvas, data, backgroundColor, lineColor, pointColor, highlightIndex)
        backgroundColor = theme;
        lineColor = highlightIndex;
        pointColor = arguments[4];
        highlightIndex = arguments[5] || -1;
        gridColor = 'rgba(255, 255, 255, 0.05)';
        textColor = 'rgba(216, 222, 233, 0.8)';
        theme = null;
    } else {
        // New API: draw(canvas, data, theme, highlightIndex)
        backgroundColor = theme.background;
        lineColor = theme.line;
        pointColor = theme.point;
        gridColor = theme.grid || 'rgba(255, 255, 255, 0.05)';
        textColor = theme.text || 'rgba(216, 222, 233, 0.8)';
    }

    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const margin = { top: 20, right: 20, bottom: 35, left: 15 };

    // Ensure arrays and numeric values
    const xs = Array.isArray(data.x) ? data.x : [];
    const ys = Array.isArray(data.y) ? data.y.map(Number) : [];

    if (xs.length === 0 || ys.length === 0 || xs.length !== ys.length) {
        ctx.fillStyle = calculate_font_color(backgroundColor);
        ctx.textAlign = 'center';
        ctx.font = `${calculate_font_size(ctx)}px Arial`;
        ctx.fillText('No chart data', width / 2, height / 2);
        return;
    }

    const xCount = xs.length;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const xScale = xCount > 1 ? chartWidth / (xCount - 1) : 0;

    const yMax = Math.max(...ys);
    const yMin = Math.min(...ys);
    const yRange = (yMax === yMin) ? (Math.abs(yMax) > 0 ? Math.abs(yMax) * 0.1 : 1) : (yMax - yMin);
    const yScale = chartHeight / yRange;

    // Draw subtle grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
        const y = margin.top + (chartHeight / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(width - margin.right, y);
        ctx.stroke();
    }
    
    // Y-axis labels (only min and max)
    const fontSize = calculate_font_size(ctx);
    ctx.font = `${fontSize - 3}px 'JetBrains Mono', Arial`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // Max value at top
    const maxLabel = yMax >= 1000 
        ? `$${(yMax / 1000).toFixed(3)}`.replace(/\.?0+$/, '') + 'k'
        : `$${yMax.toFixed(0)}`;
    ctx.fillText(maxLabel, margin.left, margin.top);
    
    // Min value at bottom
    const minLabel = yMin >= 1000 
        ? `$${(yMin / 1000).toFixed(3)}`.replace(/\.?0+$/, '') + 'k'
        : `$${yMin.toFixed(0)}`;
    ctx.fillText(minLabel, margin.left, height - margin.bottom);

    // Draw X-axis labels (date format)
    ctx.font = `${fontSize - 3}px 'JetBrains Mono', Arial`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Calculate optimal label count based on canvas width
    const maxLabels = Math.floor(chartWidth / 70);
    const step = Math.max(1, Math.floor(xCount / maxLabels));

    xs.forEach((xValue, index) => {
        if (index % step !== 0 && index !== xCount - 1) return;
        const x = margin.left + index * xScale;
        
        // Format as date (e.g., "Sep 02" or "10/02")
        let label = String(xValue);
        if (label.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const date = new Date(label);
            // For short labels, use MM/DD format
            label = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        }
        
        ctx.fillText(label, x, height - margin.bottom + 5);
    });

    // Calculate points for smooth line
    const points = [];
    for (let i = 0; i < xCount; i++) {
        const x = margin.left + i * xScale;
        const y = margin.top + chartHeight - ((ys[i] - yMin) * yScale);
        points.push({ x, y, index: i });
    }

    // Draw the line
    draw_line(ctx, points, lineColor);

    // Draw points (only highlighted one)
    ctx.shadowBlur = 0;
    points.forEach((point, i) => {
        const isHighlight = i === highlightIndex;
        spawn_point(ctx, point.x, point.y, pointColor, isHighlight);
    });
}
export function drawLineGraph(canvasID, data, themeOrBgColor, lineColor, pointColor) {
    console.log(data);
    const canvas = document.getElementById(canvasID);
    if (!canvas) return;

    // make the drawing buffer match the displayed (CSS) size
    const rect = canvas.getBoundingClientRect();
    const layoutW = Math.max(1, Math.round(rect.width));
    const layoutH = Math.max(1, Math.round(rect.height));
    if (canvas.width !== layoutW || canvas.height !== layoutH) {
        canvas.width = layoutW;
        canvas.height = layoutH;
    }

    const ctx = canvas.getContext('2d');
    const fontSize = calculate_font_size(ctx);
    
    // Support both old API and new theme API
    let theme;
    if (typeof themeOrBgColor === 'object' && themeOrBgColor !== null) {
        // New API: theme object passed
        theme = themeOrBgColor;
    } else {
        // Old API: individual color parameters
        theme = {
            background: themeOrBgColor,
            line: lineColor,
            point: pointColor,
            grid: 'rgba(255, 255, 255, 0.05)',
            text: 'rgba(216, 222, 233, 0.8)'
        };
    }
    
    // Store theme for later use
    canvas._chartTheme = theme;
    
    // Initialize zoom and pan state
    const xs = Array.isArray(data.x) ? data.x : [];
    const totalPoints = xs.length;
    
    // Always reset state when drawing new data to show all points
    // The time period filtering is handled by the caller (dashboard.js)
    canvas._chartState = {
        zoom: 1,
        panX: 0,
        panY: 0,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0,
        minZoom: 0.5,
        maxZoom: 10,
        initialZoom: 1
    };
    
    const state = canvas._chartState;
    
    // Function to get visible data range based on zoom and pan
    function getVisibleData() {
        const xs = Array.isArray(data.x) ? data.x : [];
        const ys = Array.isArray(data.y) ? data.y.map(Number) : [];
        
        if (xs.length === 0 || ys.length === 0) return { x: [], y: [] };
        
        // Calculate visible range
        const totalPoints = xs.length;
        const visiblePoints = Math.max(1, Math.ceil(totalPoints / state.zoom));
        
        // Calculate center based on pan
        const panFactor = state.panX / (canvas.width || 1);
        const centerIndex = Math.floor(totalPoints / 2) - Math.floor(panFactor * totalPoints);
        
        // Calculate start and end indices
        let startIndex = Math.floor(centerIndex - visiblePoints / 2);
        let endIndex = Math.ceil(centerIndex + visiblePoints / 2);
        
        // Clamp to valid range
        if (startIndex < 0) {
            endIndex = Math.min(totalPoints, endIndex - startIndex);
            startIndex = 0;
        }
        if (endIndex > totalPoints) {
            startIndex = Math.max(0, startIndex - (endIndex - totalPoints));
            endIndex = totalPoints;
        }
        
        return {
            x: xs.slice(startIndex, endIndex),
            y: ys.slice(startIndex, endIndex),
            startIndex: startIndex
        };
    }
    
    // Draw with current zoom/pan state
    function redraw() {
        const visibleData = getVisibleData();
        draw(canvas, visibleData, theme);
    }
    
    redraw();

    // Wheel zoom handler
    canvas.addEventListener('wheel', function(event) {
        event.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
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
            state.isDragging = true;
            state.lastMouseX = event.clientX;
            state.lastMouseY = event.clientY;
            canvas.style.cursor = 'grabbing';
        }
    });
    
    // Mouse move - drag or hover
    canvas.addEventListener('mousemove', function(event) {
        if (state.isDragging) {
            // Dragging mode
            const deltaX = event.clientX - state.lastMouseX;
            const deltaY = event.clientY - state.lastMouseY;
            
            state.panX += deltaX;
            state.panY += deltaY;
            
            state.lastMouseX = event.clientX;
            state.lastMouseY = event.clientY;
            
            redraw();
            return;
        }
        
        // Hover mode (tooltip)
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        
        const visibleData = getVisibleData();
        const xs = visibleData.x;
        const ys = visibleData.y;
        if (xs.length === 0 || ys.length === 0) return;

        const margin = { top: 20, right: 20, bottom: 35, left: 15 };
        const xCount = xs.length;
        const chartWidth = canvas.width - margin.left - margin.right;
        const chartHeight = canvas.height - margin.top - margin.bottom;
        const xScale = xCount > 1 ? chartWidth / (xCount - 1) : 0;
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const yRange = (maxY === minY) ? (Math.abs(maxY) > 0 ? Math.abs(maxY) * 0.1 : 1) : (maxY - minY);
        const yScale = chartHeight / yRange;

        let closestIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < xs.length; i++) {
            const pointX = margin.left + i * xScale;
            const distance = Math.abs(pointX - mouseX);
            
            if (distance < minDistance && distance < 30) {
                minDistance = distance;
                closestIndex = i;
            }
        }

        if (closestIndex !== -1) {
            const pointX = margin.left + closestIndex * xScale;
            const pointY = margin.top + chartHeight - ((ys[closestIndex] - minY) * yScale);
            
            draw(canvas, visibleData, theme, closestIndex);
            
            // Use theme color for crosshair
            const crosshairColor = theme.text || 'rgba(255, 255, 255, 0.3)';
            draw_dashed_line(ctx, pointX, margin.top, crosshairColor);
            
            // Format label as date
            let label = String(xs[closestIndex]);
            if (label.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const date = new Date(label + 'T00:00:00'); // Add time to avoid timezone issues
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                label = `${dayName} ${dateStr}`;
            }
            
            draw_tooltip(ctx, pointX, pointY, label, ys[closestIndex], fontSize, theme);
            canvas.style.cursor = 'crosshair';
        } else {
            redraw();
            canvas.style.cursor = state.zoom > 1 ? 'grab' : 'default';
        }
    }, { passive: true });
    
    // Mouse up - stop dragging
    canvas.addEventListener('mouseup', function(event) {
        if (event.button === 0) {
            state.isDragging = false;
            canvas.style.cursor = state.zoom > 1 ? 'grab' : 'default';
        }
    });

    canvas.addEventListener('mouseleave', function() {
        state.isDragging = false;
        redraw();
    }, { passive: true });
    
    // Double-click to reset to initial view
    canvas.addEventListener('dblclick', function(event) {
        event.preventDefault();
        
        state.zoom = 1;
        state.panX = 0;
        state.panY = 0;
        
        redraw();
        canvas.style.cursor = 'default';
    });
}