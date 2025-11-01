
function drawLineGraph(canvasID, data, backgroundColor, lineColor, pointColor) {

    function spawn_point(ctx, x, y) {
        const radius = 5;
        ctx.fillStyle = pointColor;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
    }


    function draw_line(x1, y1, x2, y2) {
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }




    const canvas = document.getElementById(canvasID);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const xScale = width / (data.x.length -1);
    const yMax = Math.max(...data.y);
    const yMin = Math.min(...data.y);
    const yScale = height / (yMax - yMin);

    for (let i = 0; i < data.x.length; i++) {
        const x = i * xScale;
        const y = height - (data.y[i] - yMin) * yScale;
        
        spawn_point(ctx, x, y);
        if (i > 0) {
            const prevX = (i - 1) * xScale;
            const prevY = height - (data.y[i - 1] - yMin) * yScale;
            draw_line(prevX, prevY, x, y);
        }
    }
}
