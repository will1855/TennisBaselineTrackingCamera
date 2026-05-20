import React, { useRef, useEffect } from 'react';

/**
 * SystemDiagram
 *
 * A visual diagram showing the data flow through the system:
 *
 *   Tracker → Control Algorithm → Hardware Adapter → Rail
 *
 * Drawn on a canvas with animated flow lines.
 */
const SystemDiagram: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext('2d')!;
      const W = canvas.width;
      const H = canvas.height;
      tickRef.current++;
      const t = tickRef.current;

      ctx.clearRect(0, 0, W, H);

      // Boxes
      const boxes = [
        { label: 'TRACKER', sub: 'Simulated / Colour', icon: '🎯', x: 0.08 },
        { label: 'CONTROLLER', sub: 'RailController', icon: '⚙️', x: 0.34 },
        { label: 'ADAPTER', sub: 'MockHardware', icon: '🔌', x: 0.60 },
        { label: 'RAIL', sub: 'RailPhysics', icon: '🚃', x: 0.86 },
      ];

      const bW = W * 0.18;
      const bH = 64;
      const bY = H / 2 - bH / 2;

      // Animated flow dots between boxes
      const connections = [
        { from: boxes[0], to: boxes[1], label: 'TargetState' },
        { from: boxes[1], to: boxes[2], label: 'RailCommand' },
        { from: boxes[2], to: boxes[3], label: 'sendCommand()' },
      ];

      for (const conn of connections) {
        const x1 = conn.from.x * W + bW / 2;
        const x2 = conn.to.x * W - bW / 2;
        const midY = H / 2;

        // Arrow line
        ctx.save();
        ctx.strokeStyle = 'rgba(80,220,100,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, midY);
        ctx.lineTo(x2, midY);
        ctx.stroke();

        // Arrow head
        ctx.fillStyle = 'rgba(80,220,100,0.5)';
        ctx.beginPath();
        ctx.moveTo(x2, midY);
        ctx.lineTo(x2 - 8, midY - 5);
        ctx.lineTo(x2 - 8, midY + 5);
        ctx.closePath();
        ctx.fill();

        // Flowing dot
        const progress = ((t * 0.012 + connections.indexOf(conn) * 0.33) % 1);
        const dotX = x1 + (x2 - x1) * progress;
        ctx.fillStyle = '#50dc64';
        ctx.shadowColor = '#50dc64';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(dotX, midY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Label above line
        ctx.fillStyle = 'rgba(244,162,97,0.8)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(conn.label, (x1 + x2) / 2, midY - 14);
      }

      // Draw boxes
      for (const box of boxes) {
        const bx = box.x * W - bW / 2;

        // Glow
        ctx.save();
        ctx.shadowColor = 'rgba(80,220,100,0.4)';
        ctx.shadowBlur = 12;

        const grad = ctx.createLinearGradient(bx, bY, bx, bY + bH);
        grad.addColorStop(0, '#1e2a4a');
        grad.addColorStop(1, '#0f1a30');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(bx, bY, bW, bH, 8);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = 'rgba(80,220,100,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, bY, bW, bH, 8);
        ctx.stroke();

        // Icon
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.fillText(box.icon, box.x * W, bY + 22);

        // Label
        ctx.fillStyle = '#e8e8ff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(box.label, box.x * W, bY + 38);

        // Sub
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '8px monospace';
        ctx.fillText(box.sub, box.x * W, bY + 52);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw();

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="system-diagram">
      <div className="diagram-header">
        <span className="diagram-title">System Data Flow</span>
      </div>
      <canvas ref={canvasRef} className="diagram-canvas" />
    </div>
  );
};

export default SystemDiagram;
