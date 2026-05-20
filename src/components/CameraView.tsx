import React, { useRef, useEffect, useCallback } from 'react';
import { ColorTracker } from '../tracking/ColorTracker';
import type { TargetState } from '../tracking/types';

interface CameraViewProps {
  tracker: ColorTracker | null;
  isActive: boolean;
  targetState: TargetState;
}

/**
 * CameraView
 *
 * Displays the live webcam feed when ColorTracker is active.
 * The user clicks/taps the canvas to pick a tracking colour.
 * Draws a crosshair overlay at the current tracked position.
 */
const CameraView: React.FC<CameraViewProps> = ({ tracker, isActive, targetState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tracker) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = tracker.getVideo();
    if (!video || video.readyState < 2) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    // Match canvas size to video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw target crosshair
    if (targetState.detected) {
      const tx = targetState.x * canvas.width;
      const ty = targetState.y * canvas.height;
      const r = 24;

      ctx.save();
      ctx.strokeStyle = `rgba(80, 220, 100, ${0.4 + targetState.confidence * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#50dc64';
      ctx.lineWidth = 1.5;
      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(tx - r - 8, ty); ctx.lineTo(tx + r + 8, ty);
      ctx.moveTo(tx, ty - r - 8); ctx.lineTo(tx, ty + r + 8);
      ctx.stroke();
      ctx.restore();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [tracker, targetState]);

  useEffect(() => {
    if (isActive && tracker) {
      animRef.current = requestAnimationFrame(draw);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isActive, tracker, draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tracker || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const cx = Math.round((e.clientX - rect.left) * scaleX);
    const cy = Math.round((e.clientY - rect.top) * scaleY);
    tracker.pickColor(canvasRef.current, cx, cy);
  }, [tracker]);

  if (!isActive) {
    return (
      <div className="camera-placeholder">
        <div className="camera-placeholder-icon">📷</div>
        <p>Webcam mode inactive</p>
        <p className="camera-hint">Select <strong>Webcam Colour Tracking</strong> mode and press Start</p>
      </div>
    );
  }

  return (
    <div className="camera-view-wrap">
      <canvas
        ref={canvasRef}
        className="camera-canvas"
        onClick={handleClick}
        title="Click to pick tracking colour"
      />
      {tracker && !tracker.hasColor() && (
        <div className="camera-overlay-hint">
          👆 Click on the player/object to track
        </div>
      )}
      <div className="camera-confidence-bar">
        <div
          className="camera-confidence-fill"
          style={{ width: `${targetState.confidence * 100}%`, opacity: targetState.detected ? 1 : 0.3 }}
        />
      </div>
    </div>
  );
};

export default CameraView;
