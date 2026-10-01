import {
  FlowStateNode,
  FlowTransition,
  LayerStateSnapshot,
  SplashProject,
} from '../types/splash';

/**
 * Evaluates a cubic bezier at parameter t in [0, 1] for given x1, y1, x2, y2
 */
export function evaluateCubicBezier(
  x: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (x1 === y1 && x2 === y2) return x;

  const sampleCurveX = (t: number) =>
    ((1 - 3 * x2 + 3 * x1) * t * t * t) +
    ((3 * x2 - 6 * x1) * t * t) +
    (3 * x1 * t);

  const sampleCurveY = (t: number) =>
    ((1 - 3 * y2 + 3 * y1) * t * t * t) +
    ((3 * y2 - 6 * y1) * t * t) +
    (3 * y1 * t);

  const sampleCurveDerivativeX = (t: number) =>
    (3 * (1 - 3 * x2 + 3 * x1) * t * t) +
    (2 * (3 * x2 - 6 * x1) * t) +
    (3 * x1);

  // Solve for t given x
  let t2 = x;
  for (let i = 0; i < 8; i++) {
    const xEst = sampleCurveX(t2) - x;
    if (Math.abs(xEst) < 1e-6) break;
    const d = sampleCurveDerivativeX(t2);
    if (Math.abs(d) < 1e-6) break;
    t2 = t2 - xEst / d;
  }

  t2 = Math.max(0, Math.min(1, t2));
  return sampleCurveY(t2);
}

/**
 * Evaluates analytical underdamped/critically damped spring at normalized progress p in [0, 1]
 */
export function evaluateSpring(
  p: number,
  stiffness: number,
  damping: number,
  mass: number
): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  // Map normalized progress [0,1] to a physical 1.0s simulation window
  const t = p * 1.0;
  const w0 = Math.sqrt(stiffness / Math.max(0.1, mass));
  const zeta = damping / (2 * Math.sqrt(stiffness * Math.max(0.1, mass)));

  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const env = Math.exp(-zeta * w0 * t);
    const val = 1 - env * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    return val;
  } else {
    const env = Math.exp(-w0 * t);
    return 1 - env * (1 + w0 * t);
  }
}

