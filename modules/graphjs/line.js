export function drawLineGraph(data, options = {}) {
    const canvas = document.getElementById('line-graph');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

}