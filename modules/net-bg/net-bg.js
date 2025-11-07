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
    const radius = 0.5;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
}

let list_of_points = [];

for (let i = 0; i < 15; i++) {
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
        if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) {
            point.x = getRandomInt(0, width);
            point.y = getRandomInt(0, height);
        }

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

function draw_line(x1, y1, x2, y2, type='normal') {
    if (type === 'highlight') {
        ctx.strokeStyle = 'rgba(244, 0, 252, 0.5)';
    } else {
        ctx.strokeStyle = 'rgba(255, 0, 0, 1)';
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
    const mouseDistanceSquared = 50 * 50;
    for (let i=0; i<list_of_points.length; i++) {
        const point = list_of_points[i];
        const dx = point.x - mousex;
        const dy = point.y - mousey;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < mouseDistanceSquared) {
            draw_line(point.x, point.y, mousex, mousey, 'highlight');
        }
    }

    const lineDistanceSquared = 90 * 90;
    for (let i=0; i<list_of_points.length; i++) {
        const pointA = list_of_points[i];
        for (let j=i+1; j<list_of_points.length; j++) {
            const pointB = list_of_points[j];
            const dx = pointA.x - pointB.x;
            const dy = pointA.y - pointB.y;
            const distanceSquared = dx * dx + dy * dy;
            if (distanceSquared < lineDistanceSquared) {
                draw_line(pointA.x, pointA.y, pointB.x, pointB.y);
            }
        }
    }
}
, 10);