export function applyTransitionEasing(rawProgress: number, transition: FlowTransition): number {
  const clamped = Math.max(0, Math.min(1, rawProgress));
  if (transition.easingPreset === 'linear') {
    return clamped;
  }
  if (
    transition.animationMode === 'spring-physics' ||
    transition.easingPreset === 'spring-gentle' ||
    transition.easingPreset === 'spring-bouncy'
  ) {
    return evaluateSpring(
      clamped,
      transition.spring.stiffness,
      transition.spring.damping,
      transition.spring.mass
    );
  }
  const [x1, y1, x2, y2] = transition.bezier;
  return evaluateCubicBezier(clamped, x1, y1, x2, y2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(hexA: string, hexB: string, t: number): string {
  const parseHex = (h: string) => {
    const clean = h.replace('#', '').trim();
    if (clean.length === 3) {
      return [
        parseInt(clean[0] + clean[0], 16),
        parseInt(clean[1] + clean[1], 16),
        parseInt(clean[2] + clean[2], 16),
      ];
    }
    if (clean.length >= 6) {
      return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
      ];
    }
    return [255, 255, 255];
  };

  const [r1, g1, b1] = parseHex(hexA);
  const [r2, g2, b2] = parseHex(hexB);
  const clamped = Math.max(0, Math.min(1, t));
  const r = Math.round(lerp(r1, r2, clamped));
  const g = Math.round(lerp(g1, g2, clamped));
  const b = Math.round(lerp(b1, b2, clamped));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

export interface TimelineSegment {
  fromStateIndex: number;
  toStateIndex: number;
  startTimeMs: number;
  holdEndTimeMs: number;
  endTimeMs: number;
  delayMs: number;
  durationMs: number;
}

export function buildTimelineSegments(flowStates: FlowStateNode[]): {
  segments: TimelineSegment[];
  totalDurationMs: number;
} {
  if (flowStates.length === 0) {
    return { segments: [], totalDurationMs: 1000 };
  }
  if (flowStates.length === 1) {
    const d = flowStates[0].transitionToNext.delayMs || 1000;
    return {
      segments: [
        {
          fromStateIndex: 0,
          toStateIndex: 0,
          startTimeMs: 0,
          holdEndTimeMs: d,
          endTimeMs: d,
          delayMs: d,
          durationMs: 0,
        },
      ],
      totalDurationMs: d,
    };
  }

  const segments: TimelineSegment[] = [];
  let cursor = 0;

  for (let i = 0; i < flowStates.length - 1; i++) {
    const state = flowStates[i];
    const delayMs = Math.max(0, state.transitionToNext.delayMs);
    const durationMs = Math.max(50, state.transitionToNext.durationMs);
    const holdEnd = cursor + delayMs;
    const segEnd = holdEnd + durationMs;

    segments.push({
      fromStateIndex: i,
      toStateIndex: i + 1,
      startTimeMs: cursor,
      holdEndTimeMs: holdEnd,
      endTimeMs: segEnd,
      delayMs,
      durationMs,
    });

    cursor = segEnd;
  }

  // Final state hold segment so the completed lockup is visible before looping
  const lastState = flowStates[flowStates.length - 1];
  const finalHoldMs = Math.max(200, lastState.transitionToNext.delayMs || 350);
  segments.push({
    fromStateIndex: flowStates.length - 1,
    toStateIndex: flowStates.length - 1,
    startTimeMs: cursor,
    holdEndTimeMs: cursor + finalHoldMs,
    endTimeMs: cursor + finalHoldMs,
    delayMs: finalHoldMs,
    durationMs: 0,
  });
  cursor += finalHoldMs;

  return {
    segments,
    totalDurationMs: Math.max(200, cursor),
  };
}

export const DEFAULT_LAYER_SNAPSHOT: LayerStateSnapshot = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1,
  blur: 0,
  borderRadius: 24,
  glowScale: 1,
  loaderProgress: 50,
};

export interface InterpolatedFrameState {
  activeStateIndex: number;
  nextStateIndex: number;
  rawTransitionProgress: number;
  easedTransitionProgress: number;
  bgGradientAngleOffset: number;
  bgImageScaleMultiplier: number;
  bgScrimOpacityOverride?: number;
  layerSnapshots: Record<string, LayerStateSnapshot>;
  irisMaskProgress?: number; // If transition is iris-mask
}

export function evaluateProjectAtTime(
  project: SplashProject,
  timeMs: number
): InterpolatedFrameState {
  const { flowStates, layers } = project;
  const { segments, totalDurationMs } = buildTimelineSegments(flowStates);
  const clampedTime = Math.max(0, Math.min(totalDurationMs, timeMs));

  let activeSeg = segments[segments.length - 1];
  for (const seg of segments) {
    if (clampedTime >= seg.startTimeMs && clampedTime <= seg.endTimeMs) {
      activeSeg = seg;
      break;
    }
  }

  const fromState = flowStates[activeSeg.fromStateIndex] || flowStates[0];
  const toState = flowStates[activeSeg.toStateIndex] || fromState;

  let rawProgress = 0;
  if (activeSeg.durationMs > 0 && clampedTime > activeSeg.holdEndTimeMs) {
    rawProgress =
      (clampedTime - activeSeg.holdEndTimeMs) / activeSeg.durationMs;
  }
  rawProgress = Math.max(0, Math.min(1, rawProgress));

  const transition = fromState.transitionToNext;
  const eased = applyTransitionEasing(rawProgress, transition);

  const interpolatedLayers: Record<string, LayerStateSnapshot> = {};

  for (const layer of layers) {
    const snapA: LayerStateSnapshot = {
      ...DEFAULT_LAYER_SNAPSHOT,
      ...(fromState.layerSnapshots[layer.id] || {}),
    };
    const snapB: LayerStateSnapshot = {
      ...DEFAULT_LAYER_SNAPSHOT,
      ...(toState.layerSnapshots[layer.id] || snapA),
    };

    // Apply special transition mode modifiers if selected
    let modeYOffset = 0;
    let modeScaleMultiplier = 1;

    if (transition.animationMode === 'slide-up' && fromState.id !== toState.id) {
      modeYOffset = (1 - eased) * 28 * Math.sin(rawProgress * Math.PI);
    } else if (transition.animationMode === 'zoom-morph' && fromState.id !== toState.id) {
      modeScaleMultiplier = 1 + 0.08 * Math.sin(rawProgress * Math.PI);
    }

    const opacityEase = Math.max(0, Math.min(1, rawProgress));
    const finalOpacity =
      transition.animationMode === 'dissolve'
        ? lerp(snapA.opacity, snapB.opacity, opacityEase)
        : Math.max(0, Math.min(1, lerp(snapA.opacity, snapB.opacity, eased)));

    interpolatedLayers[layer.id] = {
      x: lerp(snapA.x, snapB.x, eased),
      y: lerp(snapA.y, snapB.y, eased) + modeYOffset,
      scaleX: Math.max(0.01, lerp(snapA.scaleX, snapB.scaleX, eased) * modeScaleMultiplier),
      scaleY: Math.max(0.01, lerp(snapA.scaleY, snapB.scaleY, eased) * modeScaleMultiplier),
      rotation: lerp(snapA.rotation, snapB.rotation, eased),
      opacity: finalOpacity,
      blur: Math.max(0, lerp(snapA.blur, snapB.blur, opacityEase)),
      borderRadius: Math.max(0, lerp(snapA.borderRadius, snapB.borderRadius, eased)),
      glowScale: Math.max(
        0,
        lerp(snapA.glowScale ?? 1, snapB.glowScale ?? 1, eased)
      ),
      loaderProgress: Math.max(
        0,
        Math.min(
          100,
          lerp(snapA.loaderProgress ?? 0, snapB.loaderProgress ?? 100, opacityEase)
        )
      ),
      colorOverride:
        snapA.colorOverride && snapB.colorOverride
          ? lerpColor(snapA.colorOverride, snapB.colorOverride, opacityEase)
          : snapB.colorOverride || snapA.colorOverride,
    };
  }

  return {
    activeStateIndex: activeSeg.fromStateIndex,
    nextStateIndex: activeSeg.toStateIndex,
    rawTransitionProgress: rawProgress,
    easedTransitionProgress: eased,
    bgGradientAngleOffset: lerp(
      fromState.bgGradientAngleOffset,
      toState.bgGradientAngleOffset,
      eased
    ),
    bgImageScaleMultiplier: lerp(
      fromState.bgImageScaleMultiplier || 1,
      toState.bgImageScaleMultiplier || 1,
      eased
    ),
    bgScrimOpacityOverride:
      fromState.bgScrimOpacityOverride !== undefined &&
      toState.bgScrimOpacityOverride !== undefined
        ? lerp(
            fromState.bgScrimOpacityOverride,
            toState.bgScrimOpacityOverride,
            rawProgress
          )
        : fromState.bgScrimOpacityOverride,
    layerSnapshots: interpolatedLayers,
    irisMaskProgress:
      transition.animationMode === 'iris-mask' ? eased : undefined,
  };
}
