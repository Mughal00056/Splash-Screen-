import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Film,
  Image as ImageIcon,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { DEVICE_SPECS } from '../data/presets';
import { DevicePresetId, SplashProject } from '../types/splash';
import { renderSplashFrame, subscribeToImageLoads } from '../utils/canvasRenderer';
import { buildTimelineSegments } from '../utils/flowEngine';

interface LivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: SplashProject;
  onQuickExport: (format: 'mp4' | 'png' | 'jpg') => void;
  isExporting: boolean;
}

const PreviewDeviceCanvas: React.FC<{
  project: SplashProject;
  devicePresetOverride?: DevicePresetId;
  timeMs: number;
  scaleMultiplier?: number;
  showAppHomeAfterComplete?: boolean;
  isCompleted?: boolean;
  onReplay?: () => void;
}> = ({
  project,
  devicePresetOverride,
  timeMs,
  scaleMultiplier = 0.78,
  showAppHomeAfterComplete = false,
  isCompleted = false,
  onReplay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const presetId = devicePresetOverride || project.devicePreset;
  const device = DEVICE_SPECS[presetId] || DEVICE_SPECS['iphone-16-pro'];

  const renderW = device.width * 2;
  const renderH = device.height * 2;

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const effectiveProject: SplashProject = devicePresetOverride
        ? {
            ...project,
            devicePreset: devicePresetOverride,
            platform: device.platform,
          }
        : project;

      renderSplashFrame(ctx, effectiveProject, timeMs, renderW, renderH, {
        includeSystemBars: true,
        includeGuides: false,
      });
    };

    draw();
    const unsub = subscribeToImageLoads(draw);
    return unsub;
  }, [project, devicePresetOverride, device.platform, timeMs, renderW, renderH]);

  const titleLayer = project.layers.find((l) => l.type === 'text');
  const accentColor =
    project.layers.find((l) => l.type === 'loader')?.loaderColor ||
    project.layers.find((l) => l.type === 'image-logo')?.borderColor ||
    '#38BDF8';

  return (
    <div className="flex flex-col items-center">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
        <span className="font-semibold text-white">{device.name}</span>
        <span aria-hidden="true">·</span>
        <span className="text-slate-400">{device.osVersion}</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums text-slate-400">
          {device.exportWidth}×{device.exportHeight}
        </span>
      </div>

      {/* Hardware Titanium Frame */}
      <div
        className="relative p-[11px] bg-[#161F30] border-2 border-slate-700 shadow-2xl overflow-hidden"
        style={{
          borderRadius: `${Math.round(device.cornerRadius * scaleMultiplier) + 11}px`,
        }}
      >
        <div
          className="relative overflow-hidden bg-[#050811]"
          style={{
            width: `${Math.round(device.width * scaleMultiplier)}px`,
            height: `${Math.round(device.height * scaleMultiplier)}px`,
            borderRadius: `${Math.round(device.cornerRadius * scaleMultiplier)}px`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={renderW}
            height={renderH}
            className="w-full h-full block"
          />

          {/* Simulated App Home Screen Handoff when Splash Completes */}
          {showAppHomeAfterComplete && isCompleted && (
            <div className="absolute inset-0 bg-[#080C16]/95 backdrop-blur-md flex flex-col justify-between p-5 text-slate-100 animate-fadeIn">
              <div className="pt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      App Launch Hand-Off Complete
                    </span>
                    <h4 className="text-base font-bold text-white mt-0.5">
                      {titleLayer?.text || project.name}
                    </h4>
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-950"
                    style={{ backgroundColor: accentColor }}
                  >
                    ✓
                  </div>
                </div>

                {/* Simulated App Dashboard Skeleton */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Launch Cold-Boot Time</span>
                    <span className="font-mono tabular-nums text-emerald-400">
                      60 FPS Smooth
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: '100%', backgroundColor: accentColor }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">
                      Target OS
                    </span>
                    <span className="text-xs font-semibold text-slate-200 mt-0.5 block">
                      {device.osVersion}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">
                      Resolution
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-200 mt-0.5 block">
                      {device.exportWidth}×{device.exportHeight}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pb-4">
                <button
                  type="button"
                  onClick={onReplay}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-950 flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                  style={{ backgroundColor: accentColor }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Replay Cold Launch Splash
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({
  isOpen,
  onClose,
  project,
  onQuickExport,
  isExporting,
}) => {
  const [previewMode, setPreviewMode] = useState<
    'single-device' | 'dual-ios-android'
  >('dual-ios-android');
  const [simulateAppHandOff, setSimulateAppHandOff] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [timeMs, setTimeMs] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const { segments, totalDurationMs } = buildTimelineSegments(project.flowStates);

  useEffect(() => {
    if (isOpen) {
      setTimeMs(0);
      setIsCompleted(false);
      setIsPlaying(true);
    }
  }, [isOpen, project]);

  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    let rafId = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = now - last;
      last = now;

      setTimeMs((prev) => {
        const next = prev + dt;
        if (next >= totalDurationMs) {
          if (isLooping) {
            setIsCompleted(false);
            return next % totalDurationMs;
          } else {
            setIsPlaying(false);
            setIsCompleted(true);
            return totalDurationMs;
          }
        }
        return next;
      });

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, isPlaying, isLooping, totalDurationMs]);

  if (!isOpen) return null;

  const handleReplay = () => {
    setIsCompleted(false);
    setTimeMs(0);
    setIsPlaying(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#060911]/95 backdrop-blur-md flex flex-col">
      {/* Top Preview Simulator Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 bg-[#0C1220] border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-display text-base font-bold text-white">
            Live Launch Simulator
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="text-xs text-slate-300">{project.name}</span>
        </div>

        {/* Center View Mode Switcher: Single Device vs Dual iOS + Android Side-by-Side */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#070B14] rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewMode('dual-ios-android')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                previewMode === 'dual-ios-android'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              iOS 18 + Android 15 Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('single-device')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                previewMode === 'single-device'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single Device Focus
            </button>
          </div>

          <label className="hidden xl:flex items-center gap-2 text-xs text-slate-300 px-3 py-1.5 rounded-lg bg-[#070B14] border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={simulateAppHandOff}
              onChange={(e) => {
                setSimulateAppHandOff(e.target.checked);
                if (!e.target.checked) setIsLooping(true);
              }}
              className="accent-blue-500"
            />
            Simulate App Home Hand-Off
          </label>

          <label className="hidden sm:flex items-center gap-2 text-xs text-slate-300 px-3 py-1.5 rounded-lg bg-[#070B14] border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isLooping}
              onChange={(e) => {
                setIsLooping(e.target.checked);
                if (e.target.checked) {
                  setIsCompleted(false);
                  setIsPlaying(true);
                }
              }}
              className="accent-blue-500"
            />
            Continuous Loop
          </label>
        </div>

        {/* Right Export & Close Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={() => onQuickExport('png')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            PNG
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => onQuickExport('jpg')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            JPG
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => onQuickExport('mp4')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            <Film className="w-3.5 h-3.5" />
            Export MP4
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Exit Full Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Device Viewport Area */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
        {previewMode === 'dual-ios-android' ? (
          <div className="flex flex-wrap items-center justify-center gap-10">
            <PreviewDeviceCanvas
              project={project}
              devicePresetOverride="iphone-16-pro"
              timeMs={timeMs}
              scaleMultiplier={0.7}
              showAppHomeAfterComplete={simulateAppHandOff}
              isCompleted={isCompleted}
              onReplay={handleReplay}
            />
            <PreviewDeviceCanvas
              project={project}
              devicePresetOverride="pixel-9-pro"
              timeMs={timeMs}
              scaleMultiplier={0.67}
              showAppHomeAfterComplete={simulateAppHandOff}
              isCompleted={isCompleted}
              onReplay={handleReplay}
            />
          </div>
        ) : (
          <PreviewDeviceCanvas
            project={project}
            timeMs={timeMs}
            scaleMultiplier={0.76}
            showAppHomeAfterComplete={simulateAppHandOff}
            isCompleted={isCompleted}
            onReplay={handleReplay}
          />
        )}
      </div>

      {/* Bottom Interactive Playback & State Scrubber Bar */}
      <div className="px-6 py-4 bg-[#0C1220] border-t border-slate-800">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isCompleted || timeMs >= totalDurationMs) {
                  handleReplay();
                } else {
                  setIsPlaying(!isPlaying);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  {isCompleted ? 'Replay Launch' : 'Play'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReplay}
              className="px-3 py-2 rounded-lg bg-[#070B14] hover:bg-slate-800 text-xs font-medium text-slate-300 border border-slate-800 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Cold Boot (0.00s)
            </button>
          </div>

          {/* Timeline Scrubber */}
          <div className="flex-1 w-full flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={totalDurationMs}
              step={10}
              value={Math.min(totalDurationMs, timeMs)}
              onChange={(e) => {
                setIsPlaying(false);
                setIsCompleted(false);
                setTimeMs(Number(e.target.value));
              }}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <span className="text-xs font-mono tabular-nums text-slate-200 w-28 text-right shrink-0">
              {(timeMs / 1000).toFixed(2)}s / {(totalDurationMs / 1000).toFixed(2)}s
            </span>
          </div>

          {/* State Quick-Triggers */}
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            {project.flowStates.map((st, idx) => {
              const seg = segments[idx] || segments[segments.length - 1];
              const startMs = seg ? seg.startTimeMs : 0;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setIsCompleted(false);
                    setTimeMs(startMs);
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium rounded bg-[#070B14] hover:bg-slate-800 text-slate-300 border border-slate-800 whitespace-nowrap"
                >
                  {st.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
