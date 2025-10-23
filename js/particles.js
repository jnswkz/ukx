
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];
const mouse = {
    x: null,
    y: null,
    radius: 150
};

const particleOptions = {
    count: 50,
    speed: 0.5,
    color: '#ffffff',
    size: 2,
    minDistance: 120,
    lineWidth: 0.2
};

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * particleOptions.speed;
        this.vy = (Math.random() - 0.5) * particleOptions.speed;
        this.size = Math.random() * particleOptions.size + 1;
    }

    draw() {
        ctx.fillStyle = particleOptions.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) {
            this.vx *= -1;
        }
        if (this.y < 0 || this.y > canvas.height) {
            this.vy *= -1;
        }
    }
}

function init() {
    particles = [];
    for (let i = 0; i < particleOptions.count; i++) {
        particles.push(new Particle());
    }
}

function connect() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
            const distance = Math.sqrt(
                (particles[i].x - particles[j].x) ** 2 +
                (particles[i].y - particles[j].y) ** 2
            );

            if (distance < particleOptions.minDistance) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance / particleOptions.minDistance})`;
                ctx.lineWidth = particleOptions.lineWidth;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
    // connect to mouse
    if (mouse.x !== null && mouse.y !== null) {
        for (const particle of particles) {
            const distance = Math.sqrt((particle.x - mouse.x) ** 2 + (particle.y - mouse.y) ** 2);
            if (distance < particleOptions.minDistance) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance / particleOptions.minDistance})`;
                ctx.lineWidth = particleOptions.lineWidth;
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const particle of particles) {
        particle.update();
        particle.draw();
    }

    connect();

    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init();
});

window.addEventListener('mousemove', (event) => {
    mouse.x = event.x;
    mouse.y = event.y;
});

window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

init();
animate();
