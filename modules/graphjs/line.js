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

function spawn_point(ctx, x, y, pointColor) {
    // console.log(`Spawned point at (${x}, ${y})`);
    const radius = 3;
    ctx.fillStyle = pointColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
}


function draw_line(ctx, x1, y1, x2, y2, lineColor) {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function draw_dashed_line(ctx, x, lineColor) {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ctx.canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

}

function draw_tooltip(ctx, x, y, text, fontSize = 12) {
    ctx.save();

    ctx.font = `${fontSize}px Arial`;
    ctx.textBaseline = 'middle'; 
    ctx.textAlign = 'left';

    const paddingX =  10;
    const paddingY = 10;
    const textWidth = ctx.measureText(text).width;
    const boxWidth = textWidth ;
    const boxHeight = 18 + paddingY*2;

    // keep tooltip stays inside canvas
    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;
    let bx = x;
    let by = y - boxHeight - 12; 

    if (bx + boxWidth + 8 > canvasW) bx = canvasW - boxWidth - 8;
    if (bx < 8) bx = 8;
    if (by < 8) by = y + 8; 
    if (by + boxHeight + 8 > canvasH) by = canvasH - boxHeight - 8;

    // shadow and box
    ctx.shadowColor = 'rgba(56, 51, 51, 0.35)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(196, 209, 210, 0.98)';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 1;

    // draw rounded rectangle
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

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // text
    ctx.fillStyle = '#000';
    ctx.shadowColor = 'transparent';
    var lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], bx + paddingX, by + paddingY + i * (fontSize + 2));
    }
    

    ctx.restore();
}
function draw(canvas, data, backgroundColor, lineColor, pointColor) {

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const margin = 40;

    // defensive: ensure arrays and numeric values
    const xs = Array.isArray(data.x) ? data.x : [];
    const ys = Array.isArray(data.y) ? data.y.map(Number) : [];

    if (xs.length === 0 || ys.length === 0 || xs.length !== ys.length) {
        
        ctx.fillStyle = calculate_font_color(backgroundColor);
        ctx.textAlign = 'center';
        ctx.font = `${Math.max(12, Math.round(Math.min(width, height) * 0.035))}px Arial`;
        ctx.fillText('No chart data', width / 2, height / 2);
        return;
    }

    const xCount = xs.length;
    const xScale = xCount > 1 ? (width - 2 * margin) / (xCount - 1) : 0;

    const yMax = Math.max(...ys);
    const yMin = Math.min(...ys);
    // avoid division by zero when all values equal
    const yRange = (yMax === yMin) ? (Math.abs(yMax) > 0 ? Math.abs(yMax) * 0.1 : 1) : (yMax - yMin);
    const yScale = (height - 2 * margin) / yRange;

    // write x labels
    const fontSize = calculate_font_size(ctx);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = calculate_font_color(backgroundColor);
    ctx.textAlign = 'center';

    const minGap = 6;
    const labelWidths = xs.map(v => ctx.measureText(String(v)).width);
    const maxLabelWidth = labelWidths.length ? Math.max(...labelWidths) : 0;
    const effectiveXScale = xScale > 0 ? xScale : (width - 2 * margin);
    const step = Math.max(1, Math.ceil((maxLabelWidth + minGap) / effectiveXScale));

    xs.forEach((xValue, index) => {
        if (index !== 0 && (index % step !== 0)) return;
        const x = margin + index * xScale;
        ctx.fillText(String(xValue), x, height - 5);
    });

    for (let i = 0; i < xCount; i++) {
        const x = margin + i * xScale;
        const y = height - margin - ((ys[i] - yMin) * yScale);

        spawn_point(ctx, x, y, pointColor);

        if (i > 0 && xScale !== 0) {
            const prevX = margin + (i - 1) * xScale;
            const prevY = height - margin - ((ys[i - 1] - yMin) * yScale);
            draw_line(ctx, prevX, prevY, x, y, lineColor);
        }
    }

}
export function drawLineGraph(canvasID, data, backgroundColor, lineColor, pointColor) {
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
    draw(canvas, data, backgroundColor, lineColor, pointColor);

    canvas.addEventListener('mousemove', function(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        draw(canvas, data, backgroundColor, lineColor, pointColor);
        draw_dashed_line(ctx, x, lineColor);

        const xs = Array.isArray(data.x) ? data.x : [];
        const ys = Array.isArray(data.y) ? data.y.map(Number) : [];
        if (xs.length === 0 || ys.length === 0) return;

        const margin = 40;
        const xCount = xs.length;
        const xScale = xCount > 1 ? (canvas.width - 2 * margin) / (xCount - 1) : 0;
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const yRange = (maxY === minY) ? (Math.abs(maxY) > 0 ? Math.abs(maxY) * 0.1 : 1) : (maxY - minY);
        const yScale = (canvas.height - 2 * margin) / yRange;

        for (let i = 0; i < xs.length; i++) {
            const pointX = margin + i * xScale;
            const pointY = canvas.height - margin - (ys[i] - minY) * yScale;
            if (Math.abs(pointX - x) < 10) {
                const tooltipText = `${xs[i]}\n${ys[i]}`;
                draw_tooltip(ctx, pointX + 10, pointY - 10, tooltipText, fontSize);
                break;
            }
        }
    }, { passive: true });

    canvas.addEventListener('mouseleave', function() {
        draw(canvas, data, backgroundColor, lineColor, pointColor);
    }, { passive: true });
}