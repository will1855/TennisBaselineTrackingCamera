import React, { useRef, useEffect, useCallback } from 'react';
import type { RailCommand } from '../control/types';

interface RailSimulatorProps {
  carriagePosition: number; // 0 to 1
  targetX: number;          // 0 to 1
  command: RailCommand;
  velocity: number;
}

/**
 * RailSimulator
 *
 * Renders a canvas-based simulation of the physical motorised rail.
 * Shows:
 *  - The rail track (horizontal bar)
 *  - End-stops
 *  - Centre line marker
 *  - Target position marker (where the tracker thinks the player is)
 *  - Carriage (phone holder) with smooth animation
 *  - Direction arrows
 *  - Command label
 */
const RailSimulator: React.FC<RailSimulatorProps> = ({
  carriagePosition,
  targetX,
  command,
  velocity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;

    // Background
    ctx.clearRect(0, 0, W, H);

    const railY = H / 2;
    const railPad = 60;
    const railLeft = railPad;
    const railRight = W - railPad;
    const railLen = railRight - railLeft;

    // ── Rail track ─────────────────────────────────────────────────────────

    // Rail shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // Track bed
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(railLeft - 4, railY - 8, railLen + 8, 16, 6);
    ctx.fill();
    ctx.restore();

    // Rail shine
    const railGrad = ctx.createLinearGradient(railLeft, railY - 8, railLeft, railY + 8);
    railGrad.addColorStop(0, '#3a3a5c');
    railGrad.addColorStop(0.4, '#5a5a8c');
    railGrad.addColorStop(1, '#2a2a4c');
    ctx.fillStyle = railGrad;
    ctx.beginPath();
    ctx.roundRect(railLeft - 4, railY - 7, railLen + 8, 14, 5);
    ctx.fill();

    // Rail bolts
    for (let bx = railLeft + 20; bx < railRight; bx += 40) {
      ctx.fillStyle = '#8080b0';
      ctx.beginPath();
      ctx.arc(bx, railY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── End stops ──────────────────────────────────────────────────────────

    const drawEndStop = (x: number) => {
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.roundRect(x - 6, railY - 18, 12, 36, 3);
      ctx.fill();
      ctx.fillStyle = '#ff6b7a';
      ctx.fillRect(x - 4, railY - 14, 4, 28);
    };
    drawEndStop(railLeft - 4);
    drawEndStop(railRight + 4);

    // ── Centre line ────────────────────────────────────────────────────────

    const centreX = railLeft + railLen * 0.5;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centreX, railY - 40);
    ctx.lineTo(centreX, railY + 40);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CENTRE', centreX, railY + 52);

    // ── Target position marker ─────────────────────────────────────────────

    const targetPx = railLeft + targetX * railLen;
    ctx.save();
    ctx.strokeStyle = '#f4a261';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(targetPx, railY - 40);
    ctx.lineTo(targetPx, railY + 40);
    ctx.stroke();
    ctx.restore();

    // Target diamond
    ctx.fillStyle = '#f4a261';
    ctx.beginPath();
    ctx.moveTo(targetPx, railY - 46);
    ctx.lineTo(targetPx + 6, railY - 38);
    ctx.lineTo(targetPx, railY - 30);
    ctx.lineTo(targetPx - 6, railY - 38);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f4a261';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`TARGET ${(targetX).toFixed(2)}`, targetPx, railY - 52);

    // ── Carriage ───────────────────────────────────────────────────────────

    const carriageX = railLeft + carriagePosition * railLen;
    const cW = 44, cH = 64;
    const cTop = railY - cH / 2 - 4;

    // Carriage shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;

    // Carriage body
    const carriageGrad = ctx.createLinearGradient(carriageX - cW / 2, cTop, carriageX + cW / 2, cTop);
    carriageGrad.addColorStop(0, '#2d3561');
    carriageGrad.addColorStop(0.5, '#4a5490');
    carriageGrad.addColorStop(1, '#2d3561');
    ctx.fillStyle = carriageGrad;
    ctx.beginPath();
    ctx.roundRect(carriageX - cW / 2, cTop, cW, cH, 8);
    ctx.fill();
    ctx.restore();

    // Carriage border
    ctx.strokeStyle =
      command.direction === 'LEFT' ? '#50dc64' :
      command.direction === 'RIGHT' ? '#50dc64' :
      'rgba(255,255,255,0.2)';
    ctx.lineWidth = command.direction !== 'STOP' ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(carriageX - cW / 2, cTop, cW, cH, 8);
    ctx.stroke();

    // Phone screen (glowing rectangle on carriage)
    ctx.fillStyle = '#0f3460';
    ctx.beginPath();
    ctx.roundRect(carriageX - cW / 2 + 6, cTop + 8, cW - 12, cH - 20, 4);
    ctx.fill();

    // Screen content lines
    ctx.fillStyle = 'rgba(80,220,100,0.6)';
    for (let li = 0; li < 4; li++) {
      ctx.fillRect(carriageX - cW / 2 + 10, cTop + 14 + li * 8, cW - 22, 3);
    }

    // Lens dot
    ctx.fillStyle = '#50dc64';
    ctx.beginPath();
    ctx.arc(carriageX, cTop + cH - 8, 5, 0, Math.PI * 2);
    ctx.fill();

    // Position label below carriage
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${(carriagePosition).toFixed(3)}`, carriageX, railY + 52);

    // ── Direction arrows ────────────────────────────────────────────────────

    if (command.direction !== 'STOP' && Math.abs(velocity) > 0.0001) {
      const arrowDir = command.direction === 'LEFT' ? -1 : 1;
      const arrowX = carriageX + arrowDir * (cW / 2 + 14);
      ctx.fillStyle = '#50dc64';
      ctx.globalAlpha = 0.6 + command.speed * 0.4;
      ctx.beginPath();
      if (arrowDir === 1) {
        ctx.moveTo(arrowX, railY);
        ctx.lineTo(arrowX - 14, railY - 8);
        ctx.lineTo(arrowX - 14, railY + 8);
      } else {
        ctx.moveTo(arrowX, railY);
        ctx.lineTo(arrowX + 14, railY - 8);
        ctx.lineTo(arrowX + 14, railY + 8);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Labels ─────────────────────────────────────────────────────────────

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0.0', railLeft, railY + 52);
    ctx.textAlign = 'right';
    ctx.fillText('1.0', railRight, railY + 52);

    // Command badge
    const badgeColor =
      command.direction === 'LEFT' ? '#50dc64' :
      command.direction === 'RIGHT' ? '#50dc64' :
      '#e63946';
    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    const label = command.direction === 'STOP'
      ? '■ STOP'
      : command.direction === 'LEFT'
        ? '◀ LEFT'
        : 'RIGHT ▶';
    ctx.fillText(label, W / 2, 22);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px monospace';
    ctx.fillText(`speed ${(command.speed).toFixed(2)}`, W / 2, 36);

  }, [carriagePosition, targetX, command, velocity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="rail-simulator-wrap">
      <div className="rail-simulator-label">
        <span className="rail-label-badge">RAIL SIMULATION</span>
        <span className="rail-label-sub">Physical carriage position along 1m rail</span>
      </div>
      <canvas ref={canvasRef} className="rail-canvas" />
    </div>
  );
};

export default RailSimulator;
