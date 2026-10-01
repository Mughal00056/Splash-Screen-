import React, { useEffect, useRef, useState } from 'react';
import { DevicePreviewStage } from './components/DevicePreviewStage';
import { ExportAndCodeModal } from './components/ExportAndCodeModal';
import { FigmaFlowCanvas } from './components/FigmaFlowCanvas';
import { PropertyInspector } from './components/PropertyInspector';
import { TemplateSidebar } from './components/TemplateSidebar';
import {
  COLOR_PALETTE_SWATCHES,
  PREMADE_TEMPLATES,
  STUDIO_IMAGE_PRESETS,
} from './data/presets';
import {
  DevicePresetId,
  FlowStateNode,
  FlowTransition,
  LayerStateSnapshot,
  PlatformType,
  SplashBackground,
  SplashLayer,
  SplashProject,
} from './types/splash';
import {
  exportSplashImageFile,
  exportSplashVideoMP4,
} from './utils/canvasRenderer';
import {
  buildTimelineSegments,
  DEFAULT_LAYER_SNAPSHOT,
} from './utils/flowEngine';

function cloneProject(proj: SplashProject): SplashProject {
  return JSON.parse(JSON.stringify(proj));
}

export default function App() {
  // Pre-loaded flagship splash screen on startup
  const [project, setProject] = useState<SplashProject>(() =>
    cloneProject(PREMADE_TEMPLATES[0])
  );

  const [selectedStateIndex, setSelectedStateIndex] = useState<number>(1);
  const [selectedTransitionIndex, setSelectedTransitionIndex] = useState<number>(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string>(
    () => PREMADE_TEMPLATES[0].layers[1]?.id || PREMADE_TEMPLATES[0].layers[0].id
  );

  // Playback state
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Active workspace view mode
  const [activeNavSection, setActiveNavSection] = useState<
    'workspace' | 'flow-focus'
  >('workspace');

  // Export state
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStageText, setExportStageText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const flowSectionRef = useRef<HTMLDivElement | null>(null);

  const showNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // 60 FPS Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    let lastTimestamp = performance.now();
    const { totalDurationMs } = buildTimelineSegments(project.flowStates);

    const tick = (now: number) => {
      const dt = (now - lastTimestamp) * playbackSpeed;
      lastTimestamp = now;

      setCurrentTimeMs((prev) => {
        const next = prev + dt;
        if (next >= totalDurationMs) {
          if (isLooping) {
            return next % totalDurationMs;
          } else {
            setIsPlaying(false);
            return totalDurationMs;
          }
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isLooping, playbackSpeed, project.flowStates]);

  // Handlers for Templates & Device
  const handleSelectTemplate = (tpl: SplashProject) => {
    const fresh = cloneProject(tpl);
    setProject(fresh);
    const logoLayer =
      fresh.layers.find(
        (l) => l.type === 'image-logo' || l.type === 'vector-emblem'
      ) || fresh.layers[0];
    if (logoLayer) setSelectedLayerId(logoLayer.id);
    setSelectedStateIndex(Math.min(1, fresh.flowStates.length - 1));
    setSelectedTransitionIndex(0);
    setCurrentTimeMs(0);
    setIsPlaying(true);
    showNotice(`Loaded template: ${fresh.name}`);
  };

  const handleChangeDevice = (presetId: DevicePresetId, platform: PlatformType) => {
    setProject((prev) => ({
      ...prev,
      devicePreset: presetId,
      platform,
    }));
  };

  const handleUpdateProjectFlags = (updates: Partial<SplashProject>) => {
    setProject((prev) => ({ ...prev, ...updates }));
  };

  // Handlers for Layers & Keyframes
  const handleUpdateLayer = (layerId: string, updates: Partial<SplashLayer>) => {
    setProject((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l)),
    }));
  };

  const handleUpdateLayerSnapshot = (
    stateIndex: number,
    layerId: string,
    updates: Partial<LayerStateSnapshot>
  ) => {
    setProject((prev) => {
      const nextStates = prev.flowStates.map((st, idx) => {
        if (idx !== stateIndex) return st;
        const existingSnap: LayerStateSnapshot = {
          ...DEFAULT_LAYER_SNAPSHOT,
          ...(st.layerSnapshots[layerId] || {}),
        };
        return {
          ...st,
          layerSnapshots: {
            ...st.layerSnapshots,
            [layerId]: {
              ...existingSnap,
              ...updates,
            },
          },
        };
      });
      return { ...prev, flowStates: nextStates };
    });
  };

  const handleUpdateBackground = (updates: Partial<SplashBackground>) => {
    setProject((prev) => ({
      ...prev,
      background: {
        ...prev.background,
        ...updates,
      },
    }));
  };

  const handleApplyColorSwatch = (
    swatch: (typeof COLOR_PALETTE_SWATCHES)[0]
  ) => {
    setProject((prev) => ({
      ...prev,
      background: {
        ...prev.background,
        solidColor: swatch.bgStart,
        gradientStart: swatch.bgStart,
        gradientMid: swatch.bgMid,
        gradientEnd: swatch.bgEnd,
      },
      layers: prev.layers.map((l) => {
        if (l.type === 'text') {
          return {
            ...l,
            textColor: swatch.text,
            textGradientEnd: swatch.accent,
          };
        }
        if (l.type === 'loader') {
          return {
            ...l,
            loaderColor: swatch.accent,
          };
        }
        if (l.type === 'shape-ring') {
          return {
            ...l,
            strokeColor: swatch.accent,
            fillColor: swatch.accent,
            glowColor: swatch.accent,
          };
        }
        if (l.type === 'image-logo') {
          return {
            ...l,
            borderColor: swatch.accent,
            glowColor: swatch.accent,
          };
        }
        if (l.type === 'vector-emblem') {
          return {
            ...l,
            primaryColor: swatch.accent,
            accentColor: swatch.text,
          };
        }
        return l;
      }),
    }));
    showNotice(`Applied ${swatch.name} color system`);
  };

  const handleAddLayer = (type: SplashLayer['type']) => {
    const newId = `layer-${Date.now()}`;
    let newLayer: SplashLayer;

    if (type === 'image-logo') {
      newLayer = {
        id: newId,
        name: 'Custom Logo URL',
        type: 'image-logo',
        visible: true,
        width: 104,
        height: 104,
        imageUrl: STUDIO_IMAGE_PRESETS.logos[2].url,
        maskShape: 'squircle',
        imageFit: 'cover',
        containerBgColor: '#0F172A',
        containerBgOpacity: 1,
        borderColor: '#38BDF8',
        borderWidth: 1.5,
        glowColor: '#38BDF8',
        glowBlur: 24,
      };
    } else if (type === 'text') {
      newLayer = {
        id: newId,
        name: 'Custom Headline',
        type: 'text',
        visible: true,
        width: 300,
        height: 36,
        text: 'NEW LAUNCH EDITION',
        fontFamily: 'Syne',
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: 2,
        textColor: '#F8FAFC',
        textAlign: 'center',
      };
    } else {
      newLayer = {
        id: newId,
        name: 'Expanding Halo Ring',
        type: 'shape-ring',
        visible: true,
        width: 180,
        height: 180,
        shapeKind: 'circle-ring',
        fillColor: '#38BDF8',
        fillOpacity: 0.05,
        strokeColor: '#38BDF8',
        shapeStrokeWidth: 1.5,
        glowColor: '#38BDF8',
        glowBlur: 20,
      };
    }

    setProject((prev) => {
      const nextStates = prev.flowStates.map((st, idx) => ({
        ...st,
        layerSnapshots: {
          ...st.layerSnapshots,
          [newId]: {
            x: 0,
            y: type === 'text' ? 145 : 0,
            scaleX: idx === 0 ? 0.5 : 1,
            scaleY: idx === 0 ? 0.5 : 1,
            rotation: 0,
            opacity: idx === 0 ? 0 : 1,
            blur: idx === 0 ? 6 : 0,
            borderRadius: 24,
            glowScale: 1,
            loaderProgress: 100,
          },
        },
      }));

      return {
        ...prev,
        layers: [...prev.layers, newLayer],
        flowStates: nextStates,
      };
    });
    setSelectedLayerId(newId);
    showNotice(`Added ${newLayer.name} across all Flow States`);
  };

  const handleDeleteLayer = (layerId: string) => {
    setProject((prev) => {
      const remaining = prev.layers.filter((l) => l.id !== layerId);
      if (remaining.length === 0) return prev;
      if (selectedLayerId === layerId) {
        setSelectedLayerId(remaining[0].id);
      }
      return {
        ...prev,
        layers: remaining,
      };
    });
  };

  // Handlers for Figma Flow States & Transitions
  const handleSelectState = (stateIdx: number, jumpTimeMs: number) => {
    setIsPlaying(false);
    setSelectedStateIndex(stateIdx);
    setSelectedTransitionIndex(
      Math.min(stateIdx, Math.max(0, project.flowStates.length - 2))
    );
    setCurrentTimeMs(jumpTimeMs);
  };

  const handleUpdateTransition = (
    stateIdx: number,
    updates: Partial<FlowTransition>
  ) => {
    setProject((prev) => ({
      ...prev,
      flowStates: prev.flowStates.map((st, idx) =>
        idx === stateIdx
          ? {
              ...st,
              transitionToNext: {
                ...st.transitionToNext,
                ...updates,
              },
            }
          : st
      ),
    }));
  };

  const handleUpdateStateMeta = (
    stateIdx: number,
    updates: Partial<FlowStateNode>
  ) => {
    setProject((prev) => ({
      ...prev,
      flowStates: prev.flowStates.map((st, idx) =>
        idx === stateIdx ? { ...st, ...updates } : st
      ),
    }));
  };

  const handleAddFlowState = () => {
    setProject((prev) => {
      const lastState = prev.flowStates[prev.flowStates.length - 1];
      const newIndex = prev.flowStates.length + 1;
      const clonedSnapshots: Record<string, LayerStateSnapshot> = JSON.parse(
        JSON.stringify(lastState.layerSnapshots)
      );

      // Give the newly added state a subtle zoom/glow evolution by default
      Object.keys(clonedSnapshots).forEach((layerId) => {
        clonedSnapshots[layerId].scaleX = Number(
          (clonedSnapshots[layerId].scaleX * 1.08).toFixed(2)
        );
        clonedSnapshots[layerId].scaleY = Number(
          (clonedSnapshots[layerId].scaleY * 1.08).toFixed(2)
        );
      });

      const newState: FlowStateNode = {
        id: `state-${Date.now()}`,
        name: `0${newIndex}. Motion Stage`,
        subtitle: 'Custom Smart Animate keyframe',
        bgGradientAngleOffset: (lastState.bgGradientAngleOffset || 0) + 30,
        bgImageScaleMultiplier: 1.05,
        layerSnapshots: clonedSnapshots,
        transitionToNext: { ...lastState.transitionToNext },
      };

      return {
        ...prev,
        flowStates: [...prev.flowStates, newState],
      };
    });
    showNotice('Added new Figma Flow State node');
  };

  const handleDeleteFlowState = (idx: number) => {
    setProject((prev) => {
      if (prev.flowStates.length <= 2) return prev;
      const next = prev.flowStates.filter((_, i) => i !== idx);
      return { ...prev, flowStates: next };
    });
    setSelectedStateIndex(0);
    setSelectedTransitionIndex(0);
  };

  // 1-Click Figma Choreography Generators
  const handleApplyChoreographyPreset = (
    preset: 'elastic-pop' | 'spin-morph' | 'cinematic-fade' | 'heartbeat-pulse'
  ) => {
    setProject((prev) => {
      const nextStates = prev.flowStates.map((st, idx) => {
        const isFirst = idx === 0;
        const isSecond = idx === 1;
        const updatedSnaps: Record<string, LayerStateSnapshot> = {};

        for (const layer of prev.layers) {
          const base = {
            ...DEFAULT_LAYER_SNAPSHOT,
            ...(st.layerSnapshots[layer.id] || {}),
          };

          if (preset === 'elastic-pop') {
            updatedSnaps[layer.id] = {
              ...base,
              scaleX: isFirst ? 0.2 : isSecond ? 1.12 : 1.0,
              scaleY: isFirst ? 0.2 : isSecond ? 1.12 : 1.0,
              rotation: isFirst ? -15 : 0,
              opacity: isFirst ? 0 : 1,
              blur: isFirst ? 12 : 0,
            };
          } else if (preset === 'spin-morph') {
            updatedSnaps[layer.id] = {
              ...base,
              scaleX: isFirst ? 0.35 : 1.0,
              scaleY: isFirst ? 0.35 : 1.0,
              rotation:
                layer.type === 'image-logo' ||
                layer.type === 'vector-emblem' ||
                layer.type === 'shape-ring'
                  ? isFirst
                    ? -180
                    : idx * 90
                  : 0,
              opacity: isFirst ? 0 : 1,
              blur: isFirst ? 8 : 0,
            };
          } else if (preset === 'heartbeat-pulse') {
            updatedSnaps[layer.id] = {
              ...base,
              scaleX: isFirst ? 0.6 : isSecond ? 1.22 : 1.0,
              scaleY: isFirst ? 0.6 : isSecond ? 1.22 : 1.0,
              opacity: isFirst ? 0.1 : 1,
              glowScale: isSecond ? 1.8 : 1.0,
            };
          } else {
            // cinematic-fade
            updatedSnaps[layer.id] = {
              ...base,
              y: isFirst ? base.y + 28 : base.y,
              scaleX: isFirst ? 0.94 : 1.0,
              scaleY: isFirst ? 0.94 : 1.0,
              opacity: isFirst ? 0 : 1,
              blur: isFirst ? 16 : 0,
            };
          }
        }

        return {
          ...st,
          layerSnapshots: updatedSnaps,
          transitionToNext: {
            ...st.transitionToNext,
            animationMode:
              preset === 'elastic-pop' || preset === 'heartbeat-pulse'
                ? 'spring-physics'
                : 'smart-animate',
            easingPreset:
              preset === 'elastic-pop'
                ? 'spring-bouncy'
                : preset === 'cinematic-fade'
                ? 'figma-smart-ease'
                : 'back-overshoot',
          },
        };
      });

      return { ...prev, flowStates: nextStates };
    });
    setCurrentTimeMs(0);
    setIsPlaying(true);
    showNotice(`Applied choreography preset: ${preset}`);
  };

  // Real Export Handlers (MP4, PNG, JPG)
  const handleTriggerImageExport = async (
    format: 'png' | 'jpg',
    timeMs: number,
    includeBars: boolean
  ) => {
    try {
      setIsExporting(true);
      setExportStageText(`Rendering native ${format.toUpperCase()}...`);
      await exportSplashImageFile(project, timeMs, format, includeBars);
      showNotice(`Downloaded high-resolution ${format.toUpperCase()} splash screen`);
    } catch (err) {
      console.error(err);
      showNotice(`Export failed: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTriggerMP4Export = async (includeBars: boolean) => {
    try {
      setIsPlaying(false);
      setIsExporting(true);
      setExportProgress(0);
      setExportStageText('Initializing 60 FPS MP4 Encoder...');
      await exportSplashVideoMP4(project, includeBars, (pct, stage) => {
        setExportProgress(pct);
        setExportStageText(stage);
      });
      showNotice('Downloaded 60 FPS MP4 splash screen animation');
    } catch (err) {
      console.error(err);
      showNotice(`MP4 Export failed: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickExport = (format: 'mp4' | 'png' | 'jpg') => {
    if (format === 'mp4') {
      setIsExportModalOpen(true);
      handleTriggerMP4Export(false);
    } else {
      handleTriggerImageExport(format, currentTimeMs, false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-slate-100">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800/90 bg-[#0C1220] shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setActiveNavSection('workspace');
          }}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap"
        >
          Kinetix Splash
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => setActiveNavSection('workspace')}
            className={`hover:text-white transition-colors underline-offset-4 hover:underline whitespace-nowrap ${
              activeNavSection === 'workspace' ? 'text-white underline' : ''
            }`}
          >
            Studio Canvas
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveNavSection('flow-focus');
              flowSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`hover:text-white transition-colors underline-offset-4 hover:underline whitespace-nowrap ${
              activeNavSection === 'flow-focus' ? 'text-white underline' : ''
            }`}
          >
            Figma Flow Graph
          </button>
          <button
            type="button"
            onClick={() => {
              const imgLayer = project.layers.find(
                (l) => l.type === 'image-logo'
              );
              if (imgLayer) setSelectedLayerId(imgLayer.id);
              showNotice('Selected Splash Image URL Layer in Inspector');
            }}
            className="hover:text-white transition-colors underline-offset-4 hover:underline whitespace-nowrap"
          >
            Image URL Lab
          </button>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="hover:text-white transition-colors underline-offset-4 hover:underline whitespace-nowrap"
          >
            Code &amp; Export
          </button>
        </nav>

        {/* Zone 3: 2 primary actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (!isPlaying) setCurrentTimeMs(0);
              setIsPlaying(!isPlaying);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            {isPlaying ? 'Pause Preview' : 'Play Flow'}
          </button>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
          >
            Export MP4 · PNG · JPG
          </button>
        </div>
      </header>

      {/* Subtle Toast Notification */}
      {statusMessage && (
        <div className="fixed bottom-5 right-5 z-40 px-4 py-2.5 rounded-lg bg-slate-900/95 border border-blue-500/60 text-xs font-medium text-slate-100 shadow-xl">
          {statusMessage}
        </div>
      )}

      {/* MAIN STUDIO WORKSPACE (3-Column Desktop Layout + Bottom Figma Flow Node Graph) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left Sidebar: Target OS/Device + Pre-Loaded Splash Templates */}
        <TemplateSidebar
          currentProject={project}
          onSelectTemplate={handleSelectTemplate}
          onChangeDevice={handleChangeDevice}
          onUpdateProjectFlags={handleUpdateProjectFlags}
        />

        {/* Center Column: Interactive Device Preview + Figma Smart Animate Flow Graph */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="min-h-[640px] flex-1">
            <DevicePreviewStage
              project={project}
              currentTimeMs={currentTimeMs}
              isPlaying={isPlaying}
              isLooping={isLooping}
              playbackSpeed={playbackSpeed}
              selectedStateIndex={selectedStateIndex}
              selectedLayerId={selectedLayerId}
              onScrubTime={(t) => {
                setIsPlaying(false);
                setCurrentTimeMs(t);
              }}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onToggleLoop={() => setIsLooping((l) => !l)}
              onChangeSpeed={(s) => setPlaybackSpeed(s)}
              onSelectState={handleSelectState}
              onUpdateLayerSnapshot={handleUpdateLayerSnapshot}
              onQuickExport={handleQuickExport}
              isExporting={isExporting}
            />
          </div>

          {/* Figma-Style Smart Animate Flow Graph & Curve Editor Section */}
          <section
            ref={flowSectionRef}
            className="p-5 bg-[#0A0F1C] border-t border-slate-800/90"
          >
            <FigmaFlowCanvas
              project={project}
              selectedStateIndex={selectedStateIndex}
              selectedTransitionIndex={selectedTransitionIndex}
              onSelectState={handleSelectState}
              onSelectTransition={(idx) => setSelectedTransitionIndex(idx)}
              onUpdateTransition={handleUpdateTransition}
              onUpdateStateMeta={handleUpdateStateMeta}
              onAddFlowState={handleAddFlowState}
              onDeleteFlowState={handleDeleteFlowState}
              onApplyChoreographyPreset={handleApplyChoreographyPreset}
            />
          </section>
        </main>

        {/* Right Column: Layer, Image URL, Keyframe & Color Inspector */}
        <div className="w-full lg:w-84 shrink-0">
          <PropertyInspector
            project={project}
            selectedLayerId={selectedLayerId}
            selectedStateIndex={selectedStateIndex}
            onSelectLayer={(id) => setSelectedLayerId(id)}
            onUpdateLayer={handleUpdateLayer}
            onUpdateLayerSnapshot={handleUpdateLayerSnapshot}
            onUpdateBackground={handleUpdateBackground}
            onAddLayer={handleAddLayer}
            onDeleteLayer={handleDeleteLayer}
            onApplyColorSwatch={handleApplyColorSwatch}
          />
        </div>
      </div>

      {/* Export MP4 / PNG / JPG & Native Code Handoff Modal */}
      <ExportAndCodeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        currentTimeMs={currentTimeMs}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportStageText={exportStageText}
        onExportMP4={handleTriggerMP4Export}
        onExportImage={handleTriggerImageExport}
      />
    </div>
  );
}
