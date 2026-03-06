// src/components/features/settings/CustomToolsPanel.tsx
'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import { useSettingsStore, type DraftCustomTool, type DraftToolProbe, type DraftToolMode } from '@/store/settingsStore';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, Wrench,
  CircleDot, Settings, Upload, HardDrive,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

type ToolSection = 'general' | 'probes';

const CONNECTIVITY_LABELS: Record<string, string> = {
  measurement: 'Solo misura (V/Ω)',
  uart: 'Solo UART',
  all: 'Tutti i pin',
};

const OUTPUT_TYPE_LABELS: Record<string, string> = {
  none: 'Nessuno',
  numeric: 'Numerico',
  leds: 'LED',
  'connection-status': 'Stato connessione',
  'firmware-dump': 'Firmware Dump',
};

// ============================================
// MAIN PANEL
// ============================================

const CustomToolsPanel = () => {
  const {
    customTools,
    activeCustomToolId,
    addCustomTool,
    selectCustomTool,
  } = useSettingsStore();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-gray-400 uppercase tracking-wider">
          Tool personalizzati ({customTools.length})
        </h3>
        <button
          onClick={addCustomTool}
          className="text-gray-400 hover:text-white transition-colors p-0.5"
          title="Aggiungi tool"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {customTools.length === 0 && (
        <p className="text-xs text-gray-500 italic">
          Nessun tool. Clicca + per crearne uno.
        </p>
      )}

      <div className="space-y-1">
        {customTools.map(tool => (
          <ToolItem
            key={tool.id}
            tool={tool}
            isExpanded={tool.id === activeCustomToolId}
            onToggle={() => selectCustomTool(tool.id === activeCustomToolId ? null : tool.id)}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================
// TOOL ITEM (accordion)
// ============================================

const ToolItem = ({
  tool, isExpanded, onToggle,
}: {
  tool: DraftCustomTool;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const { updateCustomTool, deleteCustomTool } = useSettingsStore();
  const [section, setSection] = useState<ToolSection>('general');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(tool.name);

  const handleNameSave = () => {
    updateCustomTool(tool.id, { name: nameValue });
    setEditingName(false);
  };

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      isExpanded ? 'border-purple-500/50 bg-gray-750' : 'border-gray-700 bg-gray-800/50'
    )}>
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-1.5 cursor-pointer group" onClick={onToggle}>
        {isExpanded
          ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        }
        <Wrench className="h-3 w-3 text-purple-400 flex-shrink-0" />

        {editingName ? (
          <input
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-gray-700 border border-gray-500 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-purple-500 min-w-0"
            autoFocus
          />
        ) : (
          <span className="text-sm truncate flex-1">{tool.name || 'Senza nome'}</span>
        )}

        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setEditingName(true); setNameValue(tool.name); }}
            className="text-gray-400 hover:text-white p-0.5"
            title="Rinomina"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <DeleteToolButton name={tool.name || 'questo tool'} onConfirm={() => deleteCustomTool(tool.id)} />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          {/* Sub-tab selector */}
          <div className="flex gap-1">
            <button
              onClick={() => setSection('general')}
              className={cn(
                'flex-1 px-2 py-1 rounded text-xs transition-colors flex items-center justify-center gap-1',
                section === 'general'
                  ? 'bg-purple-600/50 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:text-gray-300'
              )}
            >
              <Settings className="h-3 w-3" />
              Generale
            </button>
            <button
              onClick={() => setSection('probes')}
              className={cn(
                'flex-1 px-2 py-1 rounded text-xs transition-colors flex items-center justify-center gap-1',
                section === 'probes'
                  ? 'bg-purple-600/50 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:text-gray-300'
              )}
            >
              <CircleDot className="h-3 w-3" />
              Sonde ({tool.probes.length})
            </button>
          </div>

          {section === 'general' && (
            <GeneralSection tool={tool} />
          )}
          {section === 'probes' && (
            <ProbesSection tool={tool} />
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// GENERAL SECTION
// ============================================

const GeneralSection = ({ tool }: { tool: DraftCustomTool }) => {
  const { updateCustomTool, addModeToTool, updateMode, deleteMode } = useSettingsStore();

  return (
    <div className="space-y-2">
      {/* Description */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-0.5">Descrizione</label>
        <textarea
          value={tool.description}
          onChange={e => updateCustomTool(tool.id, { description: e.target.value })}
          placeholder="Descrizione del tool..."
          rows={2}
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      {/* Output type */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-0.5">Tipo output</label>
        <div className="flex gap-1.5">
          <select
            value={tool.outputType}
            onChange={e => updateCustomTool(tool.id, { outputType: e.target.value as DraftCustomTool['outputType'] })}
            className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            {Object.entries(OUTPUT_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {tool.outputType === 'numeric' && (
            <input
              value={tool.outputUnit}
              onChange={e => updateCustomTool(tool.id, { outputUnit: e.target.value })}
              placeholder="Unità"
              className="w-16 bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          )}
        </div>
      </div>

      {/* Firmware Dump config */}
      {tool.outputType === 'firmware-dump' && (
        <FirmwareDumpSection tool={tool} />
      )}

      {/* Modes (only for numeric output) */}
      {tool.outputType === 'numeric' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 uppercase">Modi di misura</span>
            <button
              onClick={() => addModeToTool(tool.id)}
              className="text-gray-400 hover:text-white transition-colors p-0.5"
              title="Aggiungi modo"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {tool.modes.length === 0 && (
            <p className="text-[10px] text-gray-500 italic">Nessun modo. Clicca + per aggiungerne uno.</p>
          )}
          <div className="space-y-1">
            {tool.modes.map(mode => (
              <ModeRow key={mode.id} toolId={tool.id} mode={mode} onUpdate={updateMode} onDelete={deleteMode} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// FIRMWARE DUMP SECTION
// ============================================

const FirmwareDumpSection = ({ tool }: { tool: DraftCustomTool }) => {
  const { pins, updateFirmwareDumpConfig, uploadFirmwareFile } = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const cfg = tool.firmwareDumpConfig;

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFirmwareFile(tool.id, file);
    setUploading(false);
    if (!result.success) alert(`Errore upload: ${result.error}`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const setConnection = (probeId: string, pinId: string) => {
    const existing = cfg.requiredConnections.filter(c => c.probeId !== probeId);
    updateFirmwareDumpConfig(tool.id, {
      requiredConnections: pinId ? [...existing, { probeId, pinId }] : existing,
    });
  };

  return (
    <div className="space-y-2.5">
      {/* Pin mapping */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Connessioni richieste</label>
        {tool.probes.length === 0 ? (
          <p className="text-[10px] text-gray-500 italic">Aggiungi sonde nella tab &quot;Sonde&quot; prima</p>
        ) : (
          <div className="space-y-1">
            {tool.probes.map(probe => {
              const conn = cfg.requiredConnections.find(c => c.probeId === probe.id);
              return (
                <div key={probe.id} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: probe.color }} />
                  <span className="text-[10px] font-mono text-gray-300 w-14 truncate flex-shrink-0">{probe.label || probe.role}</span>
                  <select
                    value={conn?.pinId ?? ''}
                    onChange={e => setConnection(probe.id, e.target.value)}
                    className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-orange-500 min-w-0"
                  >
                    <option value="">— qualsiasi —</option>
                    {pins.map(pin => (
                      <option key={pin.id} value={pin.id}>
                        {pin.label || pin.pinType.toUpperCase()} ({pin.pinType})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Duration */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-0.5">Durata dump (sec)</label>
        <input
          type="number"
          min={1}
          max={30}
          value={cfg.dumpDurationSec}
          onChange={e => updateFirmwareDumpConfig(tool.id, { dumpDurationSec: Math.max(1, Math.min(30, Number(e.target.value))) })}
          className="w-20 bg-gray-700/50 border border-gray-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* File upload */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">File firmware</label>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            {uploading ? 'Caricamento...' : 'Carica file'}
          </button>
          {cfg.fileName && (
            <div className="flex items-center gap-1 text-[10px] text-orange-300">
              <HardDrive className="h-3 w-3 flex-shrink-0" />
              <span className="truncate max-w-[100px]">{cfg.fileName}</span>
              <button
                onClick={() => updateFirmwareDumpConfig(tool.id, { filePath: '', fileName: '' })}
                className="text-red-400 hover:text-red-300 ml-0.5"
                title="Rimuovi"
              >
                ×
              </button>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
      </div>
    </div>
  );
};

// ============================================
// MODE ROW
// ============================================

const ModeRow = ({
  toolId, mode, onUpdate, onDelete,
}: {
  toolId: string;
  mode: DraftToolMode;
  onUpdate: (toolId: string, modeId: string, updates: Partial<Omit<DraftToolMode, 'id'>>) => void;
  onDelete: (toolId: string, modeId: string) => void;
}) => (
  <div className="flex items-center gap-1 group">
    <input
      value={mode.name}
      onChange={e => onUpdate(toolId, mode.id, { name: e.target.value })}
      placeholder="Nome"
      className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1.5 py-0.5 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 min-w-0"
    />
    <input
      value={mode.shortName}
      onChange={e => onUpdate(toolId, mode.id, { shortName: e.target.value })}
      placeholder="Short"
      className="w-12 bg-gray-700/50 border border-gray-600 rounded px-1.5 py-0.5 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
    />
    <input
      value={mode.unit}
      onChange={e => onUpdate(toolId, mode.id, { unit: e.target.value })}
      placeholder="Unità"
      className="w-12 bg-gray-700/50 border border-gray-600 rounded px-1.5 py-0.5 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
    />
    <button
      onClick={() => onDelete(toolId, mode.id)}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 p-0.5 flex-shrink-0"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  </div>
);

// ============================================
// PROBES SECTION
// ============================================

const ProbesSection = ({ tool }: { tool: DraftCustomTool }) => {
  const { addProbeToTool } = useSettingsStore();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 uppercase">Sonde ({tool.probes.length})</span>
        <button
          onClick={() => addProbeToTool(tool.id)}
          className="text-gray-400 hover:text-white transition-colors p-0.5"
          title="Aggiungi sonda"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {tool.probes.length === 0 && (
        <p className="text-[10px] text-gray-500 italic">Nessuna sonda. Clicca + per aggiungerne una.</p>
      )}
      <div className="space-y-1.5">
        {tool.probes.map(probe => (
          <ProbeRow key={probe.id} toolId={tool.id} probe={probe} />
        ))}
      </div>
    </div>
  );
};

// ============================================
// PROBE ROW
// ============================================

const ProbeRow = ({ toolId, probe }: { toolId: string; probe: DraftToolProbe }) => {
  const { updateProbe, deleteProbe } = useSettingsStore();

  return (
    <div className="rounded border border-gray-700 bg-gray-800/60 p-1.5 space-y-1.5 group relative">
      {/* Delete button */}
      <button
        onClick={() => deleteProbe(toolId, probe.id)}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 p-0.5"
        title="Elimina sonda"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      {/* Label + Role row */}
      <div className="flex items-center gap-1.5 pr-5">
        {/* Color picker */}
        <div className="relative flex-shrink-0">
          <input
            type="color"
            value={probe.color}
            onChange={e => updateProbe(toolId, probe.id, { color: e.target.value })}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title="Colore sonda"
          />
          <div
            className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0"
            style={{ backgroundColor: probe.color }}
          />
        </div>

        <input
          value={probe.label}
          onChange={e => updateProbe(toolId, probe.id, { label: e.target.value })}
          placeholder="Etichetta (es. CH1+)"
          className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1.5 py-0.5 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 min-w-0"
        />
      </div>

      {/* Role + Connectivity row */}
      <div className="flex items-center gap-1.5">
        <input
          value={probe.role}
          onChange={e => updateProbe(toolId, probe.id, { role: e.target.value })}
          placeholder="Ruolo (es. positivo)"
          className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1.5 py-0.5 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 min-w-0"
        />
        <select
          value={probe.connectivity}
          onChange={e => updateProbe(toolId, probe.id, { connectivity: e.target.value as DraftToolProbe['connectivity'] })}
          className="bg-gray-700/50 border border-gray-600 rounded px-1.5 py-0.5 text-[11px] text-white focus:outline-none focus:border-purple-500 max-w-[110px]"
        >
          {Object.entries(CONNECTIVITY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

// ============================================
// DELETE TOOL BUTTON
// ============================================

const DeleteToolButton = ({ name, onConfirm }: { name: string; onConfirm: () => void }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 p-0.5">
        <Trash2 className="h-3 w-3" />
      </button>
    </AlertDialogTrigger>
    <AlertDialogContent className="bg-gray-800 border-gray-600 text-white">
      <AlertDialogHeader>
        <AlertDialogTitle>Eliminare &quot;{name}&quot;?</AlertDialogTitle>
        <AlertDialogDescription className="text-gray-400">
          Questa azione non può essere annullata.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white">
          Annulla
        </AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white">
          Elimina
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default CustomToolsPanel;
