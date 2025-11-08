(function initNetBackgrounds() {
    const canvases = document.querySelectorAll('.net-bg-canvas');
    if (!canvases.length) {
        console.warn('[net-bg] No canvases found. Skipping background renderer.');
        return;
    }

    const instances = [];

    canvases.forEach((canvas) => {
        const instance = createNetBackground(canvas);
        if (instance) {
            instances.push(instance);
        }
    });

    if (!instances.length) {
        return;
    }

    const themeObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                instances.forEach(instance => instance.updateColors());
                break;
            }
        }
    });

    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    window.addEventListener('beforeunload', () => {
        instances.forEach(instance => instance.destroy());
        themeObserver.disconnect();
    });

    function createNetBackground(canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('[net-bg] Unable to get 2D context for canvas:', canvas);
            return null;
        }

        const POINT_COUNT = parseInt(canvas.dataset.points || '40', 10);
        const MAX_POINTS = parseInt(canvas.dataset.maxPoints || '80', 10);
        const HOVER_RADIUS = parseInt(canvas.dataset.hoverRadius || '180', 10);
        const CONNECT_RADIUS = parseInt(canvas.dataset.connectRadius || '120', 10);
        const POINT_RADIUS = parseFloat(canvas.dataset.pointRadius || '2.2');
        const POINT_BASE_SPEED = parseFloat(canvas.dataset.pointBaseSpeed || '0.4');
        const POINT_SPEED_VARIATION = parseFloat(canvas.dataset.pointSpeedVariation || '0.9');

        const HOVER_DISTANCE_SQUARED = HOVER_RADIUS * HOVER_RADIUS;
        const LINE_DISTANCE_SQUARED = CONNECT_RADIUS * CONNECT_RADIUS;

        const points = [];
        const colors = {
            point: 'rgba(255, 255, 255, 0.7)',
            pointGlow: 'rgba(255, 255, 255, 0.3)',
            line: 'rgba(255, 0, 0, 0.8)',
            lineGlow: 'rgba(255, 0, 0, 0.4)',
            highlight: 'rgba(244, 0, 252, 0.7)',
            highlightGlow: 'rgba(244, 0, 252, 0.4)'
        };

        let width = 0;
        let height = 0;
        let mousex = 0;
        let mousey = 0;
        let pointerActive = false;
        let rafId;

        function resizeCanvas() {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            width = rect.width || canvas.clientWidth || 300;
            height = rect.height || canvas.clientHeight || 150;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function randomizePoint(point) {
            point.x = Math.random() * width;
            point.y = Math.random() * height;
            point.direction = Math.floor(Math.random() * 4);
            point.speed = POINT_BASE_SPEED + Math.random() * POINT_SPEED_VARIATION;
            return point;
        }

        function seedPoints() {
            points.length = 0;
            for (let i = 0; i < POINT_COUNT; i++) {
                points.push(randomizePoint({ x: 0, y: 0, direction: 0 }));
            }
        }

        function movePoints() {
            for (let i = 0; i < points.length; i++) {
                const point = points[i];

                switch (point.direction) {
                    case 0:
                        point.x += point.speed;
                        break;
                    case 1:
                        point.x -= point.speed;
                        break;
                    case 2:
                        point.y += point.speed;
                        break;
                    case 3:
                    default:
                        point.y -= point.speed;
                        break;
                }

                if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) {
                    randomizePoint(point);
                }
            }
        }

        function drawPoint(x, y) {
            ctx.fillStyle = colors.point;
            ctx.shadowColor = colors.pointGlow;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(x, y, POINT_RADIUS, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        function drawLine(x1, y1, x2, y2, highlight = false) {
            ctx.strokeStyle = highlight ? colors.highlight : colors.line;
            ctx.lineWidth = highlight ? 2 : 1.05;
            ctx.shadowColor = highlight ? colors.highlightGlow : colors.lineGlow;
            ctx.shadowBlur = highlight ? 10 : 4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        function getRelativePointerPosition(event) {
            const rect = canvas.getBoundingClientRect();
            if (
                event.clientX < rect.left || event.clientX > rect.right ||
                event.clientY < rect.top || event.clientY > rect.bottom
            ) {
                return null;
            }

            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        }

        const handleMouseMove = (event) => {
            const pos = getRelativePointerPosition(event);
            if (!pos) {
                pointerActive = false;
                return;
            }

            pointerActive = true;
            mousex = pos.x;
            mousey = pos.y;
        };

        const handleClick = (event) => {
            const pos = getRelativePointerPosition(event);
            if (!pos) {
                return;
            }

            points.push({
                x: pos.x,
                y: pos.y,
                direction: Math.floor(Math.random() * 4)
            });

            if (points.length > MAX_POINTS) {
                points.shift();
            }
        };

        function render() {
            ctx.clearRect(0, 0, width, height);
            movePoints();

            for (const point of points) {
                drawPoint(point.x, point.y);
            }

            if (pointerActive) {
                drawPoint(mousex, mousey);
            }

            for (let i = 0; i < points.length; i++) {
                const pointA = points[i];

                if (pointerActive) {
                    const dxMouse = pointA.x - mousex;
                    const dyMouse = pointA.y - mousey;
                    if (dxMouse * dxMouse + dyMouse * dyMouse < HOVER_DISTANCE_SQUARED) {
                        drawLine(pointA.x, pointA.y, mousex, mousey, true);
                    }
                }

                for (let j = i + 1; j < points.length; j++) {
                    const pointB = points[j];
                    const dx = pointA.x - pointB.x;
                    const dy = pointA.y - pointB.y;

                    if (dx * dx + dy * dy < LINE_DISTANCE_SQUARED) {
                        drawLine(pointA.x, pointA.y, pointB.x, pointB.y);
                    }
                }
            }

            rafId = requestAnimationFrame(render);
        }

        function hexToRgba(hex, alpha = 1) {
            if (!hex) {
                return `rgba(255, 255, 255, ${alpha})`;
            }

            let sanitized = hex.trim();
            if (sanitized.startsWith('#')) {
                sanitized = sanitized.slice(1);
            }

            if (sanitized.length === 3) {
                sanitized = sanitized.split('').map(char => char + char).join('');
            }

            const num = parseInt(sanitized, 16);
            if (Number.isNaN(num)) {
                return `rgba(255, 255, 255, ${alpha})`;
            }

            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        function updateColors() {
            const styles = getComputedStyle(document.documentElement);
            const accentPrimary = styles.getPropertyValue('--color-accent-primary').trim() || '#FF5C82';
            const accentSecondary = styles.getPropertyValue('--color-accent-secondary').trim() || '#F400FC';
            const textPrimary = styles.getPropertyValue('--color-text-primary').trim() || '#FFFFFF';
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const isDarkMode = currentTheme !== 'light';

            const pointAlpha = isDarkMode ? 1.0 : 0.6;
            const pointGlowAlpha = isDarkMode ? 0.75 : 0.35;
            const lineAlpha = isDarkMode ? 0.95 : 0.6;
            const lineGlowAlpha = isDarkMode ? 0.65 : 0.35;
            const highlightAlpha = isDarkMode ? 0.8 : 0.55;
            const highlightGlowAlpha = isDarkMode ? 0.55 : 0.3;

            const lineColorSource = isDarkMode ? accentPrimary : textPrimary;

            colors.point = hexToRgba(textPrimary, pointAlpha);
            colors.pointGlow = hexToRgba(textPrimary, pointGlowAlpha);
            colors.line = hexToRgba(lineColorSource, lineAlpha);
            colors.highlight = hexToRgba(accentSecondary, highlightAlpha);
            colors.lineGlow = hexToRgba(lineColorSource, lineGlowAlpha);
            colors.highlightGlow = hexToRgba(accentSecondary, highlightGlowAlpha);
        }

        const handleMouseLeave = () => {
            pointerActive = false;
        };

        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('click', handleClick);

        const onResize = () => resizeCanvas();
        window.addEventListener('resize', onResize);

        resizeCanvas();
        updateColors();
        seedPoints();
        mousex = width / 2;
        mousey = height / 2;
        rafId = requestAnimationFrame(render);

        return {
            updateColors,
            destroy() {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseleave', handleMouseLeave);
                document.removeEventListener('click', handleClick);
                window.removeEventListener('resize', onResize);
                cancelAnimationFrame(rafId);
            }
        };
    }
})();
