import React, { useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { DEVICE_SPECS } from '../data/presets';
import { SplashProject } from '../types/splash';
import {
  generateAndroidComposeCode,
  generateSwiftUICode,
} from '../utils/codeGenerator';
import { buildTimelineSegments } from '../utils/flowEngine';

interface ExportAndCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: SplashProject;
  currentTimeMs: number;
  isExporting: boolean;
  exportProgress: number;
  exportStageText: string;
  onExportMP4: (includeSystemBars: boolean) => void;
  onExportImage: (
    format: 'png' | 'jpg',
    timeMs: number,
    includeSystemBars: boolean
  ) => void;
}

export const ExportAndCodeModal: React.FC<ExportAndCodeModalProps> = ({
  isOpen,
  onClose,
  project,
  currentTimeMs,
  isExporting,
  exportProgress,
  exportStageText,
  onExportMP4,
  onExportImage,
}) => {
  const [includeSystemBars, setIncludeSystemBars] = useState(false);
  const [codeTab, setCodeTab] = useState<'android' | 'ios' | 'json'>('android');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const device = DEVICE_SPECS[project.devicePreset] || DEVICE_SPECS['iphone-16-pro'];
  const { segments, totalDurationMs } = buildTimelineSegments(project.flowStates);

  const codeString =
    codeTab === 'android'
      ? generateAndroidComposeCode(project)
      : codeTab === 'ios'
      ? generateSwiftUICode(project)
      : JSON.stringify(project, null, 2);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-[#0C1220] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Export Studio &amp; Native Code Handoff
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {project.name} · {device.name} ({device.exportWidth}×
              {device.exportHeight}px) · {(totalDurationMs / 1000).toFixed(2)}s Flow
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 6 cols: Real Media Export (MP4, PNG, JPG) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                1. Media Asset Export (MP4 · PNG · JPG)
              </h3>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSystemBars}
                  onChange={(e) => setIncludeSystemBars(e.target.checked)}
                  className="accent-blue-500"
                />
                Include Status Bar &amp; Cutout
              </label>
            </div>

            {/* MP4 Video Export Box */}
            <div className="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-blue-400" />
                    Full Animation Flow Video (.MP4)
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Renders all {project.flowStates.length} Figma Smart Animate states at 60 FPS ({(totalDurationMs / 1000).toFixed(2)}s total).
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-blue-400 shrink-0">
                  60 FPS · H.264
                </span>
              </div>

              {isExporting && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-mono tabular-nums">
                    <span className="text-slate-300">{exportStageText}</span>
                    <span className="text-blue-400">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-150"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={isExporting}
                onClick={() => onExportMP4(includeSystemBars)}
                className="w-full py-2.5 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Film className="w-4 h-4" />
                {isExporting
                  ? 'Encoding MP4 Video...'
                  : 'Render & Download MP4 Video'}
              </button>
            </div>

            {/* PNG & JPG High-Res Snapshot Export */}
            <div className="p-4 rounded-xl bg-[#070B14] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  High-Resolution Static Splash (PNG &amp; JPG)
                </h4>
                <span className="text-xs font-mono tabular-nums text-emerald-400">
                  {device.exportWidth}×{device.exportHeight}px
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Export the current timeline frame ({(currentTimeMs / 1000).toFixed(2)}s) or export individual Figma Flow State keyframes:
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() =>
                    onExportImage('png', currentTimeMs, includeSystemBars)
                  }
                  className="py-2 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PNG
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() =>
                    onExportImage('jpg', currentTimeMs, includeSystemBars)
                  }
                  className="py-2 px-3 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download JPG
                </button>
              </div>

              {/* Per-State Direct PNG Export Buttons */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="block text-[11px] text-slate-400 mb-2">
                  Export Specific Flow State Frame as PNG:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {project.flowStates.map((st, idx) => {
                    const seg = segments[idx] || segments[segments.length - 1];
                    const tMs = seg ? seg.startTimeMs : 0;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          onExportImage('png', tMs, includeSystemBars)
                        }
                        className="px-2.5 py-1.5 text-[11px] font-medium bg-[#0C1220] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded flex items-center justify-between"
                      >
                        <span className="truncate">{st.name}</span>
                        <span className="font-mono text-[10px] text-emerald-400 ml-1">
                          PNG
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right 6 cols: Native Android & iOS Code Inspector */}
          <div className="lg:col-span-6 flex flex-col h-full space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-amber-400" />
                2. Native Android &amp; iOS Code
              </h3>

              <div className="flex items-center gap-1 bg-[#070B14] p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCodeTab('android')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    codeTab === 'android'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Kotlin Compose
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab('ios')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    codeTab === 'ios'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SwiftUI
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab('json')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    codeTab === 'json'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Flow JSON
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-[#070B14] border border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={handleCopyCode}
                className="absolute top-3 right-3 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md flex items-center gap-1.5 z-10"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
              <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-auto h-[340px] leading-relaxed">
                <code>{codeString}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
