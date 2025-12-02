const defaultData = [
  { label: "Lâm", value: 40 },
  { label: "Lộc", value: 25 },
  { label: "Giang", value: 20 },
  { label: "Đông", value: 15 },
  { label: "Khải", value: 100 },
];

const colorPalette = [
  // "#2E3440", "#3B4252", "#434C5E", "#4C566A",
  // "#D8DEE9", "#E5E9F0", "#ECEFF4", 
  "#8FBCBB",
  "#88C0D0", "#81A1C1", "#5E81AC", "#BF616A",
  "#D08770", "#EBCB8B", "#A3BE8C", "#B48EAD"
];

const TAU = Math.PI * 2;

const resolveElement = (target) => {
  if (typeof target === "string") {
    return document.getElementById(target);
  }
  return target || null;
};

const lightenColor = (color) => {
  if (!/^#([0-9a-f]{6})$/i.test(color)) {
    return color;
  }
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const lightenChannel = (value) => Math.min(255, Math.round(value + (255 - value) * 0.25));
  return `rgb(${lightenChannel(r)}, ${lightenChannel(g)}, ${lightenChannel(b)})`;
};

export class PieChart {
  constructor({ canvas = "pieChart", tooltip = "tooltip", dataset = defaultData, colors = colorPalette } = {}) {
    this.canvas = resolveElement(canvas);
    if (!this.canvas) {
      throw new Error("Pie chart canvas not found");
    }
    this.ctx = this.canvas.getContext("2d");
    this.tooltip = resolveElement(tooltip);
    this.colors = colors;
    this.currentHighlightIndex = -1;

    this.setDataset(dataset);
    this.updateGeometry();
    this.draw();
    this.bindEvents();
  }

  setDataset(dataset) {
    const sanitized = dataset.map((item) => ({ ...item, value: Number(item.value) || 0 }));
    this.total = sanitized.reduce((sum, item) => sum + item.value, 0);
    let startAngle = 0;

    this.dataset = sanitized.map((item) => {
      const slice = { ...item };
      const sliceAngle = this.total === 0 ? 0 : (slice.value / this.total) * TAU;
      slice.startAngle = startAngle;
      slice.endAngle = startAngle + sliceAngle;
      startAngle = slice.endAngle;
      return slice;
    });
  }

  updateData(dataset) {
    this.setDataset(dataset);
    this.draw();
  }

  updateGeometry() {
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.radius = Math.min(this.centerX, this.centerY);
  }

  resize(size) {
    if (typeof size === "number" && size > 0) {
      this.canvas.width = size;
      this.canvas.height = size;
    }
    this.updateGeometry();
    this.draw(this.currentHighlightIndex);
  }

  getColor(index) {
    return this.colors[index % this.colors.length];
  }

  draw(highlightIndex = -1) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.dataset.length || this.total === 0) {
      return;
    }

    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    this.dataset.forEach((slice, index) => {
      this.ctx.beginPath();
      this.ctx.moveTo(this.centerX, this.centerY);
      this.ctx.arc(this.centerX, this.centerY, this.radius, slice.startAngle, slice.endAngle);
      const baseColor = this.getColor(index);
      this.ctx.fillStyle = index === highlightIndex ? lightenColor(baseColor) : baseColor;
      this.ctx.fill();

      const mid = (slice.startAngle + slice.endAngle) / 2;
      const textX = this.centerX + Math.cos(mid) * (this.radius * 0.75);
      const textY = this.centerY + Math.sin(mid) * (this.radius * 0.75);
      const fontSize = this.canvas.width / 27;
      this.ctx.font = `${fontSize}px Arial`;
      this.ctx.fillStyle = "black";
      const percent = this.total === 0 ? 0 : Math.round((slice.value / this.total) * 100);
      if (percent === 0) {
        return;
      }
      this.ctx.fillText(`${percent}%`, textX, textY);
      this.ctx.fillText(slice.label, textX, textY - fontSize);
    });
  }

  bindEvents() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);
  }

  handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - this.centerX;
    const y = event.clientY - rect.top - this.centerY;
    const distanceSquared = x * x + y * y;

    if (distanceSquared > this.radius * this.radius) {
      this.resetHover();
      return;
    }

    let angle = Math.atan2(y, x);
    if (angle < 0) angle += TAU;

    const index = this.dataset.findIndex((slice) => angle >= slice.startAngle && angle < slice.endAngle);

    if (index === -1) {
      this.resetHover();
      return;
    }

    if (index !== this.currentHighlightIndex) {
      this.currentHighlightIndex = index;
      this.draw(index);
      this.showTooltip(index, event.pageX, event.pageY);
    } else {
      this.positionTooltip(event.pageX, event.pageY);
    }
  }

  handleMouseLeave() {
    this.resetHover();
  }

  resetHover() {
    if (this.currentHighlightIndex !== -1) {
      this.currentHighlightIndex = -1;
      this.draw();
    }
    this.hideTooltip();
  }

  showTooltip(index, pageX, pageY) {
    if (!this.tooltip) {
      return;
    }
    const slice = this.dataset[index];
    const percent = this.total === 0 ? 0 : ((slice.value / this.total) * 100).toFixed(1);
    const formattedValue = Number.isFinite(slice.value) && Math.abs(slice.value) >= 1000 
      ? slice.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : Number(slice.value.toFixed(2));
    const color = this.getColor(index);
    
    this.tooltip.style.display = "block";
    this.tooltip.innerHTML = `
      <div class="graphjs-tooltip-label">${slice.label}</div>
      <div class="graphjs-tooltip-value">${formattedValue}</div>
      <div class="graphjs-tooltip-percent-row">
        <span class="graphjs-tooltip-color" style="background: ${color};"></span>
        <span>${percent}% of total</span>
      </div>
    `;
    this.positionTooltip(pageX, pageY);
  }

  positionTooltip(pageX, pageY) {
    if (!this.tooltip) {
      return;
    }
    const padding = 12;
    
    // Ensure tooltip is visible to measure
    this.tooltip.style.display = "block";
    const rect = this.tooltip.getBoundingClientRect();
    
    // Use clientX/clientY relative coordinates for fixed positioning
    const clientX = pageX - (window.pageXOffset || document.documentElement.scrollLeft || 0);
    const clientY = pageY - (window.pageYOffset || document.documentElement.scrollTop || 0);
    
    const desiredLeft = clientX + padding;
    const desiredTop = clientY - rect.height - padding;
    const maxLeft = window.innerWidth - rect.width - padding;
    const maxTop = window.innerHeight - rect.height - padding;
    
    const left = Math.max(4, Math.min(desiredLeft, maxLeft));
    const top = Math.max(4, Math.min(desiredTop, maxTop));
    
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = "none";
    }
  }
}

export function drawPieChart(options = {}) {
  return new PieChart(options);
}

export { defaultData as samplePieData, colorPalette as pieColorPalette };
