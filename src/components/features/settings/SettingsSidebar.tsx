// src/components/features/settings/SettingsSidebar.tsx
'use client';

import { useState } from 'react';
import { useSettingsStore, type DraftStep, type DraftObjective, type DraftComponent, type DraftPin, type SettingsTool, type PinLogic } from '@/store/settingsStore';
import { useTerminalSettingsStore } from '@/store/terminalSettingsStore';
import { ALL_TOOLS, type Tool } from '@/data/exercise';
import { cn } from '@/lib/utils';
import {
  BoxSelect, MapPin, Pencil, Trash2, Check, Save,
  Plus, ChevronDown, ChevronRight, ArrowUp, ArrowDown,
  Hand, Search, Wrench, Cable, TerminalSquare, RotateCcw, type LucideIcon,
} from 'lucide-react';
import TerminalSettingsPanel from './TerminalSettingsPanel';
import PresetSelector from './PresetSelector';
import { usePresetStore } from '@/store/presetStore';
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
    addObjective, addPinObjective, deleteObjective, reorderObjective, editObjective,
    pins, editPin, deletePin,
    saveToFile, resetAllConfig, resetInitComponents,
  } = useSettingsStore();

  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    // Write exercise config to file (needed by the simulator, which reads via /api/config/load)
    // and to localStorage. Also flush terminal config to localStorage.
    terminalStore.applyTerminalConfig();
    const result = await saveToFile();
    if (result.success) {
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    } else {
      alert(`Errore salvataggio configurazione: ${result.error}`);
    }
  };

  const isInitTab = activeTool === 'component' || activeTool === 'pin';
  const isTerminalTab = activeTool === 'terminal-config';

  const terminalStore = useTerminalSettingsStore();
  const presetStore = usePresetStore();

  const hasContent = steps.length > 0 || components.length > 0 || pins.length > 0;
  const hasAnyContent = hasContent || terminalStore.initialized;

  return (
    <aside className="flex flex-col gap-y-3 rounded-lg bg-gray-800 p-4 w-72 text-white max-h-[calc(100vh-8rem)] overflow-hidden">
      {/* Tab selector: Init / Challenge / Terminal */}
      <div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTool('component')}
            className={cn(
              'flex items-center gap-1 px-2 py-2 rounded-lg text-xs transition-colors flex-1',
              isInitTab ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            Init
          </button>
          <button
            onClick={() => setActiveTool('objective')}
            className={cn(
              'flex items-center gap-1 px-2 py-2 rounded-lg text-xs transition-colors flex-1',
              !isInitTab && !isTerminalTab ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
            )}
          >
            <BoxSelect className="h-3.5 w-3.5" />
            Challenge
          </button>
          <button
            onClick={() => setActiveTool('terminal-config')}
            className={cn(
              'flex items-center gap-1 px-2 py-2 rounded-lg text-xs transition-colors flex-1',
              isTerminalTab ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
            )}
          >
            <TerminalSquare className="h-3.5 w-3.5" />
            Terminal
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
        {isTerminalTab ? (
          <TerminalSettingsPanel />
        ) : isInitTab ? (
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

            {/* Reset Init button */}
            {(components.length > 0 || pins.length > 0) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-yellow-600/50 text-yellow-400 hover:text-white hover:bg-yellow-600 hover:border-yellow-600 text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Reset Init
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-gray-800 border-gray-600 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancellare tutti i componenti e pin?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      Questa azione eliminerà tutti i componenti e pin della tab Init.
                      Gli step e obiettivi non saranno toccati.
                      <br /><br />
                      <strong className="text-yellow-400">Questa azione non può essere annullata.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white">
                      Annulla
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={resetInitComponents}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      Reset Init
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Init: Components section — visible only on Componente sub-tool */}
            {activeTool === 'component' && (
              <div>
                <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Componenti ({components.length})
                </h3>
                <p className="text-xs text-gray-500 mb-2">Trascina sull&apos;immagine per disegnare un componente.</p>
                {components.length === 0 && (
                  <p className="text-xs text-gray-500 italic">Nessun componente.</p>
                )}
                <div className="space-y-1">
                  {components.map(comp => (
                    <ComponentItem key={comp.id} component={comp} onEdit={editComponent} onDelete={deleteComponent} />
                  ))}
                </div>
              </div>
            )}

            {/* Init: Pins section — visible only on Pin sub-tool */}
            {activeTool === 'pin' && (
              <div>
                <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Pin ({pins.length})
                </h3>
                <p className="text-xs text-gray-500 mb-2">Clicca sull&apos;immagine per posizionare un pin.</p>
                {pins.length === 0 && (
                  <p className="text-xs text-gray-500 italic">Nessun pin posizionato.</p>
                )}
                <div className="space-y-1">
                  {pins.map(pin => (
                    <PinItem key={pin.id} pin={pin} onEdit={editPin} onDelete={deletePin} />
                  ))}
                </div>
              </div>
            )}
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
                    onAddPinObjective={(pinIds, logic) => addPinObjective(step.id, pinIds, logic)}
                    availableComponents={components}
                    availablePins={pins}
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

      {/* Preset selector */}
      <div className="pt-2 pb-1 border-t border-gray-700">
        <PresetSelector />
      </div>

      {/* Action buttons */}
      <div className="pt-3 border-t border-gray-700 space-y-2">
        <Button
          onClick={handleApply}
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={!hasAnyContent}
        >
          {applied ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {applied ? 'Configurazione applicata!' : 'Applica al simulatore'}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-red-600/50 text-red-400 hover:text-white hover:bg-red-600 hover:border-red-600"
              disabled={!hasAnyContent}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset configurazione
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-gray-800 border-gray-600 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Ripulire tutte le configurazioni?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Questa azione cancellerà tutti i componenti, pin, step, obiettivi e la configurazione del terminale (comandi, filesystem, boot, flag).
                Anche l&apos;immagine PCB personalizzata verrà rimossa.
                <br /><br />
                <strong className="text-red-400">Questa azione non può essere annullata.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white">
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { resetAllConfig(); terminalStore.resetAll(); presetStore.clearActivePreset(); }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Reset completo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  );
};

// --- Step Item (accordion) ---

const StepItem = ({
  step, index, isExpanded, isFirst, isLast,
  onToggle, onDelete, onReorder, onUpdateStep, onToggleTool,
  onAddObjective, onAddPinObjective, onDeleteObjective, onReorderObjective, onEditObjective,
  availableComponents, availablePins,
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
  onAddPinObjective: (pinIds: string[], logic: PinLogic) => void;
  onDeleteObjective: (objId: string) => void;
  onReorderObjective: (objId: string, dir: 'up' | 'down') => void;
  onEditObjective: (objId: string) => void;
  availableComponents: DraftComponent[];
  availablePins: DraftPin[];
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(step.title);
  const [showAddMenu, setShowAddMenu] = useState<null | 'root' | 'component' | 'pin'>(null);
  const [selectedPinIds, setSelectedPinIds] = useState<string[]>([]);
  const [pinLogic, setPinLogic] = useState<PinLogic>('AND');

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
                  onClick={() => setShowAddMenu(showAddMenu ? null : 'root')}
                  className="text-gray-400 hover:text-white transition-colors p-0.5"
                  title="Aggiungi obiettivo"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
                    {showAddMenu === 'root' && (
                      <>
                        <button
                          onClick={() => setShowAddMenu('component')}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-600 transition-colors flex items-center gap-2"
                        >
                          <BoxSelect className="h-3 w-3 text-blue-400" />
                          <span className="text-white">Componente</span>
                          <ChevronRight className="h-3 w-3 text-gray-400 ml-auto" />
                        </button>
                        <button
                          onClick={() => { setShowAddMenu('pin'); setSelectedPinIds([]); setPinLogic('AND'); }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-600 transition-colors flex items-center gap-2"
                        >
                          <MapPin className="h-3 w-3 text-cyan-400" />
                          <span className="text-white">Pin</span>
                          <ChevronRight className="h-3 w-3 text-gray-400 ml-auto" />
                        </button>
                      </>
                    )}
                    {showAddMenu === 'component' && (
                      <>
                        <button
                          onClick={() => setShowAddMenu('root')}
                          className="w-full text-left px-3 py-1 text-[10px] text-gray-400 hover:text-white hover:bg-gray-600 transition-colors flex items-center gap-1 border-b border-gray-600 mb-1"
                        >
                          <ArrowUp className="h-2.5 w-2.5 rotate-[-90deg]" />
                          Indietro
                        </button>
                        {availableComponents.length === 0 ? (
                          <p className="px-3 py-1.5 text-xs text-gray-400 italic">Crea prima un componente nella tab Init</p>
                        ) : (
                          availableComponents.map(comp => (
                            <button
                              key={comp.id}
                              onClick={() => { onAddObjective(comp.id); setShowAddMenu(null); }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-600 transition-colors flex items-center gap-2"
                            >
                              <div className="w-2.5 h-2.5 flex-shrink-0 border border-green-400/60 bg-green-500/15 rounded-sm" />
                              <span className="text-blue-300">{comp.name || 'Senza nome'}</span>
                            </button>
                          ))
                        )}
                      </>
                    )}
                    {showAddMenu === 'pin' && (
                      <>
                        <button
                          onClick={() => setShowAddMenu('root')}
                          className="w-full text-left px-3 py-1 text-[10px] text-gray-400 hover:text-white hover:bg-gray-600 transition-colors flex items-center gap-1 border-b border-gray-600 mb-1"
                        >
                          <ArrowUp className="h-2.5 w-2.5 rotate-[-90deg]" />
                          Indietro
                        </button>
                        {availablePins.length === 0 ? (
                          <p className="px-3 py-1.5 text-xs text-gray-400 italic">Crea prima un pin nella tab Init</p>
                        ) : (
                          <>
                            <div className="max-h-[180px] overflow-y-auto">
                              {availablePins.map(pin => {
                                const checked = selectedPinIds.includes(pin.id);
                                const color = PIN_TYPE_COLORS[pin.pinType] || PIN_TYPE_COLORS.custom;
                                return (
                                  <label
                                    key={pin.id}
                                    className="w-full px-3 py-1.5 text-xs hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => setSelectedPinIds(prev =>
                                        checked ? prev.filter(id => id !== pin.id) : [...prev, pin.id]
                                      )}
                                      className="accent-cyan-500 h-3 w-3 flex-shrink-0"
                                    />
                                    <div
                                      className={cn('w-2.5 h-2.5 flex-shrink-0 border', pin.shape === 'circle' ? 'rounded-full' : 'rounded-sm')}
                                      style={{ borderColor: color, backgroundColor: `${color}33` }}
                                    />
                                    <span className="text-cyan-300 truncate">{pin.label || pin.pinType.toUpperCase()}</span>
                                    <span className="text-[10px] font-mono ml-auto" style={{ color }}>
                                      {PIN_TYPE_LABELS[pin.pinType] || pin.pinType.toUpperCase()}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                            <div className="px-3 pt-1.5 pb-1 border-t border-gray-600 mt-1 space-y-1.5">
                              {selectedPinIds.length >= 2 && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400">Logica:</span>
                                  <button
                                    onClick={() => setPinLogic('AND')}
                                    className={cn(
                                      'px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
                                      pinLogic === 'AND' ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-gray-400 hover:text-white'
                                    )}
                                  >
                                    AND
                                  </button>
                                  <button
                                    onClick={() => setPinLogic('OR')}
                                    className={cn(
                                      'px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
                                      pinLogic === 'OR' ? 'bg-cyan-600 text-white' : 'bg-gray-600 text-gray-400 hover:text-white'
                                    )}
                                  >
                                    OR
                                  </button>
                                </div>
                              )}
                              <button
                                onClick={() => { onAddPinObjective(selectedPinIds, pinLogic); setShowAddMenu(null); setSelectedPinIds([]); }}
                                disabled={selectedPinIds.length === 0}
                                className={cn(
                                  'w-full px-2 py-1 rounded text-xs font-medium transition-colors',
                                  selectedPinIds.length > 0
                                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                )}
                              >
                                Aggiungi {selectedPinIds.length > 0 ? `(${selectedPinIds.length})` : ''}
                              </button>
                            </div>
                          </>
                        )}
                      </>
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
    <span className={cn('text-[10px] font-mono flex-shrink-0', objective.type === 'pin' ? 'text-cyan-400' : 'text-blue-400')}>
      {objective.type === 'pin' ? `PIN\u00B7${objective.pinLogic}` : 'COM'}
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
