import React, { useEffect, useRef } from 'react';

interface Props {
    data: number[]; // Array of correlation strengths (0.0 - 1.0)
}

const AutocorrelationGraph: React.FC<Props> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || data.length === 0) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        // Styling
        ctx.strokeStyle = '#00f0ff'; // Neon Cyan
        ctx.lineWidth = 2;
        ctx.beginPath();

        // Draw Line Chart
        const stepX = width / data.length;

        data.forEach((val, i) => {
            const x = i * stepX;
            const y = height - (val * height); // 1.0 = Top, 0.0 = Bottom
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();

        // Draw Baseline (Threshold)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.5); // 50% line
        ctx.lineTo(width, height * 0.5);
        ctx.stroke();

    }, [data]);

    return (
        <div style={{ background: '#0a0a0f', padding: '10px', border: '1px solid #333' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px' }}>PERIODICITY SIGNAL</div>
            <canvas ref={canvasRef} width={280} height={100} style={{ width: '100%', height: '100px' }} />
        </div>
    );
};

export default AutocorrelationGraph;