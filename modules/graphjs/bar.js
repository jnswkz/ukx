function drawBarChart(canvasId, data, color1, color2) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas element with ID "${canvasId}" not found.`);
        return;
    }

    const ctx = canvas.getContext('2d');
    const { x, y } = data;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Max thêm 10% so với dữ liệu lớn nhất
    const maxY = Math.max(...y) * 1.1; 

    // Kích thước bar
    const barWidth = chartWidth / y.length - 20;
    const barGap = 20;

    // Vẽ trục tọa độ
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Gradient cho các bar
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);

    // Vẽ các bar
    ctx.fillStyle = gradient;
    for (let i = 0; i < y.length; i++) {
        const barHeight = (y[i] / maxY) * chartHeight;
        const barX = padding + i * (barWidth + barGap);
        const barY = canvas.height - padding - barHeight;

        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Nhãn giá trị cụa bar
        ctx.fillStyle = '#000';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(y[i], barX + barWidth / 2, barY + 20);

        // Nhãn trục X
        ctx.fillStyle = '#444';
        ctx.textAlign = 'center';
        ctx.fillText(x[i], barX + barWidth / 2, canvas.height - padding + 20);
        ctx.fillStyle = gradient; 
    }

    ctx.fillStyle = '#555';
    ctx.textAlign = 'right';
    ctx.font = '12px sans-serif';
    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
        const tickValue = (maxY / numTicks) * i;
        const tickY = canvas.height - padding - (tickValue / maxY) * chartHeight;
        ctx.fillText(tickValue.toFixed(0), padding - 10, tickY + 4);
        ctx.beginPath();
        ctx.moveTo(padding - 5, tickY);
        ctx.lineTo(padding, tickY);
        ctx.stroke();
    }
}
