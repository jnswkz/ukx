function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; 
}

const canvas = document.getElementById('net-bg-canvas');
const ctx = canvas.getContext('2d');

const width = canvas.width;
const height = canvas.height;

function spawn_point(ctx, x, y) {
    console.log(`Spawned point at (${x}, ${y})`);
    const radius = 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
}

let list_of_points = [];

for (let i = 0; i < 150; i++) {
    const x = getRandomInt(0, width);
    const y = getRandomInt(0, height);

    list_of_points.push({x: x, y: y});
}

function move_points() {
    
    ctx.clearRect(0, 0, width, height);
    
    // ctx.font = '16px Arial';
    // ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    // ctx.fillText('Click to add more points', 10, height - 20); // change text here!
    
    // set a direction to move points in 4 directions, and only move straight   
    for (let i=0; i<list_of_points.length; i++) {
        const point = list_of_points[i];
        switch (i % 4) {
            case 0:
                point.x += 1;
                break;
            case 1:
                point.x -= 1;
                break;
            case 2:
                point.y += 1;
                break;
            case 3:
                point.y -= 1;
                break;
        }
        if (point.x < 0) point.x = width;
        if (point.x > width) point.x = 0;
        if (point.y < 0) point.y = height;
        if (point.y > height) point.y = 0;

    }
}

let mousex = canvas.width / 2;
let mousey = canvas.height / 2;

canvas.addEventListener('mousemove', function(event) {
  // Get bounding rectangle of canvas
  const rect = canvas.getBoundingClientRect();
  
  // Calculate mouse position within the canvas
  mousex = event.clientX - rect.left;
  mousey = event.clientY - rect.top;
});

canvas.addEventListener('click', function(event) {
    const rect = canvas.getBoundingClientRect();
    const clickx = event.clientX - rect.left;
    const clicky = event.clientY - rect.top;
    list_of_points.push({x: clickx, y: clicky});
});

function drawline(x1, y1, x2, y2, type='normal') {
    if (type === 'highlight') {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    } else {
        ctx.strokeStyle = 'rgba(108, 93, 93, 0.2)';
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}



setInterval(() => {
    move_points();
    for (let i=0; i<list_of_points.length; i++) {
        const point = list_of_points[i];
        spawn_point(ctx, point.x, point.y);
    }

    spawn_point(ctx, mousex, mousey);
    for (let i=0; i<list_of_points.length; i++) {
        const point = list_of_points[i];
        const dx = point.x - mousex;
        const dy = point.y - mousey;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 200) {
            drawline(point.x, point.y, mousex, mousey, 'highlight');
        }
    }

    for (let i=0; i<list_of_points.length; i++) {
        const pointA = list_of_points[i];
        for (let j=i+1; j<list_of_points.length; j++) {
            const pointB = list_of_points[j];
            const dx = pointA.x - pointB.x;
            const dy = pointA.y - pointB.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 150) {
                drawline(pointA.x, pointA.y, pointB.x, pointB.y);
            }
        }
    }
}
, 10);
