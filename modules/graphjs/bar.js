export function drawBarChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  const color1 =
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0");
  const color2 =
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0");
  if (!canvas) {
    console.error(`Canvas element with ID "${canvasId}" not found.`);
    return;
  }

  const ctx = canvas.getContext("2d");
  const { x, y } = data;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const padding = 50;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;
  const maxY = Math.max(...y) * 1.1; // add 10%
  const slotWidth = chartWidth / y.length;
  const barWidth = Math.max(6, slotWidth * 0.65);
  const sideOffset = (slotWidth - barWidth) / 2;

  // Draw coordinate axes
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  // Gradient for the bars
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);

  // Draw the bars
  ctx.fillStyle = gradient;
  for (let i = 0; i < y.length; i++) {
    const barHeight = (y[i] / maxY) * chartHeight;
    const barX = padding + i * slotWidth + sideOffset;
    const barY = canvas.height - padding - barHeight;

    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Label the bar value
    ctx.fillStyle =
      parseInt(color2.slice(1), 16) > 0xffffff / 2 ? "#000" : "#fff";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(y[i], barX + barWidth / 2, barY + 20);

    // X-axis label
    ctx.fillStyle = "#444";
    ctx.textAlign = "center";
    ctx.fillText(x[i], barX + barWidth / 2, canvas.height - padding + 20);
    ctx.fillStyle = gradient;
  }

  ctx.fillStyle = "#555";
  ctx.textAlign = "right";
  ctx.font = "12px sans-serif";
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
