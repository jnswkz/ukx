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

    const xScale = (width - 2 * margin) / (data.x.length - 1);
    const yMax = Math.max(...data.y);
    const yMin = Math.min(...data.y);
    const yScale = (height - margin) / (2 * (yMax - yMin));

    // write x data for each point (labels remain near bottom)
    const fontSize = calculate_font_size(ctx);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = calculate_font_color(backgroundColor);
    // ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    const minGap = 6; 
    const labelWidths = data.x.map(v => ctx.measureText(String(v)).width);
    const maxLabelWidth = labelWidths.length ? Math.max(...labelWidths) : 0;

    // calculate step to avoid label overlap
    const effectiveXScale = xScale > 0 ? xScale : (width - 2 * margin);
    const step = Math.max(1, Math.ceil((maxLabelWidth + minGap) / effectiveXScale));

    data.x.forEach((xValue, index) => {
        if (index !== 0 && (index % step !== 0)) return;
        const x = margin + index * xScale;
        ctx.fillText(String(xValue), x, height - 5);
    });

    for (let i = 0; i < data.x.length; i++) {
        const x = margin + i * xScale;
        const y = height - margin - (data.y[i] - yMin) * yScale;

        spawn_point(ctx, x, y, pointColor);

        if (i > 0) {
            const prevX = margin + (i - 1) * xScale;
            const prevY = height - margin - (data.y[i - 1] - yMin) * yScale;
            draw_line(ctx, prevX, prevY, x, y, lineColor);
        }
    }

}

export function drawLineGraph(canvasID, data, backgroundColor, lineColor, pointColor) {
    const canvas = document.getElementById(canvasID);
    const ctx = canvas.getContext('2d');
    const fontSize = calculate_font_size(ctx);
    draw(canvas, data, backgroundColor, lineColor, pointColor);
    canvas.addEventListener('mousemove', function(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        draw(canvas, data, backgroundColor, lineColor, pointColor);
        draw_dashed_line(ctx, x, lineColor);
    
        // find nearest point
        for (let i = 0; i < data.x.length; i++) {
            const pointX = 40 + i * ((canvas.width - 80) / (data.x.length - 1));
            const pointY = canvas.height - 40 - (data.y[i] - Math.min(...data.y)) * ((canvas.height - 80) / (Math.max(...data.y) - Math.min(...data.y)));
            if (Math.abs(pointX - x) < 10) {
                const tooltipText = `${data.x[i]}\n${data.y[i]}`;
                draw_tooltip(ctx, pointX + 10, pointY - 10, tooltipText, fontSize);
                break;
            }
        }
    });
    canvas.addEventListener('mouseleave', function(event) {
        draw(canvas, data, backgroundColor, lineColor, pointColor);
    });
}