// src/components/features/settings/SettingsSidebar.tsx
'use client';

import { useState } from 'react';
import { useSettingsStore, type DraftStep, type DraftObjective, type DraftComponent, type DraftPin, type SettingsTool } from '@/store/settingsStore';
import { ALL_TOOLS, type Tool } from '@/data/exercise';
import { cn } from '@/lib/utils';
import {
  BoxSelect, MapPin, Pencil, Trash2, Download, Copy, Check, Save, FolderOpen,
  Plus, ChevronDown, ChevronRight, ArrowUp, ArrowDown,
  Hand, Search, Wrench, Cable, TerminalSquare, type LucideIcon,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

// --- Constants ---

const TOOL_ICONS: Record<Tool, LucideIcon> = {
  pointer: Hand,
  magnifier: Search,
  multimeter: Wrench,
  probes: Cable,
  terminal: TerminalSquare,
};

const TOOL_LABELS: Record<Tool, string> = {
  pointer: 'Puntatore',
  magnifier: 'Lente',
  multimeter: 'Multimetro',
  probes: 'UART',
  terminal: 'Terminale',
};

const PIN_TYPE_COLORS: Record<string, string> = {
  custom: '#22D3EE',
  tx: '#22C55E',
  rx: '#FACC15',
  gnd: '#6B7280',
  vcc: '#EF4444',
};

const PIN_TYPE_LABELS: Record<string, string> = {
  custom: 'MEAS',
  tx: 'TX',
  rx: 'RX',
  gnd: 'GND',
  vcc: 'VCC',
};

// --- Main Sidebar ---

const SettingsSidebar = () => {
  const {
    activeTool, setActiveTool,
    components, editComponent, deleteComponent,
    steps, activeStepId, selectStep,
    addStep, deleteStep, reorderStep, updateStep, toggleStepTool,
    addObjective, deleteObjective, reorderObjective, editObjective,
    pins, editPin, deletePin,
    exportAsJson, exportAsTypeScript, applyConfig,
    saveToFile, loadFromFile,
  } = useSettingsStore();

  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleDownloadJson = () => {
    const json = exportAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exercise-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyTypeScript = async () => {
    const ts = exportAsTypeScript();
    await navigator.clipboard.writeText(ts);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToFile = async () => {
    const result = await saveToFile();
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert(`Errore: ${result.error}`);
    }
  };

  const handleLoadFromFile = async () => {
    const result = await loadFromFile();
    if (result.success) {
      setLoaded(true);
      setTimeout(() => setLoaded(false), 2000);
    } else {
      alert(`Errore: ${result.error}`);
    }
  };

  const isInitTab = activeTool === 'component' || activeTool === 'pin';

  const hasContent = steps.length > 0 || components.length > 0 || pins.length > 0;

  return (
    <aside className="flex flex-col gap-y-3 rounded-lg bg-gray-800 p-4 w-72 text-white max-h-[calc(100vh-8rem)] overflow-hidden">
      {/* Tab selector: Init / Challenge */}
      <div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTool('component')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors flex-1',
              isInitTab ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
            )}
          >
            <MapPin className="h-4 w-4" />
            Init
          </button>
          <button
            onClick={() => setActiveTool('objective')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors flex-1',
              !isInitTab ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
            )}
          >
            <BoxSelect className="h-4 w-4" />
            Challenge
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
        {isInitTab ? (
          <>
            {/* Sub-tool selector: Componente / Pin */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTool('component')}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded text-xs transition-colors',
                  activeTool === 'component'
                    ? 'bg-green-600/60 text-white'
                    : 'bg-gray-700/50 text-gray-400 hover:text-gray-300'
                )}
              >
                <BoxSelect className="h-3.5 w-3.5 inline mr-1" />
                Componente
              </button>
              <button
                onClick={() => setActiveTool('pin')}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded text-xs transition-colors',
                  activeTool === 'pin'
                    ? 'bg-cyan-600/60 text-white'
                    : 'bg-gray-700/50 text-gray-400 hover:text-gray-300'
                )}
              >
                <MapPin className="h-3.5 w-3.5 inline mr-1" />
                Pin
              </button>
            </div>

            {/* Init: Components section */}
            <div>
              <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                Componenti ({components.length})
              </h3>
              {activeTool === 'component' && (
                <p className="text-xs text-gray-500 mb-2">Trascina sull&apos;immagine per disegnare un componente.</p>
              )}
              {components.length === 0 && (
                <p className="text-xs text-gray-500 italic">Nessun componente.</p>
              )}
              <div className="space-y-1">
                {components.map(comp => (
                  <ComponentItem key={comp.id} component={comp} onEdit={editComponent} onDelete={deleteComponent} />
                ))}
              </div>
            </div>

            {/* Init: Pins section */}
            <div className="pt-2 border-t border-gray-700">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                Pin ({pins.length})
              </h3>
              {activeTool === 'pin' && (
                <p className="text-xs text-gray-500 mb-2">Clicca sull&apos;immagine per posizionare un pin.</p>
              )}
              {pins.length === 0 && (
                <p className="text-xs text-gray-500 italic">Nessun pin posizionato.</p>
              )}
              <div className="space-y-1">
                {pins.map(pin => (
                  <PinItem key={pin.id} pin={pin} onEdit={editPin} onDelete={deletePin} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Challenge: Steps section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs text-gray-400 uppercase tracking-wider">Step ({steps.length})</h3>
                <button
                  onClick={addStep}
                  className="text-gray-400 hover:text-white transition-colors p-0.5"
                  title="Aggiungi step"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {steps.length === 0 && (
                <p className="text-xs text-gray-500 italic">Nessuno step. Clicca + per crearne uno.</p>
              )}

              <div className="space-y-1">
                {steps.map((step, index) => (
                  <StepItem
                    key={step.id}
                    step={step}
                    index={index}
                    isExpanded={step.id === activeStepId}
                    isFirst={index === 0}
                    isLast={index === steps.length - 1}
                    onToggle={() => selectStep(step.id === activeStepId ? null : step.id)}
                    onDelete={() => deleteStep(step.id)}
                    onReorder={(dir) => reorderStep(step.id, dir)}
                    onUpdateStep={(data) => updateStep(step.id, data)}
                    onToggleTool={(tool) => toggleStepTool(step.id, tool)}
                    onAddObjective={(componentId) => addObjective(step.id, componentId)}
                    availableComponents={components}
                    onDeleteObjective={(objId) => deleteObjective(step.id, objId)}
                    onReorderObjective={(objId, dir) => reorderObjective(step.id, objId, dir)}
                    onEditObjective={editObjective}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="pt-3 border-t border-gray-700 space-y-2">
        <Button
          onClick={() => { applyConfig(); setApplied(true); setTimeout(() => setApplied(false), 2000); }}
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={!hasContent}
        >
          {applied ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {applied ? 'Configurazione applicata!' : 'Applica al simulatore'}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleSaveToFile} size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={!hasContent}>
            {saved ? <Check className="h-4 w-4 mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            {saved ? 'Salvato!' : 'Salva'}
          </Button>
          <Button onClick={handleLoadFromFile} variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700">
            {loaded ? <Check className="h-4 w-4 mr-1" /> : <FolderOpen className="h-4 w-4 mr-1" />}
            {loaded ? 'Caricato!' : 'Carica'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleDownloadJson} variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700" disabled={!hasContent}>
            <Download className="h-4 w-4 mr-1" /> JSON
          </Button>
          <Button onClick={handleCopyTypeScript} variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700" disabled={!hasContent}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? 'Copiato!' : 'TS'}
          </Button>
        </div>
      </div>
    </aside>
  );
};

// --- Step Item (accordion) ---

const StepItem = ({
  step, index, isExpanded, isFirst, isLast,
  onToggle, onDelete, onReorder, onUpdateStep, onToggleTool,
  onAddObjective, onDeleteObjective, onReorderObjective, onEditObjective,
  availableComponents,
}: {
  step: DraftStep;
  index: number;
  isExpanded: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onReorder: (dir: 'up' | 'down') => void;
  onUpdateStep: (data: Partial<Pick<DraftStep, 'title' | 'description'>>) => void;
  onToggleTool: (tool: Tool) => void;
  onAddObjective: (componentId: string) => void;
  onDeleteObjective: (objId: string) => void;
  onReorderObjective: (objId: string, dir: 'up' | 'down') => void;
  onEditObjective: (objId: string) => void;
  availableComponents: DraftComponent[];
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(step.title);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleTitleSave = () => {
    onUpdateStep({ title: titleValue || `Step ${index + 1}` });
    setEditingTitle(false);
  };

  const flagParts = step.objectives.map(o => o.flagPart || o.name.toUpperCase().replace(/\s+/g, '_')).join('');

  return (
    <div className={cn('rounded-lg border transition-colors', isExpanded ? 'border-blue-500/50 bg-gray-750' : 'border-gray-700 bg-gray-800/50')}>
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-1.5 cursor-pointer group" onClick={onToggle}>
        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
        <span className="text-xs text-gray-500 font-mono flex-shrink-0">{index + 1}.</span>
        {editingTitle ? (
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-gray-700 border border-gray-500 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500 min-w-0"
            autoFocus
          />
        ) : (
          <span className="text-sm truncate flex-1">{step.title || 'Senza nome'}</span>
        )}

        {/* Actions on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setEditingTitle(true); setTitleValue(step.title); }} className="text-gray-400 hover:text-white p-0.5" title="Rinomina">
            <Pencil className="h-3 w-3" />
          </button>
          {!isFirst && (
            <button onClick={() => onReorder('up')} className="text-gray-400 hover:text-white p-0.5" title="Sposta su">
              <ArrowUp className="h-3 w-3" />
            </button>
          )}
          {!isLast && (
            <button onClick={() => onReorder('down')} className="text-gray-400 hover:text-white p-0.5" title="Sposta giu">
              <ArrowDown className="h-3 w-3" />
            </button>
          )}
          <DeleteButton name={step.title || 'questo step'} onConfirm={onDelete} />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          {/* Description */}
          <div>
            <textarea
              value={step.description}
              onChange={(e) => onUpdateStep({ description: e.target.value })}
              placeholder="Descrizione dello step..."
              rows={2}
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Tool toggles */}
          <div>
            <span className="text-[10px] text-gray-500 uppercase">Tool disponibili</span>
            <div className="flex gap-1 mt-1">
              {ALL_TOOLS.map(tool => {
                const Icon = TOOL_ICONS[tool];
                const isActive = step.availableTools.includes(tool);
                return (
                  <button
                    key={tool}
                    onClick={() => onToggleTool(tool)}
                    className={cn(
                      'p-1 rounded transition-colors',
                      isActive ? 'bg-blue-600/60 text-white' : 'bg-gray-700/50 text-gray-500 hover:text-gray-300'
                    )}
                    title={TOOL_LABELS[tool]}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Objectives */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 uppercase">Obiettivi ({step.objectives.length})</span>
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="text-gray-400 hover:text-white transition-colors p-0.5"
                  title="Aggiungi obiettivo"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
                    {availableComponents.length === 0 ? (
                      <p className="px-3 py-1.5 text-xs text-gray-400 italic">Crea prima un componente nella tab Init</p>
                    ) : (
                      availableComponents.map(comp => (
                        <button
                          key={comp.id}
                          onClick={() => { onAddObjective(comp.id); setShowAddMenu(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-600 transition-colors flex items-center gap-2"
                        >
                          <div className="w-2.5 h-2.5 flex-shrink-0 border border-green-400/60 bg-green-500/15 rounded-sm" />
                          <span className="text-blue-300">{comp.name || 'Senza nome'}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-0.5 mt-1">
              {step.objectives.map((obj, oi) => (
                <ObjectiveItem
                  key={obj.id}
                  objective={obj}
                  isFirst={oi === 0}
                  isLast={oi === step.objectives.length - 1}
                  onEdit={() => onEditObjective(obj.id)}
                  onDelete={() => onDeleteObjective(obj.id)}
                  onReorder={(dir) => onReorderObjective(obj.id, dir)}
                />
              ))}
            </div>
          </div>

          {/* Computed flag */}
          {flagParts && (
            <div className="text-[10px] font-mono text-gray-500 truncate pt-1 border-t border-gray-700">
              flag{'{' + flagParts + '}'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Objective Item ---

const ObjectiveItem = ({
  objective, isFirst, isLast, onEdit, onDelete, onReorder,
}: {
  objective: DraftObjective;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReorder: (dir: 'up' | 'down') => void;
}) => (
  <div className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-gray-700/50 group">
    <span className="text-[10px] font-mono flex-shrink-0 text-blue-400">
      COM
    </span>
    <span className="text-xs truncate flex-1">{objective.name || 'Senza nome'}</span>
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
      {!isFirst && (
        <button onClick={() => onReorder('up')} className="text-gray-400 hover:text-white p-0.5">
          <ArrowUp className="h-2.5 w-2.5" />
        </button>
      )}
      {!isLast && (
        <button onClick={() => onReorder('down')} className="text-gray-400 hover:text-white p-0.5">
          <ArrowDown className="h-2.5 w-2.5" />
        </button>
      )}
      <button onClick={onEdit} className="text-gray-400 hover:text-white p-0.5">
        <Pencil className="h-2.5 w-2.5" />
      </button>
      <button onClick={onDelete} className="text-gray-400 hover:text-red-400 p-0.5">
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </div>
  </div>
);

// --- Component Item (Init) ---

const ComponentItem = ({
  component, onEdit, onDelete,
}: {
  component: DraftComponent;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) => (
  <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 group">
    <div className="w-3.5 h-3.5 flex-shrink-0 border-2 border-green-400/60 bg-green-500/15 rounded-sm" />
    <span className="text-sm truncate flex-1">{component.name || 'Senza nome'}</span>
    <button onClick={() => onEdit(component.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white p-0.5">
      <Pencil className="h-3.5 w-3.5" />
    </button>
    <DeleteButton name={component.name || 'questo componente'} onConfirm={() => onDelete(component.id)} />
  </div>
);

// --- Pin Item ---

const PinItem = ({
  pin, onEdit, onDelete,
}: {
  pin: DraftPin;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const color = PIN_TYPE_COLORS[pin.pinType] || PIN_TYPE_COLORS.custom;
  const typeLabel = PIN_TYPE_LABELS[pin.pinType] || pin.pinType.toUpperCase();

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 group">
      <div
        className={cn('w-3.5 h-3.5 flex-shrink-0 border-2', pin.shape === 'circle' ? 'rounded-full' : 'rounded-sm')}
        style={{ borderColor: color, backgroundColor: `${color}33` }}
      />
      <span className="text-sm truncate flex-1">{pin.label || 'Senza nome'}</span>
      <span className="text-[10px] px-1 rounded font-mono" style={{ color, backgroundColor: `${color}1a` }}>
        {typeLabel}
      </span>
      <button onClick={() => onEdit(pin.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white p-0.5">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <DeleteButton name={pin.label || 'questo pin'} onConfirm={() => onDelete(pin.id)} />
    </div>
  );
};

// --- Delete Button with AlertDialog ---

const DeleteButton = ({ name, onConfirm }: { name: string; onConfirm: () => void }) => (
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

export default SettingsSidebar;
