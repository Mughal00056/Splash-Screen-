import React, { useEffect, useRef } from 'react';
import {
  ArrowRight,
  Copy,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { DEVICE_SPECS, EASING_PRESETS } from '../data/presets';
import {
  EasingPresetId,
  FlowAnimationMode,
  FlowStateNode,
  FlowTransition,
  SplashProject,
} from '../types/splash';
import { renderSplashFrame, subscribeToImageLoads } from '../utils/canvasRenderer';
import {
  buildTimelineSegments,
  evaluateCubicBezier,
  evaluateSpring,
} from '../utils/flowEngine';

interface FigmaFlowCanvasProps {
  project: SplashProject;
  selectedStateIndex: number;
  selectedTransitionIndex: number;
  onSelectState: (index: number, jumpTimeMs: number) => void;
  onSelectTransition: (index: number) => void;
  onUpdateTransition: (stateIndex: number, updates: Partial<FlowTransition>) => void;
  onUpdateStateMeta: (stateIndex: number, updates: Partial<FlowStateNode>) => void;
  onAddFlowState: () => void;
  onDeleteFlowState: (index: number) => void;
  onApplyChoreographyPreset: (
    preset: 'elastic-pop' | 'spin-morph' | 'cinematic-fade' | 'heartbeat-pulse'
  ) => void;
}

const MiniStateCanvas: React.FC<{
  project: SplashProject;
  timeMs: number;
}> = ({ project, timeMs }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const device = DEVICE_SPECS[project.devicePreset] || DEVICE_SPECS['iphone-16-pro'];

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderSplashFrame(ctx, project, timeMs, canvas.width, canvas.height, {
        includeSystemBars: false,
        includeGuides: false,
      });
    };
    render();
    const unsub = subscribeToImageLoads(render);
    return unsub;
  }, [project, timeMs]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(device.width * 0.35)}
      height={Math.round(device.height * 0.35)}
      className="w-[104px] h-[224px] rounded-[18px] border border-slate-700/80 bg-[#070A12] block mx-auto"
    />
  );
};

