// ====== DỮ LIỆU ======
// Màu thì phải hex và có transparency để khi hover đổi màu đậm hơn
const data = [
  { label: "Lâm", value: 40, color: "#ff000080" },
  { label: "Lộc", value: 25, color: "#36A2EB80" },
  { label: "Giang", value: 20, color: "#FFCE5680" },
  { label: "Đông", value: 15, color: "#4BC0C080" },
  { label: "Khải", value: 100, color:"#0000ff80" },
];

// ====== VẼ PIE CHART ======
const canvas = document.getElementById("pieChart");
const ctx = canvas.getContext("2d");
const tooltip = document.getElementById("tooltip");
let centerX = canvas.width/2, centerY = canvas.width/2, radius = canvas.width/2;
const total = data.reduce((sum, d) => sum + d.value, 0);
// tương tự với dòng code này
// let total = 0;
// for (let i = 0; i < data.length; i++) {
//   total += data[i].value;
// }
let startAngle = 0;

data.forEach(d => {
  d.startAngle = startAngle;
  d.endAngle = startAngle + (d.value / total) * 2 * Math.PI;
  startAngle = d.endAngle;
});

function drawChart(highlightIndex = -1) {
    // data.forEach(d => {
    // d.startAngle = startAngle;
    // d.endAngle = startAngle + (d.value / total) * 2 * Math.PI;
    // startAngle = d.endAngle;
    // });
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  data.forEach((d, i) => {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, d.startAngle, d.endAngle);

    ctx.fillStyle = i === highlightIndex ? d.color.slice(0, 7) : d.color;
    ctx.fill();
    // if(i===highlightIndex){
    //   ctx.stroke();
    // }

    // Vẽ % label
    const mid = (d.startAngle + d.endAngle) / 2;
    const textX = centerX + Math.cos(mid) * (radius * 0.75);
    const textY = centerY + Math.sin(mid) * (radius * 0.75);
    ctx.fillStyle = "black";
    let fontSize = canvas.width / 27;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(Math.round((d.value/total)*100) + "%", textX-10, textY);
    ctx.fillText(d.label, textX-10, textY-fontSize);

  });
}

drawChart();

// ====== HOVER DETECTION ======
let currentHighlightIndex = -1;
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left - centerX;
  const y = e.clientY - rect.top - centerY;
  const distanceSquared = x*x + y*y;

  if (distanceSquared > radius * radius) {
    if (tooltip.style.display !== "none" || currentHighlightIndex !== -1) {
      tooltip.style.display = "none";
      currentHighlightIndex = -1;
      drawChart();
    }
    return;
  }

  let angle = Math.atan2(y, x);
  if (angle < 0) angle += 2 * Math.PI;

  const index = data.findIndex(d => angle >= d.startAngle && angle < d.endAngle);

  if (index !== -1 && index !== currentHighlightIndex) {
    currentHighlightIndex = index;
    const d = data[index];
    drawChart(index);   

    tooltip.style.display = "block";
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
    tooltip.innerHTML = `<b>${d.label}</b><br>Value: ${d.value}<br>${Math.round((d.value/total)*100)}%`;
  } else if (index !== -1) {
    // Update tooltip position without redrawing chart
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
  }
});
function resizeCanvas() {
  const rad = document.getElementById("radius").value;

  canvas.width = rad
  canvas.height = rad
  centerX = canvas.width/2, centerY = canvas.width/2, radius = canvas.width/2;
//   let fontSize = canvas.width / 25;
//   ctx.font = `${fontSize}px Arial`;


  document.getElementById("radiusVal").innerText = rad;
  drawChart(); 
}