const chartStateByCanvas = new Map();

function resolveCanvas(target) {
  if (typeof target === "string") return document.getElementById(target);
  return target;
}

function formatValue(value) {
  if (!Number.isFinite(value)) return value;
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return Number(value.toFixed(2));
}

function getTooltipEl(options = {}) {
  if (options.tooltipElement) {
    if (typeof options.tooltipElement === "string") {
      return document.getElementById(options.tooltipElement);
    }
    return options.tooltipElement;
  }
  let el = document.querySelector(".graphjs-tooltip");
  if (!el) {
    el = document.createElement("div");
    el.className = "graphjs-tooltip";
    document.body.appendChild(el);
  }
  return el;
}

function positionTooltip(tooltip, event) {
  if (!tooltip) return;
  const scrollX =
    window.pageXOffset || document.documentElement.scrollLeft || 0;
  const scrollY =
    window.pageYOffset || document.documentElement.scrollTop || 0;
  const padding = 12;

  // Ensure we can measure size before clamping
  tooltip.style.display = "block";
  const rect = tooltip.getBoundingClientRect();
  const desiredLeft = scrollX + event.clientX + padding;
  const desiredTop = scrollY + event.clientY - rect.height - padding;
  const maxLeft = scrollX + window.innerWidth - rect.width - padding;
  const maxTop = scrollY + window.innerHeight - rect.height - padding;
  const left = Math.max(scrollX + 4, Math.min(desiredLeft, maxLeft));
  const top = Math.max(scrollY + 4, Math.min(desiredTop, maxTop));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function wireTooltip(canvas, tooltip) {
  if (!canvas || !tooltip) return;
  if (canvas.dataset.graphjsTooltip === "true") return;

  canvas.addEventListener("mousemove", (event) => {
    const state = chartStateByCanvas.get(canvas);
    if (!state || !state.bars.length) return;
    const { bars } = state;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hovered = bars.find(
      (bar) =>
        x >= bar.x &&
        x <= bar.x + bar.width &&
        y >= bar.y &&
        y <= bar.y + bar.height
    );
    if (!hovered) {
      tooltip.style.display = "none";
      return;
    }
    tooltip.textContent = `${hovered.label}: ${formatValue(hovered.value)}`;
    positionTooltip(tooltip, event);
  });

  canvas.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
  });

  canvas.dataset.graphjsTooltip = "true";
}

export function drawBarChart(canvasId, data, options = {}) {
  const canvas = resolveCanvas(canvasId);
  if (!canvas) {
    console.error(`Canvas element with ID "${canvasId}" not found.`);
    return;
  }

  const ctx = canvas.getContext("2d");
  const xLabels = data?.x || [];
  const yValues = data?.y || [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!xLabels.length || !yValues.length) return;

  const padding = 56;
  const chartWidth = Math.max(10, canvas.width - padding * 2);
  const chartHeight = Math.max(10, canvas.height - padding * 2);
  const maxY = Math.max(1, Math.max(...yValues) * 1.1);
  const slotWidth = chartWidth / yValues.length;
  const barWidth = Math.max(14, slotWidth * 0.6);
  const sideOffset = (slotWidth - barWidth) / 2;

  ctx.strokeStyle = "#9AA4B5";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(padding, padding * 0.75);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#7b5cf6");
  gradient.addColorStop(1, "#f1449d");

  const bars = [];

  const maxLabelLength = options.maxLabelLength || 8;
  const labelFont = options.labelFont || "12px Inter, sans-serif";
  const valueFont = options.valueFont || "13px Inter, sans-serif";

  for (let i = 0; i < yValues.length; i++) {
    const value = Number(yValues[i]) || 0;
    const barHeight = (value / maxY) * chartHeight;
    const barX = padding + i * slotWidth + sideOffset;
    const barY = canvas.height - padding - barHeight;
    bars.push({ x: barX, y: barY, width: barWidth, height: barHeight, label: xLabels[i], value });

    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "#0f172a";
    ctx.font = valueFont;
    ctx.textAlign = "center";
    ctx.fillText(formatValue(value), barX + barWidth / 2, barY - 6);

    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.font = labelFont;
    const label =
      typeof xLabels[i] === "string" && xLabels[i].length > maxLabelLength
        ? `${xLabels[i].slice(0, maxLabelLength - 1)}…`
        : xLabels[i];
    ctx.fillText(label, barX + barWidth / 2, canvas.height - padding + 16);
  }

  ctx.fillStyle = "#475569";
  ctx.textAlign = "right";
  ctx.font = "12px Inter, sans-serif";
  const numTicks = 5;
  for (let i = 0; i <= numTicks; i++) {
    const tickValue = (maxY / numTicks) * i;
    const tickY = canvas.height - padding - (tickValue / maxY) * chartHeight;
    ctx.fillText(tickValue.toFixed(0), padding - 10, tickY + 4);
    ctx.beginPath();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.moveTo(padding - 4, tickY);
    ctx.lineTo(canvas.width - padding, tickY);
    ctx.stroke();
  }

  const tooltip = getTooltipEl(options);
  chartStateByCanvas.set(canvas, { bars, tooltip });
  wireTooltip(canvas, tooltip);
}
