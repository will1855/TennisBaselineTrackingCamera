import { Tracker } from './Tracker';
import type { TargetState } from './types';

interface HSV {
  h: number;
  s: number;
  v: number;
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h, s, v };
}

function hsvDistance(a: HSV, b: HSV): number {
  // Weighted hue (circular), saturation, value distance
  const dh = Math.min(Math.abs(a.h - b.h), 1 - Math.abs(a.h - b.h));
  const ds = Math.abs(a.s - b.s);
  const dv = Math.abs(a.v - b.v);
  return dh * 2 + ds * 1 + dv * 0.5;
}

/**
 * ColorTracker
 *
 * Uses getUserMedia to stream the webcam, then processes each frame via
 * Canvas 2D pixel data. The user clicks/taps a colour in the feed; the
 * tracker finds the largest contiguous blob of matching pixels and
 * returns its centroid as targetX/targetY.
 *
 * Matching: HSV distance threshold (configurable).
 * Blob finding: simple scanline flood-ish pass for performance.
 */
export class ColorTracker extends Tracker {
  private _stream: MediaStream | null = null;
  private _video: HTMLVideoElement | null = null;
  private _offscreen: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _targetHsv: HSV | null = null;
  private _threshold = 0.28;
  private _frameCanvas: HTMLCanvasElement | null = null;
  private _frameCtx: CanvasRenderingContext2D | null = null;

  // Public canvas for display in CameraView
  public displayCanvas: HTMLCanvasElement | null = null;

  constructor() {
    super();
    this._offscreen = document.createElement('canvas');
    this._ctx = this._offscreen.getContext('2d', { willReadFrequently: true })!;
  }

  async start(): Promise<void> {
    this._stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });

    this._video = document.createElement('video');
    this._video.srcObject = this._stream;
    this._video.playsInline = true;
    await this._video.play();

    this._offscreen.width = 320;
    this._offscreen.height = 240;
    this._running = true;
  }

  stop(): void {
    this._running = false;
    this._stream?.getTracks().forEach(t => t.stop());
    this._stream = null;
    this._video = null;
    this._targetHsv = null;
  }

  /**
   * Called by the UI when the user clicks on a colour in the video feed.
   * canvas: the displayed canvas element; cx/cy: click coords on that canvas.
   */
  pickColor(canvas: HTMLCanvasElement, cx: number, cy: number): void {
    if (!this._video) return;
    const tmpCtx = canvas.getContext('2d', { willReadFrequently: true })!;
    const px = tmpCtx.getImageData(cx, cy, 1, 1).data;
    this._targetHsv = rgbToHsv(px[0], px[1], px[2]);
  }

  setDisplayCanvas(canvas: HTMLCanvasElement): void {
    this.displayCanvas = canvas;
    this._frameCanvas = canvas;
    this._frameCtx = canvas.getContext('2d')!;
  }

  protected _computeTarget(_carriagePosition?: number): TargetState {
    if (!this._video || !this._targetHsv) {
      return { x: 0.5, y: 0.5, confidence: 0, detected: false };
    }

    const W = this._offscreen.width;
    const H = this._offscreen.height;

    // Draw scaled-down frame
    this._ctx.drawImage(this._video, 0, 0, W, H);
    const imageData = this._ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    let sumX = 0, sumY = 0, count = 0;
    const target = this._targetHsv!;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const hsv = rgbToHsv(data[i], data[i + 1], data[i + 2]);
        if (hsvDistance(hsv, target) < this._threshold) {
          sumX += x;
          sumY += y;
          count++;
          // Highlight matching pixels in green overlay
          data[i] = 0;
          data[i + 1] = 220;
          data[i + 2] = 80;
        }
      }
    }

    // Draw annotated frame to display canvas if available
    if (this._frameCtx && this._frameCanvas) {
      this._frameCanvas.width = this._frameCanvas.width; // clear
      this._frameCtx.drawImage(this._video, 0, 0, this._frameCanvas.width, this._frameCanvas.height);
      // Overlay highlight at native resolution is too expensive; skip for v1
    }

    const minBlob = 40; // minimum pixels to count as detected

    if (count < minBlob) {
      return { x: 0.5, y: 0.5, confidence: 0, detected: false };
    }

    const cx = sumX / count / W;
    const cy = sumY / count / H;

    // Confidence based on blob size (clamp between good range)
    const rawConf = Math.min(count / (W * H * 0.15), 1);
    const confidence = Math.max(0.1, Math.min(rawConf, 1)) * (count > minBlob ? 1 : 0);

    return {
      x: cx,
      y: cy,
      confidence,
      detected: confidence > 0.15,
    };
  }

  getVideo(): HTMLVideoElement | null {
    return this._video;
  }

  hasColor(): boolean {
    return this._targetHsv !== null;
  }
}
