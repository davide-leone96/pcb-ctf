// src/components/features/settings/ToolConfigPanel.tsx
'use client';

import { useSettingsStore } from '@/store/settingsStore';
import { useTerminalSettingsStore } from '@/store/terminalSettingsStore';
import { Search, TerminalSquare, Plus, Trash2, ChevronDown, ChevronRight, Layers, PartyPopper } from 'lucide-react';
import { ALL_TOOLS, type Tool } from '@/data/exercise';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const ToolConfigPanel = () => {
  const {
    toolConfig, steps,
    updateMagnifierConfig, updateTerminalToolConfig,
    toolGroups, addToolGroup, updateToolGroup, deleteToolGroup, toggleToolInGroup,
    completionDialog, updateCompletionDialog,
  } = useSettingsStore();

  const { flagParts, bootStages, tabs } = useTerminalSettingsStore();

  const [expandedSection, setExpandedSection] = useState<string | null>('magnifier');

  const magnifier = toolConfig.magnifier!;
  const terminal = toolConfig.terminal!;

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">
        Tool Configuration
      </h3>

      {/* === MAGNIFIER === */}
      <SectionAccordion
        icon={<Search className="h-3.5 w-3.5 text-blue-400" />}
        title="Magnifier"
        expanded={expandedSection === 'magnifier'}
        onToggle={() => toggleSection('magnifier')}
        color="blue"
      >
        <div className="space-y-3">
          {/* Radius */}
          <div>
            <label className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Radius</span>
              <span className="font-mono text-gray-500">{magnifier.defaultRadius}px</span>
            </label>
            <input
              type="range"
              min={50}
              max={200}
              step={5}
              value={magnifier.defaultRadius}
              onChange={(e) => updateMagnifierConfig({ defaultRadius: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1.5"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>50px</span>
              <span>200px</span>
            </div>
          </div>

          {/* Zoom */}
          <div>
            <label className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Zoom</span>
              <span className="font-mono text-gray-500">{magnifier.defaultZoomLevel.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              min={1.5}
              max={5.0}
              step={0.1}
              value={magnifier.defaultZoomLevel}
              onChange={(e) => updateMagnifierConfig({ defaultZoomLevel: Number(e.target.value) })}
              className="w-full accent-blue-500 h-1.5"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>1.5x</span>
              <span>5.0x</span>
            </div>
          </div>
        </div>
      </SectionAccordion>

      {/* === TERMINAL === */}
      <SectionAccordion
        icon={<TerminalSquare className="h-3.5 w-3.5 text-green-400" />}
        title="Terminal"
        expanded={expandedSection === 'terminal'}
        onToggle={() => toggleSection('terminal')}
        color="green"
      >
        <div className="space-y-3">
          {/* Requires UART */}
          <ToggleRow
            label="Requires UART connection"
            description="The terminal won't open until UART is connected"
            checked={terminal.requiresUart}
            onChange={() => updateTerminalToolConfig({ requiresUart: !terminal.requiresUart })}
          />

          {/* Persistent */}
          <ToggleRow
            label="Cannot be disabled from toolbar"
            description="Once activated, the terminal cannot be turned off"
            checked={terminal.persistent}
            onChange={() => updateTerminalToolConfig({ persistent: !terminal.persistent })}
          />

          {/* Boot stage conditions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-400">Flag Conditions (Boot Stage)</label>
              <button
                onClick={() => {
                  const newCondition = {
                    bootStageId: bootStages[0]?.id || '',
                    unlockedFlags: [] as string[],
                    hint: '',
                  };
                  updateTerminalToolConfig({
                    bootStageConditions: [...terminal.bootStageConditions, newCondition],
                  });
                }}
                className="text-gray-400 hover:text-white transition-colors p-0.5"
                title="Add condition"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {terminal.bootStageConditions.length === 0 && (
              <p className="text-[10px] text-gray-500 italic">
                No flag conditions. Add one to define when the terminal completes the objective.
              </p>
            )}

            <div className="space-y-2">
              {terminal.bootStageConditions.map((condition, index) => (
                <BootStageConditionEditor
                  key={index}
                  condition={condition}
                  index={index}
                  bootStages={bootStages}
                  flagParts={flagParts}
                  tabs={tabs}
                  onUpdate={(updated) => {
                    const newConditions = [...terminal.bootStageConditions];
                    newConditions[index] = updated;
                    updateTerminalToolConfig({ bootStageConditions: newConditions });
                  }}
                  onDelete={() => {
                    updateTerminalToolConfig({
                      bootStageConditions: terminal.bootStageConditions.filter((_, i) => i !== index),
                    });
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </SectionAccordion>

      {/* === TOOL GROUPS === */}
      <SectionAccordion
        icon={<Layers className="h-3.5 w-3.5 text-amber-400" />}
        title="Tool groups"
        expanded={expandedSection === 'groups'}
        onToggle={() => toggleSection('groups')}
        color="amber"
      >
        <div className="space-y-3">
          <p className="text-[10px] text-gray-500">
            Tools in the same group can be active simultaneously.
          </p>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase">Groups ({toolGroups.length})</span>
            <button
              onClick={addToolGroup}
              className="text-gray-400 hover:text-white transition-colors p-0.5"
              title="Add group"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {toolGroups.length === 0 && (
            <p className="text-[10px] text-gray-500 italic">
              No groups. Click + to create one.
            </p>
          )}

          <div className="space-y-2">
            {toolGroups.map(group => (
              <ToolGroupEditor
                key={group.id}
                group={group}
                onUpdate={(updates) => updateToolGroup(group.id, updates)}
                onDelete={() => deleteToolGroup(group.id)}
                onToggleTool={(toolId) => toggleToolInGroup(group.id, toolId)}
              />
            ))}
          </div>
        </div>
      </SectionAccordion>

      {/* === COMPLETION DIALOG === */}
      <SectionAccordion
        icon={<PartyPopper className="h-3.5 w-3.5 text-yellow-400" />}
        title="Completion Dialog"
        expanded={expandedSection === 'completion'}
        onToggle={() => toggleSection('completion')}
        color="yellow"
      >
        <div className="space-y-3">
          <p className="text-[10px] text-gray-500">
            Configure the popup shown when the exercise is completed.
          </p>

          {/* Title */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={completionDialog.title}
              onChange={(e) => updateCompletionDialog({ title: e.target.value })}
              placeholder="Exercise Completed!"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea
              value={completionDialog.description}
              onChange={(e) => updateCompletionDialog({ description: e.target.value })}
              placeholder="Congratulations..."
              rows={2}
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 resize-none"
            />
          </div>

          {/* Show Copy Flag */}
          <ToggleRow
            label="Show copy flag button"
            description="Allow the user to copy the flag to clipboard"
            checked={completionDialog.showCopyFlag}
            onChange={() => updateCompletionDialog({ showCopyFlag: !completionDialog.showCopyFlag })}
          />

          {/* Redirect URL */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Redirect URL</label>
            <input
              type="text"
              value={completionDialog.redirectUrl}
              onChange={(e) => updateCompletionDialog({ redirectUrl: e.target.value })}
              placeholder="https://example.com/next (leave empty to hide button)"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
          </div>

          {/* Redirect Label (only shown if URL is set) */}
          {completionDialog.redirectUrl && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Redirect button label</label>
              <input
                type="text"
                value={completionDialog.redirectLabel}
                onChange={(e) => updateCompletionDialog({ redirectLabel: e.target.value })}
                placeholder="Next Exercise"
                className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
            </div>
          )}

          {/* Download File Path */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Download file path</label>
            <input
              type="text"
              value={completionDialog.downloadFilePath}
              onChange={(e) => updateCompletionDialog({ downloadFilePath: e.target.value })}
              placeholder="/downloads/report.pdf (leave empty to hide button)"
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
            <p className="text-[10px] text-gray-500 mt-0.5">Path relative to the public folder</p>
          </div>

          {/* Download Label & Filename (only shown if path is set) */}
          {completionDialog.downloadFilePath && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Download button label</label>
                <input
                  type="text"
                  value={completionDialog.downloadLabel}
                  onChange={(e) => updateCompletionDialog({ downloadLabel: e.target.value })}
                  placeholder="Download File"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Downloaded file name</label>
                <input
                  type="text"
                  value={completionDialog.downloadFileName}
                  onChange={(e) => updateCompletionDialog({ downloadFileName: e.target.value })}
                  placeholder="report.pdf (name the user receives)"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </>
          )}
        </div>
      </SectionAccordion>
    </div>
  );
};

// --- Reusable Components ---

const SectionAccordion = ({
  icon, title, expanded, onToggle, color, children,
}: {
  icon: React.ReactNode;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  color: string;
  children: React.ReactNode;
}) => (
  <div className={cn(
    'rounded-lg border transition-colors',
    expanded ? `border-${color}-500/50 bg-gray-750` : 'border-gray-700 bg-gray-800/50'
  )}>
    <div
      className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
      onClick={onToggle}
    >
      {expanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
      {icon}
      <span className="text-xs font-medium">{title}</span>
    </div>
    {expanded && (
      <div className="px-3 pb-3 pt-1">
        {children}
      </div>
    )}
  </div>
);

const ToggleRow = ({
  label, description, checked, onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <div>
    <label
      className="flex items-center gap-2 cursor-pointer select-none"
      onClick={onChange}
    >
      <div className={cn(
        'w-8 h-4 rounded-full transition-colors relative flex-shrink-0',
        checked ? 'bg-green-600' : 'bg-gray-600'
      )}>
        <div className={cn(
          'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )} />
      </div>
      <span className="text-xs text-gray-300">{label}</span>
    </label>
    {description && (
      <p className="text-[10px] text-gray-500 mt-0.5 ml-10">{description}</p>
    )}
  </div>
);

const BootStageConditionEditor = ({
  condition, index, bootStages, flagParts, tabs, onUpdate, onDelete,
}: {
  condition: { bootStageId: string; unlockedFlags: string[]; hint: string };
  index: number;
  bootStages: Array<{ id: string; name: string; tabId: string }>;
  flagParts: Array<{ id: string; part: string; description: string }>;
  tabs: Array<{ id: string; name: string }>;
  onUpdate: (updated: { bootStageId: string; unlockedFlags: string[]; hint: string }) => void;
  onDelete: () => void;
}) => (
  <div className="rounded border border-gray-700 bg-gray-800/50 p-2 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-500 font-mono">#{index + 1}</span>
      <button onClick={onDelete} className="text-gray-400 hover:text-red-400 p-0.5">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>

    {/* Boot stage selector */}
    <div>
      <label className="block text-[10px] text-gray-500 mb-0.5">Boot Stage</label>
      <select
        value={condition.bootStageId}
        onChange={(e) => onUpdate({ ...condition, bootStageId: e.target.value })}
        className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-green-500"
      >
        <option value="">-- Select --</option>
        {bootStages.map(stage => {
          const tab = tabs.find(t => t.id === stage.tabId);
          return (
            <option key={stage.id} value={stage.id}>
              {tab ? `[${tab.name}] ` : ''}{stage.name || stage.id}
            </option>
          );
        })}
      </select>
    </div>

    {/* Flag parts selector */}
    <div>
      <label className="block text-[10px] text-gray-500 mb-0.5">Flags to unlock</label>
      {flagParts.length === 0 ? (
        <p className="text-[10px] text-gray-500 italic">Define flags in the Terminal tab first</p>
      ) : (
        <div className="space-y-0.5 max-h-[100px] overflow-y-auto">
          {flagParts.map(flag => {
            const isSelected = condition.unlockedFlags.includes(flag.id);
            return (
              <label key={flag.id} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-700/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    const newFlags = isSelected
                      ? condition.unlockedFlags.filter(f => f !== flag.id)
                      : [...condition.unlockedFlags, flag.id];
                    onUpdate({ ...condition, unlockedFlags: newFlags });
                  }}
                  className="accent-green-500 h-3 w-3 flex-shrink-0"
                />
                <span className="text-xs text-green-300 font-mono">{flag.part || flag.id}</span>
                {flag.description && (
                  <span className="text-[10px] text-gray-500 truncate">{flag.description}</span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>

    {/* Hint */}
    <div>
      <label className="block text-[10px] text-gray-500 mb-0.5">Hint</label>
      <input
        type="text"
        value={condition.hint}
        onChange={(e) => onUpdate({ ...condition, hint: e.target.value })}
        placeholder="Hint..."
        className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
      />
    </div>
  </div>
);

const TOOL_LABELS: Record<Tool, string> = {
  pointer: 'Pointer',
  magnifier: 'Magnifier',
  multimeter: 'Multimeter',
  probes: 'UART',
  terminal: 'Terminal',
  custom: 'Custom',
};

const ToolGroupEditor = ({
  group, onUpdate, onDelete, onToggleTool,
}: {
  group: { id: string; name: string; toolIds: string[] };
  onUpdate: (updates: Partial<{ name: string; toolIds: string[] }>) => void;
  onDelete: () => void;
  onToggleTool: (toolId: string) => void;
}) => (
  <div className="rounded border border-gray-700 bg-gray-800/50 p-2 space-y-2">
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={group.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 min-w-0"
        placeholder="Group name..."
      />
      <button onClick={onDelete} className="text-gray-400 hover:text-red-400 p-0.5 flex-shrink-0">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>

    <div className="space-y-0.5">
      <label className="block text-[10px] text-gray-500 mb-1">Tools in group</label>
      {ALL_TOOLS.map(tool => {
        const checked = group.toolIds.includes(tool);
        return (
          <label
            key={tool}
            className="flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-gray-600/40 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggleTool(tool)}
              className="rounded border-gray-500 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 bg-gray-700"
            />
            <span className={checked ? 'text-white' : 'text-gray-400'}>{TOOL_LABELS[tool]}</span>
          </label>
        );
      })}
    </div>
  </div>
);

export default ToolConfigPanel;
