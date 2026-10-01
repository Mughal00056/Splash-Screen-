import React, { useState } from 'react';
import {
  Check,
  Grid,
  LayoutTemplate,
  Search,
  Shield,
  Smartphone,
} from 'lucide-react';
import { DEVICE_SPECS, PREMADE_TEMPLATES } from '../data/presets';
import { DevicePresetId, PlatformType, SplashProject } from '../types/splash';

interface TemplateSidebarProps {
  currentProject: SplashProject;
  onSelectTemplate: (template: SplashProject) => void;
  onChangeDevice: (presetId: DevicePresetId, platform: PlatformType) => void;
  onUpdateProjectFlags: (updates: Partial<SplashProject>) => void;
}

export const TemplateSidebar: React.FC<TemplateSidebarProps> = ({
  currentProject,
  onSelectTemplate,
  onChangeDevice,
  onUpdateProjectFlags,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'ios' | 'android'>('all');

  const filteredTemplates = PREMADE_TEMPLATES.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform =
      platformFilter === 'all' || tpl.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  return (
    <aside className="w-72 shrink-0 flex flex-col h-full bg-[#0C1220] border-r border-slate-800/80 select-none">
      {/* Device Hardware & OS Selector */}
      <div className="p-4 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            Target Device &amp; OS
          </span>
          <span className="text-[11px] font-mono tabular-nums text-slate-400">
            {DEVICE_SPECS[currentProject.devicePreset]?.exportWidth}×
            {DEVICE_SPECS[currentProject.devicePreset]?.exportHeight}
          </span>
        </div>

        {/* Platform Switcher (iOS / Android) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#070B14] rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onChangeDevice('iphone-16-pro', 'ios')}
            className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              currentProject.platform === 'ios'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Apple iOS 18
          </button>
          <button
            type="button"
            onClick={() => onChangeDevice('pixel-9-pro', 'android')}
            className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              currentProject.platform === 'android'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Android 15
          </button>
        </div>

        {/* Specific Device Hardware Dropdown */}
        <select
          value={currentProject.devicePreset}
          onChange={(e) => {
            const id = e.target.value as DevicePresetId;
            const spec = DEVICE_SPECS[id];
            if (spec) onChangeDevice(id, spec.platform);
          }}
          className="w-full px-2.5 py-1.5 text-xs bg-[#070B14] border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
        >
          {Object.values(DEVICE_SPECS).map((spec) => (
            <option key={spec.id} value={spec.id}>
              {spec.name} ({spec.osVersion} · {spec.exportWidth}×{spec.exportHeight})
            </option>
          ))}
        </select>

        {/* Studio Guides Toggles */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() =>
              onUpdateProjectFlags({
                showCenterGrid: !currentProject.showCenterGrid,
              })
            }
            className={`flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
              currentProject.showCenterGrid
                ? 'bg-blue-950/60 border-blue-500 text-blue-300'
                : 'bg-[#070B14] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3 h-3" />
            Grid
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateProjectFlags({
                showSafeArea: !currentProject.showSafeArea,
              })
            }
            className={`flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
              currentProject.showSafeArea
                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                : 'bg-[#070B14] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Safe Area
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateProjectFlags({
                showAndroid12Mask: !currentProject.showAndroid12Mask,
              })
            }
            title="Android 12+ SplashScreen API Circular Icon Mask Guide"
            className={`flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-medium rounded border transition-colors whitespace-nowrap ${
              currentProject.showAndroid12Mask
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                : 'bg-[#070B14] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3 h-3" />
            Mask
          </button>
        </div>
      </div>

      {/* Pre-Loaded Templates Library */}
      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <LayoutTemplate className="w-3.5 h-3.5 text-amber-400" />
            Pre-Loaded Splash Templates
          </span>
          <span className="text-[11px] font-mono tabular-nums text-slate-400">
            {filteredTemplates.length}
          </span>
        </div>

        {/* Search & Platform Filter */}
        <div className="space-y-2 mb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter templates..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#070B14] border border-slate-800 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-[#070B14] rounded-md border border-slate-800">
            {(['all', 'ios', 'android'] as const).map((pf) => (
              <button
                key={pf}
                type="button"
                onClick={() => setPlatformFilter(pf)}
                className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors capitalize ${
                  platformFilter === pf
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {pf === 'all' ? 'All OS' : pf === 'ios' ? 'iOS' : 'Android'}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Template Cards */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredTemplates.map((tpl) => {
            const isCurrent = currentProject.id === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelectTemplate(tpl)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-blue-950/35 border-blue-500'
                    : 'bg-[#070B14] border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-100 truncate">
                    {tpl.name}
                  </span>
                  {isCurrent && (
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  )}
                </div>

                {/* Unboxed metadata with typographic separator */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                  <span>{tpl.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {tpl.flowStates.length} states
                  </span>
                </div>

                <p className="text-[11px] text-slate-400/90 mt-1.5 line-clamp-2 leading-relaxed">
                  {tpl.description}
                </p>

                {/* Color Palette Preview Bar */}
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span
                    className="w-4 h-2 rounded-sm border border-slate-700/60"
                    style={{
                      backgroundColor:
                        tpl.background.gradientStart || tpl.background.solidColor,
                    }}
                  />
                  <span
                    className="w-4 h-2 rounded-sm border border-slate-700/60"
                    style={{
                      backgroundColor:
                        tpl.background.gradientEnd || tpl.background.solidColor,
                    }}
                  />
                  <span className="text-[10px] font-mono text-slate-500 ml-auto">
                    Load Flow →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
