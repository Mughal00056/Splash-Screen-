import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Film,
  Image as ImageIcon,
  Pause,
  Play,
  Repeat,
  RotateCcw,
} from 'lucide-react';
import { DEVICE_SPECS } from '../data/presets';
import { LayerStateSnapshot, SplashProject } from '../types/splash';
import { renderSplashFrame, subscribeToImageLoads } from '../utils/canvasRenderer';
import {
  buildTimelineSegments,
  DEFAULT_LAYER_SNAPSHOT,
  evaluateProjectAtTime,
} from '../utils/flowEngine';

interface DevicePreviewStageProps {
  project: SplashProject;
  currentTimeMs: number;
  isPlaying: boolean;
  isLooping: boolean;
  playbackSpeed: number;
  selectedStateIndex: number;
  selectedLayerId: string;
  onScrubTime: (timeMs: number) => void;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onChangeSpeed: (speed: number) => void;
  onSelectState: (stateIdx: number, jumpTimeMs: number) => void;
  onUpdateLayerSnapshot: (
    stateIndex: number,
    layerId: string,
    updates: Partial<LayerStateSnapshot>
  ) => void;
  onQuickExport: (format: 'mp4' | 'png' | 'jpg') => void;
  onOpenLivePreview: () => void;
  isExporting: boolean;
}

export const DevicePreviewStage: React.FC<DevicePreviewStageProps> = ({
  project,
  currentTimeMs,
  isPlaying,
  isLooping,
  playbackSpeed,
  selectedStateIndex,
  selectedLayerId,
  onScrubTime,
  onTogglePlay,
  onToggleLoop,
  onChangeSpeed,
  onSelectState,
  onUpdateLayerSnapshot,
  onQuickExport,
  onOpenLivePreview,
  isExporting,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const device = DEVICE_SPECS[project.devicePreset] || DEVICE_SPECS['iphone-16-pro'];
  const { segments, totalDurationMs } = buildTimelineSegments(project.flowStates);
  const frameEval = evaluateProjectAtTime(project, currentTimeMs);

  // Render at 2x retina density for ultra-crisp studio preview
  const renderWidth = device.width * 2;
  const renderHeight = device.height * 2;

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderSplashFrame(ctx, project, currentTimeMs, renderWidth, renderHeight, {
        includeSystemBars: project.systemBarTheme !== 'hidden',
        includeGuides: true,
      });
    };

    draw();
    const unsub = subscribeToImageLoads(draw);
    return unsub;
  }, [project, currentTimeMs, renderWidth, renderHeight]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!selectedLayerId) return;
    const stateNode =
      project.flowStates[selectedStateIndex] || project.flowStates[0];
    if (!stateNode) return;

    const snap: LayerStateSnapshot = {
      ...DEFAULT_LAYER_SNAPSHOT,
      ...(stateNode.layerSnapshots[selectedLayerId] || {}),
    };

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingLayer(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialX: snap.x,
      initialY: snap.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingLayer || !dragStartRef.current || !selectedLayerId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = device.width / rect.width;
    const scaleY = device.height / rect.height;

    const dx = (e.clientX - dragStartRef.current.clientX) * scaleX;
    const dy = (e.clientY - dragStartRef.current.clientY) * scaleY;

    onUpdateLayerSnapshot(selectedStateIndex, selectedLayerId, {
      x: Math.round(dragStartRef.current.initialX + dx),
      y: Math.round(dragStartRef.current.initialY + dy),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingLayer) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDraggingLayer(false);
      dragStartRef.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 bg-[#090D16] relative overflow-hidden">
      {/* Top Stage Header Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-200">{device.name}</span>
          <span aria-hidden="true">·</span>
          <span>{device.osVersion}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-slate-300">
            State {frameEval.activeStateIndex + 1}/{project.flowStates.length}
          </span>
        </div>

        {/* Instant 1-Click Preview & Export Triggers */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenLivePreview}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-md transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Live Preview (iOS + Android)
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => onQuickExport('png')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            PNG
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => onQuickExport('jpg')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            JPG
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => onQuickExport('mp4')}
            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Film className="w-3.5 h-3.5" />
            Export MP4
          </button>
        </div>
      </div>

      {/* Central Hardware Device Bezel Viewport */}
      <div className="flex-1 flex items-center justify-center py-3 w-full min-h-0">
        <div className="relative flex items-center justify-center">
          {/* Outer Titanium Hardware Chassis */}
          <div
            className="relative p-[10px] bg-[#161F30] border-2 border-slate-700/90 shadow-2xl transition-all"
            style={{
              borderRadius: `${Math.round(device.cornerRadius * 0.72) + 10}px`,
            }}
          >
            <canvas
              ref={canvasRef}
              width={renderWidth}
              height={renderHeight}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              title="Drag on canvas to reposition selected layer in current Flow State"
              className="block bg-[#050811] cursor-grab active:cursor-grabbing"
              style={{
                width: `${Math.round(device.width * 0.68)}px`,
                height: `${Math.round(device.height * 0.68)}px`,
                borderRadius: `${Math.round(device.cornerRadius * 0.68)}px`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Precision Timeline & State Scrubber */}
      <div className="w-full bg-[#0C1220] border border-slate-800 rounded-xl p-3 space-y-2.5">
        {/* State Jump Markers */}
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5">
            {project.flowStates.map((st, idx) => {
              const seg = segments[idx] || segments[segments.length - 1];
              const startMs = seg ? seg.startTimeMs : 0;
              const isSelected = selectedStateIndex === idx;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onSelectState(idx, startMs)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-[#070B14] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {st.name}
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline whitespace-nowrap">
            Drag canvas to move layer in active state
          </span>
        </div>

        {/* Playback Controls + Scrubber Slider */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onTogglePlay}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              title={isPlaying ? 'Pause Flow' : 'Play Flow'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onScrubTime(0)}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#070B14] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              title="Restart (0.00s)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleLoop}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                isLooping
                  ? 'bg-blue-950/60 border-blue-500/80 text-blue-300'
                  : 'bg-[#070B14] border-slate-800 text-slate-500'
              }`}
              title="Toggle Loop"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrubber Track */}
          <div className="flex-1 flex items-center gap-2.5">
            <input
              type="range"
              min={0}
              max={totalDurationMs}
              step={10}
              value={Math.min(totalDurationMs, currentTimeMs)}
              onChange={(e) => onScrubTime(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <span className="text-xs font-mono tabular-nums text-slate-200 shrink-0 w-24 text-right">
              {(currentTimeMs / 1000).toFixed(2)}s /{' '}
              {(totalDurationMs / 1000).toFixed(2)}s
            </span>
          </div>

          {/* Speed Selector */}
          <select
            value={playbackSpeed}
            onChange={(e) => onChangeSpeed(Number(e.target.value))}
            className="px-2 py-1 text-xs font-mono tabular-nums bg-[#070B14] border border-slate-800 rounded-md text-slate-300"
            title="Playback Speed"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={1.5}>1.5x</option>
          </select>
        </div>
      </div>
    </div>
  );
};
