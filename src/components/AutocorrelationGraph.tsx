import React, { useEffect, useRef } from 'react';

interface Props {
    data: number[];
    onLagSelect?: (lag: number) => void;
}

const AutocorrelationGraph: React.FC<Props> = ({ data, onLagSelect }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || data.length === 0) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const stepX = width / data.length;

        data.forEach((val, i) => {
            const x = i * stepX;
            const y = height - (val * height);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }, [data]);

    const handleClick = (e: React.MouseEvent) => {
        if (!onLagSelect || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const lagIndex = Math.floor(percent * data.length);

        if (lagIndex > 0) {
            onLagSelect(lagIndex);
        }
    };

    return (
        <div style={{ background: '#0a0a0f', padding: '10px', border: '1px solid #333' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                <span>PERIODICITY SIGNAL</span>
                <span style={{ color: 'var(--accent-cyan)' }}>CLICK PEAK TO ALIGN</span>
            </div>
            <canvas
                ref={canvasRef}
                width={280}
                height={100}
                onClick={handleClick}
                style={{ width: '100%', height: '100px', cursor: 'crosshair' }}
            />
        </div>
    );
};

export default AutocorrelationGraph;