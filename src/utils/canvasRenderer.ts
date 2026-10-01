import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { DEVICE_SPECS } from '../data/presets';
import {
  MaskShape,
  SplashLayer,
  SplashProject,
  VectorEmblemId,
} from '../types/splash';
import {
  buildTimelineSegments,
  evaluateProjectAtTime,
} from './flowEngine';

interface CachedImageEntry {
  img: HTMLImageElement;
  status: 'loading' | 'loaded' | 'error';
}

const imageCache = new Map<string, CachedImageEntry>();
const imageLoadListeners = new Set<() => void>();

export function subscribeToImageLoads(cb: () => void): () => void {
  imageLoadListeners.add(cb);
  return () => {
    imageLoadListeners.delete(cb);
  };
}

function notifyImageListeners() {
  imageLoadListeners.forEach((cb) => cb());
}

export function getOrLoadImage(url: string): CachedImageEntry | null {
  if (!url || !url.trim()) return null;
  const cleanUrl = url.trim();
  const existing = imageCache.get(cleanUrl);
  if (existing) return existing;

  const img = new Image();
  const entry: CachedImageEntry = { img, status: 'loading' };
  imageCache.set(cleanUrl, entry);

  if (!cleanUrl.startsWith('data:') && !cleanUrl.startsWith('blob:')) {
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
  }

  img.onload = () => {
    entry.status = 'loaded';
    notifyImageListeners();
  };

  img.onerror = () => {
    // If CORS anonymous failed on an external host, retry once without crossOrigin for preview
    if (img.crossOrigin === 'anonymous') {
      const retryImg = new Image();
      retryImg.referrerPolicy = 'no-referrer';
      retryImg.onload = () => {
        entry.img = retryImg;
        entry.status = 'loaded';
        notifyImageListeners();
      };
      retryImg.onerror = () => {
        entry.status = 'error';
        notifyImageListeners();
      };
      retryImg.src = cleanUrl;
    } else {
      entry.status = 'error';
      notifyImageListeners();
    }
  };

  img.src = cleanUrl;
  return entry;
}

export async function preloadProjectImages(project: SplashProject): Promise<void> {
  const urls: string[] = [];
  if (project.background.imageUrl) {
    urls.push(project.background.imageUrl);
  }
  for (const layer of project.layers) {
    if (layer.imageUrl) {
      urls.push(layer.imageUrl);
    }
  }

  await Promise.all(
    urls.map(
      (u) =>
        new Promise<void>((resolve) => {
          const entry = getOrLoadImage(u);
          if (!entry || entry.status !== 'loading') {
            resolve();
            return;
          }
          const timeout = setTimeout(resolve, 2500);
          const unsub = subscribeToImageLoads(() => {
            const current = imageCache.get(u.trim());
            if (current && current.status !== 'loading') {
              clearTimeout(timeout);
              unsub();
              resolve();
            }
          });
        })
    )
  );
}

function createMaskPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  shape: MaskShape,
  customRadius: number
) {
  ctx.beginPath();
  const hw = w / 2;
  const hh = h / 2;

  if (shape === 'circle') {
    ctx.arc(x + hw, y + hh, Math.min(hw, hh), 0, Math.PI * 2);
  } else if (shape === 'hexagon') {
    const cx = x + hw;
    const cy = y + hh;
    const r = Math.min(hw, hh);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (shape === 'squircle') {
    // Smooth iOS continuous corner superellipse approximation
    const r = Math.min(hw, hh, Math.max(customRadius, Math.min(w, h) * 0.24));
    ctx.roundRect(x, y, w, h, r);
  } else if (shape === 'rounded') {
    const r = Math.min(hw, hh, Math.max(4, customRadius));
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function drawVectorEmblem(
  ctx: CanvasRenderingContext2D,
  emblemId: VectorEmblemId,
  w: number,
  h: number,
  primary: string,
  secondary: string,
  accent: string,
  strokeWidth: number
) {
  const r = Math.min(w, h) / 2;
  ctx.save();
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (emblemId) {
    case 'kinetix-prism': {
      const grad = ctx.createLinearGradient(-r, -r, r, r);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, secondary);
      ctx.strokeStyle = grad;
      ctx.fillStyle = `${primary}22`;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.88);
      ctx.lineTo(r * 0.82, r * 0.58);
      ctx.lineTo(-r * 0.82, r * 0.58);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.88);
      ctx.lineTo(0, r * 0.58);
      ctx.moveTo(0, 0.08 * r);
      ctx.lineTo(r * 0.82, r * 0.58);
      ctx.moveTo(0, 0.08 * r);
      ctx.lineTo(-r * 0.82, r * 0.58);
      ctx.stroke();
      break;
    }

    case 'orbital-rings': {
      ctx.strokeStyle = primary;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.9, r * 0.38, Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = secondary;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.9, r * 0.38, -Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'fintech-shield': {
      const grad = ctx.createLinearGradient(-r, -r, r, r);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, secondary);
      ctx.strokeStyle = grad;
      ctx.fillStyle = `${primary}1A`;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.85);
      ctx.lineTo(r * 0.72, -r * 0.52);
      ctx.lineTo(r * 0.72, r * 0.08);
      ctx.bezierCurveTo(r * 0.72, r * 0.55, r * 0.35, r * 0.8, 0, r * 0.92);
      ctx.bezierCurveTo(-r * 0.35, r * 0.8, -r * 0.72, r * 0.55, -r * 0.72, r * 0.08);
      ctx.lineTo(-r * 0.72, -r * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = accent;
      ctx.lineWidth = strokeWidth * 1.3;
      ctx.beginPath();
      ctx.moveTo(-r * 0.28, r * 0.04);
      ctx.lineTo(-r * 0.06, r * 0.26);
      ctx.lineTo(r * 0.34, -r * 0.18);
      ctx.stroke();
      break;
    }

    case 'pulse-wave': {
      ctx.strokeStyle = secondary;
      ctx.globalAlpha *= 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha /= 0.35;

      ctx.strokeStyle = primary;
      ctx.lineWidth = strokeWidth * 1.4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.78, 0);
      ctx.lineTo(-r * 0.36, 0);
      ctx.lineTo(-r * 0.18, -r * 0.52);
      ctx.lineTo(r * 0.08, r * 0.56);
      ctx.lineTo(r * 0.28, -r * 0.24);
      ctx.lineTo(r * 0.44, 0);
      ctx.lineTo(r * 0.78, 0);
      ctx.stroke();
      break;
    }

    case 'neural-nexus': {
      const pts = [
        [0, -r * 0.8],
        [r * 0.75, -r * 0.25],
        [r * 0.48, r * 0.68],
        [-r * 0.48, r * 0.68],
        [-r * 0.75, -r * 0.25],
      ];
      ctx.strokeStyle = secondary;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          ctx.beginPath();
          ctx.moveTo(pts[i][0], pts[i][1]);
          ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.stroke();
        }
      }
      ctx.fillStyle = primary;
      for (const [px, py] of pts) {
        ctx.beginPath();
        ctx.arc(px, py, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'velocity-bolt': {
      const grad = ctx.createLinearGradient(-r, -r, r, r);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, accent);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(r * 0.12, -r * 0.9);
      ctx.lineTo(-r * 0.58, r * 0.08);
      ctx.lineTo(-r * 0.04, r * 0.08);
      ctx.lineTo(-r * 0.18, r * 0.9);
      ctx.lineTo(r * 0.58, -r * 0.1);
      ctx.lineTo(r * 0.04, -r * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'luxury-monogram': {
      ctx.strokeStyle = primary;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = secondary;
      ctx.lineWidth = strokeWidth * 0.75;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ctx.stroke();

      // Geometric A/M lattice
      ctx.strokeStyle = primary;
      ctx.lineWidth = strokeWidth * 1.1;
      ctx.beginPath();
      ctx.moveTo(-r * 0.36, r * 0.42);
      ctx.lineTo(0, -r * 0.46);
      ctx.lineTo(r * 0.36, r * 0.42);
      ctx.moveTo(-r * 0.22, r * 0.12);
      ctx.lineTo(r * 0.22, r * 0.12);
      ctx.stroke();
      break;
    }

    case 'spatial-cube':
    default: {
      const s = r * 0.82;
      const dx = s * Math.cos(Math.PI / 6);
      const dy = s * Math.sin(Math.PI / 6);

      // Top face
      ctx.fillStyle = `${secondary}33`;
      ctx.strokeStyle = primary;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(dx, -dy);
      ctx.lineTo(0, 0);
      ctx.lineTo(-dx, -dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Left face
      ctx.fillStyle = `${primary}22`;
      ctx.beginPath();
      ctx.moveTo(-dx, -dy);
      ctx.lineTo(0, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-dx, dy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right face
      ctx.fillStyle = `${accent}33`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dx, -dy);
      ctx.lineTo(dx, dy);
      ctx.lineTo(0, s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

export interface RenderFrameOptions {
  includeSystemBars?: boolean;
  includeGuides?: boolean;
}

export function renderSplashFrame(
  ctx: CanvasRenderingContext2D,
  project: SplashProject,
  timeMs: number,
  canvasWidth: number,
  canvasHeight: number,
  options: RenderFrameOptions = {}
) {
  const device = DEVICE_SPECS[project.devicePreset] || DEVICE_SPECS['iphone-16-pro'];
  const scaleFactor = canvasWidth / device.width;

  const frameState = evaluateProjectAtTime(project, timeMs);
  const { background, layers } = project;

  ctx.save();
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.scale(scaleFactor, scaleFactor);

  const w = device.width;
  const h = device.height;
  const cx = w / 2;
  const cy = h / 2;

  // 1. RENDER BACKGROUND
  ctx.save();
  if (background.mode === 'solid') {
    ctx.fillStyle = background.solidColor || '#090D16';
    ctx.fillRect(0, 0, w, h);
  } else if (
    background.mode === 'linear-gradient' ||
    background.mode === 'mesh-aurora' ||
    background.mode === 'image-url'
  ) {
    const angleDeg =
      (background.gradientAngle || 135) + (frameState.bgGradientAngleOffset || 0);
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    const diag = Math.hypot(w, h) / 2;
    const x0 = cx - Math.cos(angleRad) * diag;
    const y0 = cy - Math.sin(angleRad) * diag;
    const x1 = cx + Math.cos(angleRad) * diag;
    const y1 = cy + Math.sin(angleRad) * diag;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, background.gradientStart || '#090D16');
    if (background.useThreeStopGradient) {
      grad.addColorStop(0.5, background.gradientMid || '#1E293B');
    }
    grad.addColorStop(1, background.gradientEnd || '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (background.mode === 'radial-gradient') {
    const grad = ctx.createRadialGradient(cx, cy * 0.85, 10, cx, cy, Math.max(w, h) * 0.75);
    grad.addColorStop(0, background.gradientStart || '#1E293B');
    if (background.useThreeStopGradient) {
      grad.addColorStop(0.55, background.gradientMid || '#0F172A');
    }
    grad.addColorStop(1, background.gradientEnd || '#060911');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Mesh Aurora Orbs
  if (
    (background.mode === 'mesh-aurora' || background.meshOrbs?.length > 0) &&
    background.meshOrbs
  ) {
    for (let i = 0; i < background.meshOrbs.length; i++) {
      const orb = background.meshOrbs[i];
      const angleShift = ((frameState.bgGradientAngleOffset || 0) * Math.PI) / 180;
      const ox = (orb.xPercent / 100) * w + Math.sin(angleShift + i) * 18;
      const oy = (orb.yPercent / 100) * h + Math.cos(angleShift + i) * 18;
      const r = Math.max(20, orb.radiusPx);
      const radGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
      radGrad.addColorStop(0, orb.color);
      radGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, orb.opacity));
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  // Background Image URL (if mode === 'image-url' or if user supplied background.imageUrl with opacity > 0)
  if (
    background.imageUrl &&
    background.imageUrl.trim() !== '' &&
    (background.mode === 'image-url' || background.imageOpacity > 0.05)
  ) {
    const bgEntry = getOrLoadImage(background.imageUrl);
    if (bgEntry && bgEntry.status === 'loaded') {
      ctx.save();
      ctx.globalAlpha =
        background.mode === 'image-url'
          ? Math.max(0, Math.min(1, background.imageOpacity ?? 1))
          : Math.max(0, Math.min(1, background.imageOpacity ?? 0));

      if (background.imageBlur > 0) {
        ctx.filter = `blur(${background.imageBlur}px)`;
      }

      const totalScale =
        (background.imageScale || 1) * (frameState.bgImageScaleMultiplier || 1);
      ctx.translate(cx, cy);
      ctx.scale(totalScale, totalScale);
      ctx.translate(-cx, -cy);

      const img = bgEntry.img;
      const iw = img.naturalWidth || w;
      const ih = img.naturalHeight || h;

      if (background.imageFit === 'contain') {
        const s = Math.min(w / iw, h / ih);
        const dw = iw * s;
        const dh = ih * s;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      } else if (background.imageFit === 'fill') {
        ctx.drawImage(img, 0, 0, w, h);
      } else {
        // cover
        const s = Math.max(w / iw, h / ih);
        const dw = iw * s;
        const dh = ih * s;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
      ctx.restore();
    }
  }

  // Scrim Overlay for Contrast
  const scrimAlpha =
    frameState.bgScrimOpacityOverride !== undefined
      ? frameState.bgScrimOpacityOverride
      : background.scrimOpacity;

  if (scrimAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, scrimAlpha));
    ctx.fillStyle = background.scrimColor || '#050811';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Pattern Overlay
  if (background.patternOverlay !== 'none' && background.patternOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, background.patternOpacity));
    ctx.strokeStyle = '#94A3B8';
    ctx.fillStyle = '#94A3B8';
    ctx.lineWidth = 0.5;

    if (background.patternOverlay === 'subtle-grid') {
      const step = 32;
      ctx.beginPath();
      for (let x = 0; x <= w; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    } else if (background.patternOverlay === 'radial-dots') {
      const step = 26;
      for (let x = 16; x < w; x += step) {
        for (let y = 16; y < h; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (background.patternOverlay === 'architectural-lines') {
      ctx.beginPath();
      ctx.moveTo(w * 0.18, 0);
      ctx.lineTo(w * 0.18, h);
      ctx.moveTo(w * 0.82, 0);
      ctx.lineTo(w * 0.82, h);
      ctx.moveTo(0, h * 0.35);
      ctx.lineTo(w, h * 0.35);
      ctx.moveTo(0, h * 0.65);
      ctx.lineTo(w, h * 0.65);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();

  // 2. RENDER LAYERS
  for (const layer of layers) {
    if (!layer.visible) continue;
    const snap = frameState.layerSnapshots[layer.id];
    if (!snap || snap.opacity <= 0.005) continue;

    ctx.save();
    const lx = cx + snap.x;
    const ly = cy + snap.y;

    ctx.translate(lx, ly);
    if (snap.rotation !== 0) {
      ctx.rotate((snap.rotation * Math.PI) / 180);
    }
    ctx.scale(snap.scaleX, snap.scaleY);
    ctx.globalAlpha = Math.max(0, Math.min(1, snap.opacity));

    if (snap.blur > 0.2) {
      ctx.filter = `blur(${snap.blur.toFixed(1)}px)`;
    }

    const activeGlowBlur = (layer.glowBlur || 0) * (snap.glowScale ?? 1);
    if (layer.glowColor && activeGlowBlur > 0) {
      ctx.shadowColor = layer.glowColor;
      ctx.shadowBlur = activeGlowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else if (layer.shadowColor && (layer.shadowBlur || 0) > 0) {
      ctx.shadowColor = layer.shadowColor;
      ctx.shadowBlur = layer.shadowBlur || 16;
      ctx.shadowOffsetY = layer.shadowOffsetY || 8;
    }

    const lw = layer.width;
    const lh = layer.height;

    if (layer.type === 'shape-ring') {
      const strokeCol = snap.colorOverride || layer.strokeColor || '#38BDF8';
      const fillCol = snap.colorOverride || layer.fillColor || '#38BDF8';
      ctx.lineWidth = layer.shapeStrokeWidth ?? 1.5;
      ctx.strokeStyle = strokeCol;

      if (layer.shapeKind === 'rounded-plate') {
        ctx.beginPath();
        ctx.roundRect(-lw / 2, -lh / 2, lw, lh, snap.borderRadius || 24);
        if ((layer.fillOpacity ?? 0.1) > 0) {
          ctx.save();
          ctx.globalAlpha *= layer.fillOpacity ?? 0.1;
          ctx.fillStyle = fillCol;
          ctx.fill();
          ctx.restore();
        }
        if ((layer.shapeStrokeWidth ?? 1.5) > 0) ctx.stroke();
      } else if (layer.shapeKind === 'diamond-frame') {
        ctx.save();
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.roundRect(-lw / 2, -lh / 2, lw, lh, 12);
        ctx.stroke();
        ctx.restore();
      } else {
        // circle-ring
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(lw, lh) / 2, 0, Math.PI * 2);
        if ((layer.fillOpacity ?? 0.06) > 0) {
          ctx.save();
          ctx.globalAlpha *= layer.fillOpacity ?? 0.06;
          ctx.fillStyle = fillCol;
          ctx.fill();
          ctx.restore();
        }
        if ((layer.shapeStrokeWidth ?? 1.5) > 0) ctx.stroke();
      }
    } else if (layer.type === 'image-logo') {
      const maskShape = layer.maskShape || 'squircle';
      const radius = snap.borderRadius ?? 28;

      // Container shadow & base fill
      ctx.save();
      createMaskPath(ctx, -lw / 2, -lh / 2, lw, lh, maskShape, radius);
      if ((layer.containerBgOpacity ?? 1) > 0) {
        ctx.fillStyle = layer.containerBgColor || '#0F172A';
        ctx.fill();
      }
      ctx.restore();

      // Clip & draw image URL
      ctx.save();
      createMaskPath(ctx, -lw / 2, -lh / 2, lw, lh, maskShape, radius);
      ctx.clip();

      const imgEntry = layer.imageUrl ? getOrLoadImage(layer.imageUrl) : null;
      if (imgEntry && imgEntry.status === 'loaded') {
        const img = imgEntry.img;
        const iw = img.naturalWidth || lw;
        const ih = img.naturalHeight || lh;
        if (layer.imageFit === 'contain') {
          const s = Math.min(lw / iw, lh / ih) * 0.84;
          const dw = iw * s;
          const dh = ih * s;
          ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        } else {
          const s = Math.max(lw / iw, lh / ih);
          const dw = iw * s;
          const dh = ih * s;
          ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
        }
      } else {
        // Zero-Broken-Image Policy: Sleek Studio Vector Fallback if URL is empty or failed
        const grad = ctx.createLinearGradient(-lw / 2, -lh / 2, lw / 2, lh / 2);
        grad.addColorStop(0, '#1E293B');
        grad.addColorStop(1, '#0F172A');
        ctx.fillStyle = grad;
        ctx.fillRect(-lw / 2, -lh / 2, lw, lh);
        drawVectorEmblem(
          ctx,
          'kinetix-prism',
          lw * 0.65,
          lh * 0.65,
          layer.borderColor || '#38BDF8',
          '#94A3B8',
          '#F8FAFC',
          2.5
        );
      }
      ctx.restore();

      // Border stroke
      if ((layer.borderWidth ?? 0) > 0) {
        ctx.save();
        ctx.shadowBlur = 0;
        createMaskPath(ctx, -lw / 2, -lh / 2, lw, lh, maskShape, radius);
        ctx.strokeStyle = snap.colorOverride || layer.borderColor || '#38BDF8';
        ctx.lineWidth = layer.borderWidth || 1.5;
        ctx.stroke();
        ctx.restore();
      }
    } else if (layer.type === 'vector-emblem') {
      drawVectorEmblem(
        ctx,
        layer.emblemId || 'kinetix-prism',
        lw,
        lh,
        snap.colorOverride || layer.primaryColor || '#38BDF8',
        layer.secondaryColor || '#818CF8',
        layer.accentColor || '#F8FAFC',
        layer.strokeWidth || 2.5
      );
    } else if (layer.type === 'text') {
      const fontName = layer.fontFamily || 'Syne';
      const fontSize = layer.fontSize || 24;
      const fontWeight = layer.fontWeight || 700;
      ctx.font = `${fontWeight} ${fontSize}px "${fontName}", sans-serif`;
      ctx.textAlign = layer.textAlign || 'center';
      ctx.textBaseline = 'middle';

      if ('letterSpacing' in ctx) {
        (ctx as unknown as { letterSpacing: string }).letterSpacing = `${
          layer.letterSpacing || 0
        }px`;
      }

      const primaryTextCol = snap.colorOverride || layer.textColor || '#F8FAFC';
      if (layer.useGradientText && layer.textGradientEnd) {
        const grad = ctx.createLinearGradient(-lw / 3, -fontSize / 2, lw / 3, fontSize / 2);
        grad.addColorStop(0, primaryTextCol);
        grad.addColorStop(1, layer.textGradientEnd);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = primaryTextCol;
      }

      ctx.fillText(layer.text || '', 0, 0);
    } else if (layer.type === 'loader') {
      drawLoaderLayer(ctx, layer, snap.loaderProgress ?? 50, timeMs);
    }

    ctx.restore();
  }

  // 3. OPTIONAL SYSTEM BARS (iOS 18 Dynamic Island / Android 15 Status & Gesture Pill)
  if (options.includeSystemBars && project.systemBarTheme !== 'hidden') {
    drawSystemChrome(ctx, device, project.systemBarTheme);
  }

  // 4. OPTIONAL STUDIO GUIDES (Safe Area, Center Grid, Android 12+ SplashScreen Icon Mask)
  if (options.includeGuides) {
    if (project.showCenterGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();
      ctx.restore();
    }

    if (project.showSafeArea) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(
        16,
        device.safeAreaTop,
        w - 32,
        h - device.safeAreaTop - device.safeAreaBottom
      );
      ctx.restore();
    }

    if (project.showAndroid12Mask) {
      // Official Android 12+ SplashScreen API 240dp outer / 160dp inner circular icon mask
      ctx.save();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.beginPath();
      ctx.arc(cx, cy, 120, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawLoaderLayer(
  ctx: CanvasRenderingContext2D,
  layer: SplashLayer,
  progress: number,
  timeMs: number
) {
  const w = layer.width;
  const h = layer.height;
  const color = layer.loaderColor || '#38BDF8';
  const track = layer.loaderTrackColor || '#1E293B';
  const thickness = layer.loaderThickness || 4;
  const style = layer.loaderStyle || 'progress-bar';

  if (style === 'progress-bar' || style === 'shimmer-track') {
    const r = thickness / 2;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = track;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -thickness / 2, w, thickness, r);
    ctx.fill();
    ctx.restore();

    const fillW = Math.max(thickness, (w * Math.max(2, progress)) / 100);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -thickness / 2, fillW, thickness, r);
    ctx.fill();
  } else if (style === 'spinner-ring') {
    const r = Math.min(w, h) / 2;
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = track;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const spinOffset = (timeMs / 260) % (Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r, spinOffset, spinOffset + Math.PI * 1.35);
    ctx.stroke();
  } else if (style === 'pulse-dots') {
    const dotCount = 3;
    const spacing = 18;
    for (let i = 0; i < dotCount; i++) {
      const dx = (i - 1) * spacing;
      const phase = (timeMs / 180 - i * 0.8) % (Math.PI * 2);
      const pulse = 0.65 + 0.35 * Math.sin(phase);
      ctx.save();
      ctx.globalAlpha *= pulse;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dx, 0, (thickness / 2) * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (style === 'minimal-percent') {
    ctx.font = `600 13px "JetBrains Mono", monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(progress)}%`, 0, 0);
  }
}

function drawSystemChrome(
  ctx: CanvasRenderingContext2D,
  device: (typeof DEVICE_SPECS)['iphone-16-pro'],
  theme: 'light' | 'dark'
) {
  const w = device.width;
  const h = device.height;
  const fg = theme === 'light' ? 'rgba(248, 250, 252, 0.9)' : 'rgba(15, 23, 42, 0.9)';

  ctx.save();
  ctx.fillStyle = fg;
  ctx.strokeStyle = fg;
  ctx.font = `600 13px "Plus Jakarta Sans", sans-serif`;
  ctx.textBaseline = 'middle';

  // Time
  ctx.textAlign = 'left';
  ctx.fillText('9:41', 28, 24);

  // Hardware Cutout (Dynamic Island or Punch-Hole)
  if (device.cutoutType === 'dynamic-island') {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 54, 11, 108, 31, 15.5);
    ctx.fill();
    ctx.restore();
  } else if (device.cutoutType === 'punch-hole' || device.cutoutType === 'small-punch') {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(w / 2, 22, device.cutoutType === 'small-punch' ? 6 : 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Signal + Battery bars on top right
  const rx = w - 28;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(rx - 22, 18, 20, 11, 3);
  ctx.stroke();
  ctx.fillRect(rx - 20, 20, 14, 7);

  // Bottom Home Indicator bar
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  const barW = device.platform === 'ios' ? 134 : 108;
  ctx.roundRect(w / 2 - barW / 2, h - 14, barW, 4.5, 2.5);
  ctx.fill();

  ctx.restore();
}

/**
 * Exports a high-resolution PNG or JPG snapshot at the exact native device resolution
 */
export async function exportSplashImageFile(
  project: SplashProject,
  timeMs: number,
  format: 'png' | 'jpg',
  includeSystemBars: boolean
): Promise<void> {
  await preloadProjectImages(project);

  const device = DEVICE_SPECS[project.devicePreset] || DEVICE_SPECS['iphone-16-pro'];
  const canvas = document.createElement('canvas');
  canvas.width = device.exportWidth;
  canvas.height = device.exportHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  renderSplashFrame(ctx, project, timeMs, canvas.width, canvas.height, {
    includeSystemBars,
    includeGuides: false,
  });

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'jpg' ? 0.95 : undefined;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), mimeType, quality)
  );
  if (!blob) throw new Error('Failed to encode image blob');

  const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}-${device.id}-${device.exportWidth}x${device.exportHeight}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Exports the entire Figma Smart Animate splash flow as a real 60fps MP4 video file
 * using WebCodecs VideoEncoder + mp4-muxer, with automatic MediaRecorder fallback.
 */
export async function exportSplashVideoMP4(
  project: SplashProject,
  includeSystemBars: boolean,
  onProgress: (percent: number, stage: string) => void
): Promise<void> {
  onProgress(2, 'Preloading high-res image assets...');
  await preloadProjectImages(project);

  const device = DEVICE_SPECS[project.devicePreset] || DEVICE_SPECS['iphone-16-pro'];
  const { totalDurationMs } = buildTimelineSegments(project.flowStates);
  const fps = 60;
  const totalFrames = Math.max(30, Math.ceil((totalDurationMs / 1000) * fps));

  // Ensure even dimensions for H.264 encoder compatibility
  const outWidth = Math.floor((device.width * 2) / 2) * 2;
  const outHeight = Math.floor((device.height * 2) / 2) * 2;

  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const safeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Prefer deterministic frame-by-frame WebCodecs + mp4-muxer if available
  if (typeof window !== 'undefined' && 'VideoEncoder' in window) {
    try {
      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width: outWidth,
          height: outHeight,
        },
        fastStart: 'in-memory',
      });

      const encoder = new VideoEncoder({
        output: (chunk, meta) => {
          muxer.addVideoChunk(chunk, meta);
        },
        error: (err) => {
          console.error('VideoEncoder error:', err);
        },
      });

      encoder.configure({
        codec: 'avc1.42002a',
        width: outWidth,
        height: outHeight,
        bitrate: 6_000_000,
        framerate: fps,
      });

      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        const tMs = (frameIdx / (totalFrames - 1)) * totalDurationMs;
        renderSplashFrame(ctx, project, tMs, outWidth, outHeight, {
          includeSystemBars,
          includeGuides: false,
        });

        const timestampUs = Math.round((frameIdx / fps) * 1_000_000);
        const videoFrame = new VideoFrame(canvas, { timestamp: timestampUs });
        encoder.encode(videoFrame, { keyFrame: frameIdx % 30 === 0 });
        videoFrame.close();

        if (frameIdx % 4 === 0 || frameIdx === totalFrames - 1) {
          const pct = Math.round(((frameIdx + 1) / totalFrames) * 92);
          onProgress(
            pct,
            `Encoding MP4 frame ${frameIdx + 1} / ${totalFrames} (60 FPS)`
          );
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      onProgress(96, 'Finalizing MP4 container...');
      await encoder.flush();
      muxer.finalize();

      const { buffer } = muxer.target;
      const blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}-${device.platform}-splash.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      onProgress(100, 'MP4 Export Complete');
      return;
    } catch (err) {
      console.warn('WebCodecs MP4 encode failed, using MediaRecorder fallback:', err);
    }
  }

  // Fallback to MediaRecorder stream capture
  const stream = canvas.captureStream(fps);
  const mimeCandidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  const selectedMime =
    mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

  const recorder = new MediaRecorder(
    stream,
    selectedMime ? { mimeType: selectedMime, videoBitsPerSecond: 5_000_000 } : undefined
  );
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stoppedPromise = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    const tMs = (frameIdx / (totalFrames - 1)) * totalDurationMs;
    renderSplashFrame(ctx, project, tMs, outWidth, outHeight, {
      includeSystemBars,
      includeGuides: false,
    });
    const pct = Math.round(((frameIdx + 1) / totalFrames) * 95);
    onProgress(pct, `Recording frame ${frameIdx + 1} / ${totalFrames}...`);
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  recorder.stop();
  await stoppedPromise;

  const blob = new Blob(chunks, { type: selectedMime || 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}-${device.platform}-splash.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  onProgress(100, 'MP4 Export Complete');
}
