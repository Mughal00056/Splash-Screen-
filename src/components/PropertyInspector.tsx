import React, { useRef, useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Link2,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import {
  COLOR_PALETTE_SWATCHES,
  STUDIO_IMAGE_PRESETS,
} from '../data/presets';
import {
  BackgroundMode,
  LayerStateSnapshot,
  LoaderStyle,
  MaskShape,
  SplashBackground,
  SplashLayer,
  SplashProject,
  VectorEmblemId,
} from '../types/splash';
import { DEFAULT_LAYER_SNAPSHOT } from '../utils/flowEngine';

interface PropertyInspectorProps {
  project: SplashProject;
  selectedLayerId: string;
  selectedStateIndex: number;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (layerId: string, updates: Partial<SplashLayer>) => void;
  onUpdateLayerSnapshot: (
    stateIndex: number,
    layerId: string,
    updates: Partial<LayerStateSnapshot>
  ) => void;
  onUpdateBackground: (updates: Partial<SplashBackground>) => void;
  onAddLayer: (type: SplashLayer['type']) => void;
  onDeleteLayer: (layerId: string) => void;
  onApplyColorSwatch: (swatch: (typeof COLOR_PALETTE_SWATCHES)[0]) => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  project,
  selectedLayerId,
  selectedStateIndex,
  onSelectLayer,
  onUpdateLayer,
  onUpdateLayerSnapshot,
  onUpdateBackground,
  onAddLayer,
  onDeleteLayer,
  onApplyColorSwatch,
}) => {
  const [activeTab, setActiveTab] = useState<'layer' | 'background'>('layer');
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedLayer =
    project.layers.find((l) => l.id === selectedLayerId) || project.layers[0];
  const currentState =
    project.flowStates[selectedStateIndex] || project.flowStates[0];
  const currentSnapshot: LayerStateSnapshot = {
    ...DEFAULT_LAYER_SNAPSHOT,
    ...(selectedLayer && currentState?.layerSnapshots[selectedLayer.id]
      ? currentState.layerSnapshots[selectedLayer.id]
      : {}),
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logo' | 'bg'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      if (target === 'logo' && selectedLayer) {
        onUpdateLayer(selectedLayer.id, {
          type: 'image-logo',
          imageUrl: result,
        });
      } else if (target === 'bg') {
        onUpdateBackground({
          mode: 'image-url',
          imageUrl: result,
          imageOpacity: 0.9,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full bg-[#0C1220] border-l border-slate-800/80 select-none">
      {/* Segmented Inspector Header */}
      <div className="p-3 border-b border-slate-800/80">
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#070B14] rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('layer')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'layer'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Layer &amp; Keyframe
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('background')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'background'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Background &amp; Color
          </button>
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'layer' ? (
          <>
            {/* Layer Stack List + Add Layer Buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-200">
                  Splash Scene Layers ({project.layers.length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onAddLayer('image-logo')}
                    title="Add Image URL Layer"
                    className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors whitespace-nowrap"
                  >
                    + Image URL
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddLayer('text')}
                    title="Add Text Layer"
                    className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors whitespace-nowrap"
                  >
                    + Text
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddLayer('shape-ring')}
                    title="Add Ring Layer"
                    className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors whitespace-nowrap"
                  >
                    + Ring
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {project.layers.map((layer) => {
                  const isSel = selectedLayer?.id === layer.id;
                  return (
                    <div
                      key={layer.id}
                      onClick={() => onSelectLayer(layer.id)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer border text-xs transition-colors ${
                        isSel
                          ? 'bg-blue-950/50 border-blue-500/80 text-white'
                          : 'bg-[#070B14] border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {layer.type === 'image-logo' && (
                          <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        {layer.type === 'vector-emblem' && (
                          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                        {layer.type === 'text' && (
                          <Type className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        {(layer.type === 'loader' || layer.type === 'shape-ring') && (
                          <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        )}
                        <span className="truncate font-medium">{layer.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateLayer(layer.id, { visible: !layer.visible });
                          }}
                          className="p-1 text-slate-400 hover:text-slate-200"
                          title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                        >
                          {layer.visible ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </button>
                        {project.layers.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLayer(layer.id);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400"
                            title="Delete Layer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedLayer && (
              <>
                {/* KEYFRAME TRANSFORM FOR ACTIVE FLOW STATE */}
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-100">
                        Keyframe Transform · {currentState?.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Changes animate automatically across Figma Flow States
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLayerSnapshot(
                            selectedStateIndex,
                            selectedLayer.id,
                            { x: 0 }
                          )
                        }
                        title="Center Horizontally (X = 0)"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
                      >
                        <AlignCenterHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLayerSnapshot(
                            selectedStateIndex,
                            selectedLayer.id,
                            { y: 0 }
                          )
                        }
                        title="Center Vertically (Y = 0)"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700"
                      >
                        <AlignCenterVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* X and Y Position */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Offset X</span>
                        <span className="font-mono tabular-nums text-slate-200">
                          {Math.round(currentSnapshot.x)}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={currentSnapshot.x}
                        onChange={(e) =>
                          onUpdateLayerSnapshot(
                            selectedStateIndex,
                            selectedLayer.id,
                            { x: Number(e.target.value) }
                          )
                        }
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Offset Y</span>
                        <span className="font-mono tabular-nums text-slate-200">
                          {Math.round(currentSnapshot.y)}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-360}
                        max={360}
                        step={1}
                        value={currentSnapshot.y}
                        onChange={(e) =>
                          onUpdateLayerSnapshot(
                            selectedStateIndex,
                            selectedLayer.id,
                            { y: Number(e.target.value) }
                          )
                        }
                        className="w-full accent-blue-500"
                      />
                    </div>
                  </div>

                  {/* Scale & Rotation */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Scale</span>
                        <span className="font-mono tabular-nums text-blue-400">
                          {currentSnapshot.scaleX.toFixed(2)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={3.0}
                        step={0.05}
                        value={currentSnapshot.scaleX}
                        onChange={(e) => {
                          const s = Number(e.target.value);
                          onUpdateLayerSnapshot(
                            selectedStateIndex,
                            selectedLayer.id,
                            { scaleX: s, scaleY: s }
                          );
                        }}
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Rotation</span>
                        <span className="font-mono tabular-nums text-amber-400">
                          {Math.round(currentSnapshot.rotation)}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-360}
                        max={360}
                        step={5}
                        value={currentSnapshot.rotation}
                        onChange={(e) =>
                          onUpdateLayerSnapshot(
                            selectedStateIndex,
                            selectedLayer.id,
                            { rotation: Number(e.target.value) }
                          )
                        }
                        className="w-full accent-amber-400"
                      />
                    </div>
                  </div>

                  {/* Opacity & Blur */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Opacity</span>
                        <span className="font-mono tabular-nums text-slate-200">
                          {Math.round(currentSnapshot.opacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={currentSnapshot.opacity}
                        onChange={(e) =>
                          onUpdateLayerSnapshot(
                            selectedStateIndex,
                            selectedLayer.id,
                            { opacity: Number(e.target.value) }
                          )
                        }
                        className="w-full accent-blue-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Motion Blur</span>
                        <span className="font-mono tabular-nums text-slate-200">
                          {currentSnapshot.blur.toFixed(0)}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={24}
                        step={1}
                        value={currentSnapshot.blur}
                        onChange={(e) =>
                          onUpdateLayerSnapshot(
                            selectedStateIndex,
                            selectedLayer.id,
                            { blur: Number(e.target.value) }
                          )
                        }
                        className="w-full accent-blue-500"
                      />
                    </div>
                  </div>

                  {/* Width & Height Base Dimensions */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Base Width (px)
                      </label>
                      <input
                        type="number"
                        min={12}
                        max={400}
                        value={selectedLayer.width}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, {
                            width: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[#070B14] border border-slate-700 rounded-md text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Base Height (px)
                      </label>
                      <input
                        type="number"
                        min={4}
                        max={400}
                        value={selectedLayer.height}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, {
                            height: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[#070B14] border border-slate-700 rounded-md text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* LAYER-SPECIFIC APPEARANCE & IMAGE URL SETTINGS */}
                <div className="pt-4 border-t border-slate-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-100">
                      Layer Content &amp; Custom Colors
                    </span>
                    {(selectedLayer.type === 'image-logo' ||
                      selectedLayer.type === 'vector-emblem') && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            type:
                              selectedLayer.type === 'image-logo'
                                ? 'vector-emblem'
                                : 'image-logo',
                            imageUrl:
                              selectedLayer.imageUrl ||
                              STUDIO_IMAGE_PRESETS.logos[0].url,
                            emblemId: selectedLayer.emblemId || 'kinetix-prism',
                          })
                        }
                        className="text-[11px] font-medium text-blue-400 hover:text-blue-300 underline"
                      >
                        Switch to{' '}
                        {selectedLayer.type === 'image-logo'
                          ? 'Vector Emblem'
                          : 'Custom Image URL'}
                      </button>
                    )}
                  </div>

                  {/* IMAGE-LOGO LAYER CONTROLS (Custom Image URL + Presets + Mask + Colors) */}
                  {selectedLayer.type === 'image-logo' && (
                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-amber-300 mb-1.5">
                          <Link2 className="w-3.5 h-3.5" />
                          Splash Logo / Icon Image URL
                        </label>
                        <input
                          type="url"
                          value={selectedLayer.imageUrl || ''}
                          onChange={(e) =>
                            onUpdateLayer(selectedLayer.id, {
                              imageUrl: e.target.value,
                            })
                          }
                          placeholder="https://example.com/your-logo.png or data:image/..."
                          className="w-full px-2.5 py-2 text-xs font-mono bg-[#070B14] border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-amber-400"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            ref={logoFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'logo')}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => logoFileInputRef.current?.click()}
                            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload Local Logo File (PNG / SVG / JPG)
                          </button>
                        </div>
                      </div>

                      {/* Quick-Pick Studio Logo URLs */}
                      <div>
                        <span className="block text-[11px] text-slate-400 mb-1.5">
                          Pre-Loaded Studio Image URLs:
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {STUDIO_IMAGE_PRESETS.logos.map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() =>
                                onUpdateLayer(selectedLayer.id, {
                                  imageUrl: preset.url,
                                })
                              }
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-left text-xs transition-colors ${
                                selectedLayer.imageUrl === preset.url
                                  ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                                  : 'bg-[#070B14] border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <span className="truncate">{preset.name}</span>
                              <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                                {preset.tag}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mask Shape & Fit */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Icon Mask Shape
                          </label>
                          <select
                            value={selectedLayer.maskShape || 'squircle'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                maskShape: e.target.value as MaskShape,
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100"
                          >
                            <option value="squircle">iOS Squircle</option>
                            <option value="circle">Android 12+ Circle</option>
                            <option value="rounded">Rounded Square</option>
                            <option value="hexagon">Geometric Hexagon</option>
                            <option value="none">Unmasked Full</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Image Fit Mode
                          </label>
                          <select
                            value={selectedLayer.imageFit || 'cover'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                imageFit: e.target.value as 'cover' | 'contain',
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100"
                          >
                            <option value="cover">Cover (Full Bleed)</option>
                            <option value="contain">Contain (Inset Logo)</option>
                          </select>
                        </div>
                      </div>

                      {/* Container Backdrop, Border & Glow Colors */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Plate Color
                          </label>
                          <input
                            type="color"
                            value={selectedLayer.containerBgColor || '#0F172A'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                containerBgColor: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Border Color
                          </label>
                          <input
                            type="color"
                            value={selectedLayer.borderColor || '#F59E0B'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                borderColor: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Glow Color
                          </label>
                          <input
                            type="color"
                            value={selectedLayer.glowColor || '#F59E0B'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                glowColor: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VECTOR EMBLEM CONTROLS */}
                  {selectedLayer.type === 'vector-emblem' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Studio Vector Emblem
                        </label>
                        <select
                          value={selectedLayer.emblemId || 'kinetix-prism'}
                          onChange={(e) =>
                            onUpdateLayer(selectedLayer.id, {
                              emblemId: e.target.value as VectorEmblemId,
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100"
                        >
                          <option value="kinetix-prism">Kinetix Prism</option>
                          <option value="spatial-cube">Isometric Spatial Cube</option>
                          <option value="orbital-rings">Atom Orbital Rings</option>
                          <option value="fintech-shield">FinTech Sovereign Shield</option>
                          <option value="pulse-wave">Biometric Pulse Wave</option>
                          <option value="neural-nexus">Neural Lattice Graph</option>
                          <option value="velocity-bolt">Velocity Lightning Bolt</option>
                          <option value="luxury-monogram">Atelier Luxury Monogram</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Primary
                          </label>
                          <input
                            type="color"
                            value={selectedLayer.primaryColor || '#38BDF8'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                primaryColor: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Secondary
                          </label>
                          <input
                            type="color"
                            value={selectedLayer.secondaryColor || '#818CF8'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                secondaryColor: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Accent
                          </label>
                          <input
                            type="color"
                            value={selectedLayer.accentColor || '#F59E0B'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                accentColor: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TEXT LAYER CONTROLS */}
                  {selectedLayer.type === 'text' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Display Copy
                        </label>
                        <input
                          type="text"
                          value={selectedLayer.text || ''}
                          onChange={(e) =>
                            onUpdateLayer(selectedLayer.id, {
                              text: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Font Family
                          </label>
                          <select
                            value={selectedLayer.fontFamily || 'Syne'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                fontFamily: e.target.value as SplashLayer['fontFamily'],
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100"
                          >
                            <option value="Syne">Syne (Display)</option>
                            <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                            <option value="Instrument Serif">Instrument Serif</option>
                            <option value="JetBrains Mono">JetBrains Mono</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Font Size ({selectedLayer.fontSize || 24}px)
                          </label>
                          <input
                            type="range"
                            min={10}
                            max={64}
                            step={1}
                            value={selectedLayer.fontSize || 24}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                fontSize: Number(e.target.value),
                              })
                            }
                            className="w-full accent-blue-500 mt-1.5"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Text Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={selectedLayer.textColor || '#F8FAFC'}
                              onChange={(e) =>
                                onUpdateLayer(selectedLayer.id, {
                                  textColor: e.target.value,
                                })
                              }
                              className="w-9 h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                            />
                            <input
                              type="text"
                              value={selectedLayer.textColor || '#F8FAFC'}
                              onChange={(e) =>
                                onUpdateLayer(selectedLayer.id, {
                                  textColor: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 text-xs font-mono bg-[#070B14] border border-slate-700 rounded text-slate-200"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedLayer.useGradientText)}
                              onChange={(e) =>
                                onUpdateLayer(selectedLayer.id, {
                                  useGradientText: e.target.checked,
                                  textGradientEnd:
                                    selectedLayer.textGradientEnd || '#38BDF8',
                                })
                              }
                            />
                            Gradient Stop Color
                          </label>
                          <input
                            type="color"
                            disabled={!selectedLayer.useGradientText}
                            value={selectedLayer.textGradientEnd || '#38BDF8'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                textGradientEnd: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700 disabled:opacity-40"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LOADER LAYER CONTROLS */}
                  {selectedLayer.type === 'loader' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Boot Indicator Style
                        </label>
                        <select
                          value={selectedLayer.loaderStyle || 'progress-bar'}
                          onChange={(e) =>
                            onUpdateLayer(selectedLayer.id, {
                              loaderStyle: e.target.value as LoaderStyle,
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100"
                        >
                          <option value="progress-bar">Linear Progress Bar</option>
                          <option value="spinner-ring">Orbital Spinner Ring</option>
                          <option value="pulse-dots">Harmonic Pulse Dots</option>
                          <option value="minimal-percent">Monospace Percentage</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">
                            State Progress ({currentState?.name})
                          </span>
                          <span className="font-mono tabular-nums text-blue-400">
                            {Math.round(currentSnapshot.loaderProgress ?? 50)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={currentSnapshot.loaderProgress ?? 50}
                          onChange={(e) =>
                            onUpdateLayerSnapshot(
                              selectedStateIndex,
                              selectedLayer.id,
                              { loaderProgress: Number(e.target.value) }
                            )
                          }
                          className="w-full accent-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Active Bar Color
                          </label>
                          <input
                            type="color"
                            value={selectedLayer.loaderColor || '#F59E0B'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                loaderColor: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Track Backdrop
                          </label>
                          <input
                            type="color"
                            value={selectedLayer.loaderTrackColor || '#1E293B'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                loaderTrackColor: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SHAPE-RING CONTROLS */}
                  {selectedLayer.type === 'shape-ring' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Geometry Shape
                          </label>
                          <select
                            value={selectedLayer.shapeKind || 'circle-ring'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                shapeKind: e.target.value as SplashLayer['shapeKind'],
                              })
                            }
                            className="w-full px-2 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100"
                          >
                            <option value="circle-ring">Harmonic Circle Ring</option>
                            <option value="rounded-plate">Glass Squircle Plate</option>
                            <option value="diamond-frame">Rotated Diamond Frame</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Ring Stroke Color
                          </label>
                          <input
                            type="color"
                            value={selectedLayer.strokeColor || '#F59E0B'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                strokeColor: e.target.value,
                                fillColor: e.target.value,
                                glowColor: e.target.value,
                              })
                            }
                            className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          /* TAB 2: BACKGROUND & GLOBAL COLOR SYSTEM */
          <div className="space-y-5">
            {/* Quick Studio Color Swatches */}
            <div>
              <span className="block text-xs font-semibold text-slate-200 mb-2">
                1-Click Studio Color Systems
              </span>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_PALETTE_SWATCHES.map((sw) => (
                  <button
                    key={sw.name}
                    type="button"
                    onClick={() => onApplyColorSwatch(sw)}
                    className="flex items-center gap-2 p-2 rounded-lg bg-[#070B14] border border-slate-800 hover:border-slate-600 text-left transition-colors"
                  >
                    <div className="flex -space-x-1 shrink-0">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-700"
                        style={{ backgroundColor: sw.bgStart }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-slate-700"
                        style={{ backgroundColor: sw.accent }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-200 truncate">
                      {sw.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Background Mode Selector */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Splash Background Engine
                </label>
                <select
                  value={project.background.mode}
                  onChange={(e) =>
                    onUpdateBackground({ mode: e.target.value as BackgroundMode })
                  }
                  className="w-full px-2.5 py-2 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100"
                >
                  <option value="image-url">Custom Background Image URL + Scrim</option>
                  <option value="mesh-aurora">Mesh Aurora Multi-Orb Glow</option>
                  <option value="linear-gradient">Multi-Stop Linear Gradient</option>
                  <option value="radial-gradient">Deep Studio Radial Vignette</option>
                  <option value="solid">Pure Solid Surface</option>
                </select>
              </div>

              {/* Custom Background Image URL Section */}
              <div className="p-3 rounded-lg bg-[#070B14] border border-slate-800 space-y-3">
                <label className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
                  <Link2 className="w-3.5 h-3.5" />
                  Background Wallpaper Image URL
                </label>
                <input
                  type="url"
                  value={project.background.imageUrl || ''}
                  onChange={(e) =>
                    onUpdateBackground({
                      mode: 'image-url',
                      imageUrl: e.target.value,
                    })
                  }
                  placeholder="https://example.com/splash-bg.jpg"
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#0C1220] border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-amber-400"
                />

                <div className="flex gap-2">
                  <input
                    ref={bgFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'bg')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bgFileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Wallpaper Image
                  </button>
                </div>

                {/* Preset 9:16 Studio Wallpapers */}
                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  {STUDIO_IMAGE_PRESETS.backgrounds.map((bgPreset) => (
                    <button
                      key={bgPreset.name}
                      type="button"
                      onClick={() =>
                        onUpdateBackground({
                          mode: 'image-url',
                          imageUrl: bgPreset.url,
                          imageOpacity: 0.88,
                        })
                      }
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-xs transition-colors ${
                        project.background.imageUrl === bgPreset.url
                          ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                          : 'bg-[#0C1220] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{bgPreset.name}</span>
                      <span className="text-[10px] text-slate-400">{bgPreset.tag}</span>
                    </button>
                  ))}
                </div>

                {/* Image Opacity & Blur */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Image Opacity</span>
                      <span className="font-mono tabular-nums text-slate-200">
                        {Math.round((project.background.imageOpacity ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={project.background.imageOpacity ?? 1}
                      onChange={(e) =>
                        onUpdateBackground({ imageOpacity: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Wallpaper Blur</span>
                      <span className="font-mono tabular-nums text-slate-200">
                        {project.background.imageBlur ?? 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={project.background.imageBlur ?? 0}
                      onChange={(e) =>
                        onUpdateBackground({ imageBlur: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Gradient & Solid Color Pickers */}
              <div className="space-y-3 pt-2">
                <span className="block text-xs font-semibold text-slate-200">
                  Custom Surface &amp; Gradient Colors
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Primary / Start
                    </label>
                    <input
                      type="color"
                      value={project.background.gradientStart || '#090D16'}
                      onChange={(e) =>
                        onUpdateBackground({
                          solidColor: e.target.value,
                          gradientStart: e.target.value,
                        })
                      }
                      className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Midpoint Tone
                    </label>
                    <input
                      type="color"
                      value={project.background.gradientMid || '#111827'}
                      onChange={(e) =>
                        onUpdateBackground({ gradientMid: e.target.value })
                      }
                      className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      End Tone
                    </label>
                    <input
                      type="color"
                      value={project.background.gradientEnd || '#1E293B'}
                      onChange={(e) =>
                        onUpdateBackground({ gradientEnd: e.target.value })
                      }
                      className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Gradient Angle</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {project.background.gradientAngle}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={5}
                    value={project.background.gradientAngle}
                    onChange={(e) =>
                      onUpdateBackground({ gradientAngle: Number(e.target.value) })
                    }
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Contrast Scrim & Architectural Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Contrast Scrim</span>
                      <span className="font-mono tabular-nums text-slate-200">
                        {Math.round(project.background.scrimOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.9}
                      step={0.05}
                      value={project.background.scrimOpacity}
                      onChange={(e) =>
                        onUpdateBackground({ scrimOpacity: Number(e.target.value) })
                      }
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Pattern Texture
                    </label>
                    <select
                      value={project.background.patternOverlay}
                      onChange={(e) =>
                        onUpdateBackground({
                          patternOverlay: e.target.value as SplashBackground['patternOverlay'],
                        })
                      }
                      className="w-full px-2 py-1 text-xs bg-[#070B14] border border-slate-700 rounded text-slate-100"
                    >
                      <option value="none">None</option>
                      <option value="subtle-grid">Architectural Grid</option>
                      <option value="radial-dots">Matrix Dots</option>
                      <option value="architectural-lines">Rule of Thirds</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
