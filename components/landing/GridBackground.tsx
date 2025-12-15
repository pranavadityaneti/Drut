import React, { useEffect, useRef } from 'react';

export const GridBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configuration
        const spacing = 40;
        const pointSize = 1.5;
        const interactionRadius = 150;
        const restoreSpeed = 0.1;

        let points: { x: number; y: number; originX: number; originY: number }[] = [];
        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initPoints();
        };

        const initPoints = () => {
            points = [];
            const cols = Math.ceil(canvas.width / spacing);
            const rows = Math.ceil(canvas.height / spacing);

            for (let i = 0; i <= cols; i++) {
                for (let j = 0; j <= rows; j++) {
                    const x = i * spacing;
                    const y = j * spacing;
                    points.push({ x, y, originX: x, originY: y });
                }
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // FORCE BRIGHT WHITE for maximum visibility vs black
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

            points.forEach(point => {
                // Distance from mouse
                const dx = point.x - mouseRef.current.x;
                const dy = point.y - mouseRef.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Interaction
                if (dist < interactionRadius) {
                    const angle = Math.atan2(dy, dx);
                    const force = (interactionRadius - dist) / interactionRadius;
                    const moveX = Math.cos(angle) * force * 20;
                    const moveY = Math.sin(angle) * force * 20;

                    point.x -= moveX; // Move away from cursor
                    point.y -= moveY;
                }

                // Restore
                const rx = point.originX - point.x;
                const ry = point.originY - point.y;

                point.x += rx * restoreSpeed;
                point.y += ry * restoreSpeed;

                // Draw point
                ctx.beginPath();
                ctx.arc(point.x, point.y, pointSize, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);

        resize();
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none opacity-40 bg-black"
        />
    );
};
