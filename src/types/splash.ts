export type PlatformType = 'ios' | 'android';

export type DevicePresetId =
  | 'iphone-16-pro'
  | 'iphone-se'
  | 'pixel-9-pro'
  | 'galaxy-s24-ultra';

export interface DeviceSpec {
  id: DevicePresetId;
  name: string;
  platform: PlatformType;
  osVersion: string;
  width: number;        // Logical canvas width in px (base 390–412)
  height: number;       // Logical canvas height in px (base 844–915)
  exportWidth: number;  // High-res native export width (e.g., 1179 or 1080)
  exportHeight: number; // High-res native export height (e.g., 2556 or 2400)
  cornerRadius: number;
  cutoutType: 'dynamic-island' | 'punch-hole' | 'classic-bezel' | 'small-punch';
  safeAreaTop: number;
  safeAreaBottom: number;
}

export type BackgroundMode =
  | 'solid'
  | 'linear-gradient'
  | 'radial-gradient'
  | 'mesh-aurora'
  | 'image-url';

export interface MeshOrb {
  id: string;
  color: string;
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  radiusPx: number;
  opacity: number;
}

export interface SplashBackground {
  mode: BackgroundMode;
  solidColor: string;
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
  gradientAngle: number;
  useThreeStopGradient: boolean;
  meshOrbs: MeshOrb[];
  imageUrl: string;
  imageFit: 'cover' | 'contain' | 'fill';
  imageOpacity: number;
  imageBlur: number;
  imageScale: number;
  scrimColor: string;
  scrimOpacity: number;
  patternOverlay: 'none' | 'subtle-grid' | 'radial-dots' | 'architectural-lines';
  patternOpacity: number;
}

export type LayerType =
  | 'image-logo'
  | 'vector-emblem'
  | 'text'
  | 'loader'
  | 'shape-ring';

export type MaskShape = 'squircle' | 'circle' | 'rounded' | 'hexagon' | 'none';

export type VectorEmblemId =
  | 'kinetix-prism'
  | 'orbital-rings'
  | 'fintech-shield'
  | 'pulse-wave'
  | 'neural-nexus'
  | 'velocity-bolt'
  | 'luxury-monogram'
  | 'spatial-cube';

export type LoaderStyle =
  | 'progress-bar'
  | 'spinner-ring'
  | 'pulse-dots'
  | 'shimmer-track'
  | 'minimal-percent';

export interface SplashLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked?: boolean;

  // Base dimensions (centered at 0,0 before state offset)
  width: number;
  height: number;

  // For 'image-logo'
  imageUrl?: string;
  maskShape?: MaskShape;
  imageFit?: 'cover' | 'contain';
  containerBgColor?: string;
  containerBgOpacity?: number;
  borderColor?: string;
  borderWidth?: number;

  // For 'vector-emblem'
  emblemId?: VectorEmblemId;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  strokeWidth?: number;

  // For 'text'
  text?: string;
  fontFamily?: 'Syne' | 'Plus Jakarta Sans' | 'JetBrains Mono' | 'Instrument Serif';
  fontSize?: number;
  fontWeight?: 400 | 500 | 600 | 700 | 800;
  letterSpacing?: number;
  textColor?: string;
  useGradientText?: boolean;
  textGradientEnd?: string;
  textAlign?: 'center' | 'left' | 'right';

  // For 'loader'
  loaderStyle?: LoaderStyle;
  loaderColor?: string;
  loaderTrackColor?: string;
  loaderThickness?: number;

  // For 'shape-ring'
  shapeKind?: 'circle-ring' | 'rounded-plate' | 'glow-orb' | 'diamond-frame';
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  shapeStrokeWidth?: number;

  // Shared styling
  glowColor?: string;
  glowBlur?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetY?: number;
}

/**
 * Per-layer keyframe properties inside a Figma Flow State
 */
export interface LayerStateSnapshot {
  x: number;               // Offset from screen center X (px)
  y: number;               // Offset from screen center Y (px)
  scaleX: number;          // 0 to 5
  scaleY: number;          // 0 to 5
  rotation: number;        // Degrees (-360 to 360)
  opacity: number;         // 0 to 1
  blur: number;            // 0 to 40 px
  borderRadius: number;    // 0 to 150 px
  colorOverride?: string;  // Optional hex override for smooth color morphing
  glowScale?: number;      // Multiplier on glow radius (0 to 3)
  loaderProgress?: number; // 0 to 100 for loader layers
}

export type FlowAnimationMode =
  | 'smart-animate'
  | 'spring-physics'
  | 'dissolve'
  | 'slide-up'
  | 'zoom-morph'
  | 'iris-mask';

export type EasingPresetId =
  | 'figma-smart-ease'
  | 'expo-out'
  | 'cubic-in-out'
  | 'back-overshoot'
  | 'spring-gentle'
  | 'spring-bouncy'
  | 'linear';

export interface FlowTransition {
  animationMode: FlowAnimationMode;
  easingPreset: EasingPresetId;
  bezier: [number, number, number, number]; // [x1, y1, x2, y2]
  spring: {
    stiffness: number;
    damping: number;
    mass: number;
  };
  durationMs: number; // Transition duration to next state
  delayMs: number;    // Hold duration on current state before moving
}

/**
 * A single state node in the Figma-style Smart Animate Flow Graph
 */
export interface FlowStateNode {
  id: string;
  name: string;
  subtitle: string;
  // Background overrides in this state for dynamic background animations
  bgGradientAngleOffset: number;
  bgImageScaleMultiplier: number;
  bgScrimOpacityOverride?: number;
  bgPrimaryColorOverride?: string;
  // Per-layer keyframe snapshot keyed by layer.id
  layerSnapshots: Record<string, LayerStateSnapshot>;
  // Transition from THIS state to the NEXT state in the flow
  transitionToNext: FlowTransition;
}

export interface SplashProject {
  id: string;
  name: string;
  category: string;
  description: string;
  platform: PlatformType;
  devicePreset: DevicePresetId;
  systemBarTheme: 'light' | 'dark' | 'hidden';
  showSafeArea: boolean;
  showAndroid12Mask: boolean;
  showCenterGrid: boolean;
  background: SplashBackground;
  layers: SplashLayer[];
  flowStates: FlowStateNode[];
}
