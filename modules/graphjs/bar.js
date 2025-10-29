/**
 * Draws a bar chart on a canvas element.
 *
 * @param {Array<Object>} data - The data to be plotted. Each object should have a 'label' and a 'value'. Optionally 'time' for hover.
 * @param {string} canvasId - The ID of the canvas element where the chart will be rendered.
 * @param {string} title - The title of the chart.
 */
function drawBarChart(data, canvasId, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas with id "${canvasId}" not found.`);
        return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Set font for title and labels
    ctx.font = '16px Arial';
    ctx.fillStyle = '#000';

    // Draw title
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 20);

    // Calculate max value for scaling
    const maxValue = Math.max(...data.map(item => item.value));

    // Chart area dimensions
    const chartTop = 40;
    const chartBottom = height - 40;
    const chartLeft = 80;
    const chartRight = width - 20;
    const chartHeight = chartBottom - chartTop;
    const chartWidth = chartRight - chartLeft;

    // Draw axes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartTop);
    ctx.lineTo(chartLeft, chartBottom);
    ctx.lineTo(chartRight, chartBottom);
    ctx.stroke();

    // Helper function to format numbers
    function formatNumber(num) {
        if (num >= 1e9) {
            return (num / 1e9).toFixed(1) + 'B';
        } else if (num >= 1e6) {
            return (num / 1e6).toFixed(1) + 'M';
        } else if (num >= 1e3) {
            return (num / 1e3).toFixed(1) + 'K';
        } else {
            return num.toString();
        }
    }

    // Draw bars and store positions for hover
    const barWidth = chartWidth / data.length * 0.8; // 80% of available space
    const spacing = chartWidth / data.length * 0.2; // 20% spacing
    const bars = [];

    data.forEach((item, index) => {
        const barHeight = (item.value / maxValue) * chartHeight;
        const x = chartLeft + spacing / 2 + index * (barWidth + spacing);
        const y = chartBottom - barHeight;

        // Draw bar
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Draw value on top of bar
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(formatNumber(item.value), x + barWidth / 2, y - 5);

        // Draw label below bar
        ctx.fillText(item.label, x + barWidth / 2, chartBottom + 15);

        // Store bar info for hover
        bars.push({ x, y, width: barWidth, height: barHeight, item });
    });

    // Draw y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = (maxValue / 5) * i;
        const yPos = chartBottom - (value / maxValue) * chartHeight;
        ctx.fillText(formatNumber(value), chartLeft - 10, yPos + 5);
    }

    // Tooltip element
    let tooltip = document.getElementById('bar-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'bar-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.background = 'rgba(0,0,0,0.8)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '5px 10px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }

    // Hover functionality
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let hoveredBar = null;
        for (const bar of bars) {
            if (mouseX >= bar.x && mouseX <= bar.x + bar.width && mouseY >= bar.y && mouseY <= bar.y + bar.height) {
                hoveredBar = bar;
                break;
            }
        }

        if (hoveredBar) {
            const time = hoveredBar.item.time || hoveredBar.item.label;
            const volume = formatNumber(hoveredBar.item.value);
            tooltip.textContent = `Time: ${time}\nVolume: ${volume}`;
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY - 10}px`;
            tooltip.style.display = 'block';
        } else {
            tooltip.style.display = 'none';
        }
    });

    canvas.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
    });
}

// Export the function to make it accessible in other modules
export { drawBarChart };