export const FigmaFlowCanvas: React.FC<FigmaFlowCanvasProps> = ({
  project,
  selectedStateIndex,
  selectedTransitionIndex,
  onSelectState,
  onSelectTransition,
  onUpdateTransition,
  onUpdateStateMeta,
  onAddFlowState,
  onDeleteFlowState,
  onApplyChoreographyPreset,
}) => {
  const { segments } = buildTimelineSegments(project.flowStates);
  const activeTransitionState =
    project.flowStates[
      Math.min(selectedTransitionIndex, Math.max(0, project.flowStates.length - 2))
    ] || project.flowStates[0];
  const activeTransition = activeTransitionState?.transitionToNext;

  // Compute SVG curve path for the active transition
  const buildCurveSvgPoints = () => {
    if (!activeTransition) return '';
    const pts: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const p = i / 40;
      let yVal = p;
      if (
        activeTransition.animationMode === 'spring-physics' ||
        activeTransition.easingPreset === 'spring-gentle' ||
        activeTransition.easingPreset === 'spring-bouncy'
      ) {
        yVal = evaluateSpring(
          p,
          activeTransition.spring.stiffness,
          activeTransition.spring.damping,
          activeTransition.spring.mass
        );
      } else if (activeTransition.easingPreset !== 'linear') {
        const [x1, y1, x2, y2] = activeTransition.bezier;
        yVal = evaluateCubicBezier(p, x1, y1, x2, y2);
      }
      const sx = 16 + p * 188;
      const sy = 136 - yVal * 96;
      pts.push(`${i === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
    }
    return pts.join(' ');
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Bar: Choreography Presets + Add State */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Figma Smart Animate Flow Graph
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select any keyframe artboard state to position layers, or click a transition connector to tune spring &amp; bezier physics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">Auto-Choreography:</span>
          <button
            type="button"
            onClick={() => onApplyChoreographyPreset('elastic-pop')}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            Elastic Spring Pop
          </button>
          <button
            type="button"
            onClick={() => onApplyChoreographyPreset('spin-morph')}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            360° Orbital Morph
          </button>
          <button
            type="button"
            onClick={() => onApplyChoreographyPreset('heartbeat-pulse')}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            Harmonic Pulse
          </button>
          <button
            type="button"
            onClick={() => onApplyChoreographyPreset('cinematic-fade')}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            Cinematic Unveil
          </button>
          <button
            type="button"
            onClick={onAddFlowState}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Flow State
          </button>
        </div>
      </div>

      {/* Horizontal Node Graph (Figma Prototyping Artboards + Noodle Connectors) */}
      <div className="overflow-x-auto pb-3">
        <div className="flex items-center gap-2 min-w-max py-2 px-1">
          {project.flowStates.map((stateNode, idx) => {
            const seg = segments[idx] || segments[segments.length - 1];
            const stateStartTime = seg ? seg.startTimeMs : 0;
            const isSelectedState = selectedStateIndex === idx;
            const isSelectedTrans = selectedTransitionIndex === idx;
            const hasNext = idx < project.flowStates.length - 1;

            return (
              <React.Fragment key={stateNode.id}>
                {/* State Artboard Node */}
                <div
                  onClick={() => onSelectState(idx, stateStartTime)}
                  className={`group relative w-[164px] rounded-xl p-3 cursor-pointer transition-all border ${
                    isSelectedState
                      ? 'bg-slate-900 border-blue-500 ring-1 ring-blue-500/40'
                      : 'bg-[#0C1220] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-semibold text-slate-100 truncate">
                      {stateNode.name}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                      {(stateStartTime / 1000).toFixed(2)}s
                    </span>
                  </div>

                  {/* Miniature Live Canvas Artboard */}
                  <div className="relative">
                    <MiniStateCanvas project={project} timeMs={stateStartTime} />
                    {/* Blue Figma Prototype Outgoing Port Dot */}
                    {hasNext && (
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 border-[#090D16] absolute -right-4 top-1/2 -translate-y-1/2 z-10 ${
                          isSelectedTrans ? 'bg-amber-400' : 'bg-blue-500'
                        }`}
                      />
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">{stateNode.subtitle}</span>
                    {project.flowStates.length > 2 && (
                      <button
                        type="button"
                        title="Delete State"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFlowState(idx);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Figma Prototype Transition Connector Noodle */}
                {hasNext && (
                  <div className="flex flex-col items-center justify-center px-1">
                    <button
                      type="button"
                      onClick={() => onSelectTransition(idx)}
                      className={`group flex flex-col items-center px-3 py-2 rounded-lg border transition-all ${
                        isSelectedTrans
                          ? 'bg-blue-950/50 border-blue-400 text-blue-200'
                          : 'bg-[#0C1220] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>
                          {stateNode.transitionToNext.animationMode === 'spring-physics'
                            ? 'Spring Physics'
                            : stateNode.transitionToNext.animationMode === 'smart-animate'
                            ? 'Smart Animate'
                            : stateNode.transitionToNext.animationMode === 'zoom-morph'
                            ? 'Zoom Morph'
                            : stateNode.transitionToNext.animationMode === 'slide-up'
                            ? 'Slide Up'
                            : 'Dissolve'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                        {stateNode.transitionToNext.durationMs}ms ·{' '}
                        {stateNode.transitionToNext.delayMs}ms hold
                      </div>
                    </button>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Transition Curve & Physics Inspector for Selected Noodle */}
      {activeTransition && project.flowStates.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 border-t border-slate-800/80">
          {/* Left 4 cols: Live SVG Bezier / Spring Oscilloscope Graph */}
          <div className="lg:col-span-4 flex flex-col justify-between bg-[#0C1220] border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200">
                Transition Velocity Curve ({activeTransitionState.name} → Next)
              </span>
              <span className="text-[11px] font-mono tabular-nums text-blue-400">
                {activeTransition.durationMs}ms
              </span>
            </div>

            <svg
              viewBox="0 0 220 160"
              className="w-full h-36 bg-[#070B14] rounded-lg border border-slate-800/90"
            >
              {/* Reference Grid */}
              <line
                x1="16"
                y1="40"
                x2="204"
                y2="40"
                stroke="#1E293B"
                strokeDasharray="3 3"
              />
              <line
                x1="16"
                y1="88"
                x2="204"
                y2="88"
                stroke="#1E293B"
                strokeDasharray="3 3"
              />
              <line
                x1="16"
                y1="136"
                x2="204"
                y2="136"
                stroke="#1E293B"
                strokeDasharray="3 3"
              />
              {/* Diagonal linear reference */}
              <line
                x1="16"
                y1="136"
                x2="204"
                y2="40"
                stroke="#334155"
                strokeWidth="1"
              />
              {/* Active Motion Curve */}
              <path
                d={buildCurveSvgPoints()}
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Start & End Anchors */}
              <circle cx="16" cy="136" r="4" fill="#F8FAFC" />
              <circle cx="204" cy="40" r="4" fill="#F59E0B" />
            </svg>

            <div className="mt-2 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
              <span>
                cubic-bezier({activeTransition.bezier.map((n) => n.toFixed(2)).join(', ')})
              </span>
              <span>
                S:{activeTransition.spring.stiffness} D:{activeTransition.spring.damping}
              </span>
            </div>
          </div>

          {/* Right 8 cols: Transition Controls & State Metadata */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0C1220] border border-slate-800 rounded-xl p-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Selected State Name &amp; Subtitle
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={project.flowStates[selectedStateIndex]?.name || ''}
                    onChange={(e) =>
                      onUpdateStateMeta(selectedStateIndex, { name: e.target.value })
                    }
                    className="w-1/2 px-2.5 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
                    placeholder="State Name"
                  />
                  <input
                    type="text"
                    value={project.flowStates[selectedStateIndex]?.subtitle || ''}
                    onChange={(e) =>
                      onUpdateStateMeta(selectedStateIndex, { subtitle: e.target.value })
                    }
                    className="w-1/2 px-2.5 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-300 focus:outline-none focus:border-blue-500"
                    placeholder="Description"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Figma Animation Mode
                </label>
                <select
                  value={activeTransition.animationMode}
                  onChange={(e) =>
                    onUpdateTransition(selectedTransitionIndex, {
                      animationMode: e.target.value as FlowAnimationMode,
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="smart-animate">Smart Animate (Layer Interpolation)</option>
                  <option value="spring-physics">Spring Physics Solver (Harmonic)</option>
                  <option value="zoom-morph">Zoom Morph &amp; Depth Scale</option>
                  <option value="slide-up">Aerodynamic Slide Up</option>
                  <option value="dissolve">Cross-Dissolve Opacity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Easing Curve Preset
                </label>
                <select
                  value={activeTransition.easingPreset}
                  onChange={(e) => {
                    const presetId = e.target.value as EasingPresetId;
                    const meta = EASING_PRESETS[presetId];
                    if (meta) {
                      onUpdateTransition(selectedTransitionIndex, {
                        easingPreset: presetId,
                        bezier: [...meta.bezier] as [number, number, number, number],
                        spring: { ...meta.spring },
                      });
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {Object.values(EASING_PRESETS).map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.label} — {ep.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Transition Duration</span>
                    <span className="font-mono tabular-nums text-blue-400">
                      {activeTransition.durationMs}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min={150}
                    max={2500}
                    step={50}
                    value={activeTransition.durationMs}
                    onChange={(e) =>
                      onUpdateTransition(selectedTransitionIndex, {
                        durationMs: Number(e.target.value),
                      })
                    }
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">State Hold Delay</span>
                    <span className="font-mono tabular-nums text-amber-400">
                      {activeTransition.delayMs}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1500}
                    step={25}
                    value={activeTransition.delayMs}
                    onChange={(e) =>
                      onUpdateTransition(selectedTransitionIndex, {
                        delayMs: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>

              {/* Spring Stiffness & Damping Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Spring Stiffness</span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {activeTransition.spring.stiffness}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={600}
                    step={10}
                    value={activeTransition.spring.stiffness}
                    onChange={(e) =>
                      onUpdateTransition(selectedTransitionIndex, {
                        spring: {
                          ...activeTransition.spring,
                          stiffness: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Spring Damping</span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {activeTransition.spring.damping}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={50}
                    step={1}
                    value={activeTransition.spring.damping}
                    onChange={(e) =>
                      onUpdateTransition(selectedTransitionIndex, {
                        spring: {
                          ...activeTransition.spring,
                          damping: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              {/* Background Dynamic Shift per State */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">State BG Angle Shift</span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {project.flowStates[selectedStateIndex]?.bgGradientAngleOffset ?? 0}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={5}
                    value={
                      project.flowStates[selectedStateIndex]?.bgGradientAngleOffset ?? 0
                    }
                    onChange={(e) =>
                      onUpdateStateMeta(selectedStateIndex, {
                        bgGradientAngleOffset: Number(e.target.value),
                      })
                    }
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">State BG Image Zoom</span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {(
                        project.flowStates[selectedStateIndex]?.bgImageScaleMultiplier ?? 1
                      ).toFixed(2)}
                      x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.8}
                    max={1.5}
                    step={0.02}
                    value={
                      project.flowStates[selectedStateIndex]?.bgImageScaleMultiplier ?? 1
                    }
                    onChange={(e) =>
                      onUpdateStateMeta(selectedStateIndex, {
                        bgImageScaleMultiplier: Number(e.target.value),
                      })
                    }
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
