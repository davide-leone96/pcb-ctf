// src/components/features/settings/CommandEditorPopup.tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { DraftCommand, DraftConditionalRule, DraftFlagUnlock, DraftBootStage, DraftFlagPart } from '@/store/terminalSettingsStore';
import {
  X, Plus, Trash2, ChevronDown, ChevronRight, Zap, Flag, Code, FileText, Settings2,
} from 'lucide-react';

interface CommandEditorPopupProps {
  command: DraftCommand;
  onUpdate: (data: Partial<DraftCommand>) => void;
  onClose: () => void;
  availableBootStages: DraftBootStage[];
  availableFlags: DraftFlagPart[];
}

const CommandEditorPopup = ({ command, onUpdate, onClose, availableBootStages, availableFlags }: CommandEditorPopupProps) => {
  const [activeTab, setActiveTab] = useState<'general' | 'output' | 'effects' | 'constraints'>('general');

  const generateId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-600 rounded-lg shadow-2xl w-[460px] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-white">
              {command.name ? `Modifica: ${command.name}` : 'Nuovo comando'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 px-4 pt-2">
          {([
            { id: 'general', label: 'Generale', icon: Settings2 },
            { id: 'output', label: 'Output', icon: FileText },
            { id: 'effects', label: 'Effetti', icon: Zap },
            { id: 'constraints', label: 'Vincoli', icon: Flag },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                activeTab === id
                  ? 'bg-green-600/50 text-white'
                  : 'bg-gray-700/40 text-gray-400 hover:text-gray-300'
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {activeTab === 'general' && (
            <GeneralTab command={command} onUpdate={onUpdate} />
          )}
          {activeTab === 'output' && (
            <OutputTab command={command} onUpdate={onUpdate} generateId={generateId} />
          )}
          {activeTab === 'effects' && (
            <EffectsTab command={command} onUpdate={onUpdate} generateId={generateId} availableFlags={availableFlags} availableBootStages={availableBootStages} />
          )}
          {activeTab === 'constraints' && (
            <ConstraintsTab command={command} onUpdate={onUpdate} availableBootStages={availableBootStages} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// GENERAL TAB
// ============================================

const GeneralTab = ({ command, onUpdate }: { command: DraftCommand; onUpdate: (data: Partial<DraftCommand>) => void }) => {
  const [aliasInput, setAliasInput] = useState('');

  const handleAddAlias = () => {
    if (!aliasInput.trim()) return;
    onUpdate({ aliases: [...command.aliases, aliasInput.trim()] });
    setAliasInput('');
  };

  const handleRemoveAlias = (idx: number) => {
    onUpdate({ aliases: command.aliases.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      <EditorField label="Nome comando" value={command.name} onChange={(v) => onUpdate({ name: v })} mono placeholder="es: cat, help, scan" />
      <EditorField label="Descrizione" value={command.description} onChange={(v) => onUpdate({ description: v })} placeholder="Descrizione del comando" />

      {/* Aliases */}
      <div>
        <label className="text-[10px] text-gray-500 block mb-0.5">Aliases ({command.aliases.length})</label>
        {command.aliases.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {command.aliases.map((alias, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-700 text-[10px] font-mono text-gray-300">
                {alias}
                <button onClick={() => handleRemoveAlias(i)} className="text-gray-500 hover:text-red-400">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-1">
          <input
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddAlias(); }}
            placeholder="Aggiungi alias..."
            className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-green-500 min-w-0"
          />
          <button onClick={handleAddAlias} className="text-gray-400 hover:text-green-400 p-1">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// OUTPUT TAB
// ============================================

const OutputTab = ({ command, onUpdate, generateId }: { command: DraftCommand; onUpdate: (data: Partial<DraftCommand>) => void; generateId: (prefix: string) => string }) => (
  <div className="space-y-3">
    {/* Output type */}
    <div>
      <label className="text-[10px] text-gray-500 block mb-0.5">Tipo output</label>
      <div className="flex gap-1">
        {(['none', 'static', 'conditional'] as const).map(type => (
          <button
            key={type}
            onClick={() => onUpdate({ outputType: type })}
            className={cn('flex-1 px-2 py-1.5 rounded text-xs transition-colors capitalize', command.outputType === type ? 'bg-green-600/50 text-white' : 'bg-gray-700/40 text-gray-400 hover:text-gray-300')}
          >
            {type === 'none' ? 'Nessuno' : type === 'static' ? 'Statico' : 'Condizionale'}
          </button>
        ))}
      </div>
    </div>

    {/* Static output */}
    {command.outputType === 'static' && (
      <div>
        <label className="text-[10px] text-gray-500 block mb-0.5">Output statico</label>
        <textarea
          value={command.staticLines.join('\n')}
          onChange={(e) => onUpdate({ staticLines: e.target.value.split('\n') })}
          rows={6}
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-[10px] text-gray-300 font-mono placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
          placeholder="Una riga per linea..."
        />
      </div>
    )}

    {/* Conditional output */}
    {command.outputType === 'conditional' && (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-gray-500">Regole condizionali ({command.conditionalRules.length})</label>
          <button
            onClick={() => onUpdate({
              conditionalRules: [...command.conditionalRules, {
                id: generateId('rule'),
                argIndex: 0,
                matchType: 'equals',
                matchValue: '',
                outputLines: [],
                flagUnlockId: '',
              }],
            })}
            className="text-gray-400 hover:text-green-400 p-0.5"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {command.conditionalRules.map((rule, i) => (
          <ConditionalRuleEditor
            key={rule.id}
            rule={rule}
            index={i}
            onUpdate={(data) => {
              const rules = [...command.conditionalRules];
              rules[i] = { ...rules[i], ...data };
              onUpdate({ conditionalRules: rules });
            }}
            onDelete={() => onUpdate({ conditionalRules: command.conditionalRules.filter((_, j) => j !== i) })}
          />
        ))}

        {/* Default output */}
        <div className="pt-2 border-t border-gray-700">
          <label className="text-[10px] text-gray-500 block mb-0.5">Output default (quando nessuna regola matcha)</label>
          <textarea
            value={command.defaultOutputLines.join('\n')}
            onChange={(e) => onUpdate({ defaultOutputLines: e.target.value.split('\n') })}
            rows={3}
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-[10px] text-gray-300 font-mono placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
            placeholder="Output quando nessuna condizione corrisponde..."
          />
        </div>
      </div>
    )}
  </div>
);

const ConditionalRuleEditor = ({
  rule, index, onUpdate, onDelete,
}: {
  rule: DraftConditionalRule;
  index: number;
  onUpdate: (data: Partial<DraftConditionalRule>) => void;
  onDelete: () => void;
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded border border-gray-700 bg-gray-750/50">
      <div className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer group" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
        <span className="text-[10px] text-gray-500 font-mono">#{index + 1}</span>
        <span className="text-xs text-gray-300 truncate flex-1">
          arg[{rule.argIndex}] {rule.matchType} &quot;{rule.matchValue}&quot;
        </span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 p-0.5">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {expanded && (
        <div className="px-2 pb-2 space-y-1.5">
          <div className="grid grid-cols-3 gap-1">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Arg Index</label>
              <input
                type="number"
                value={rule.argIndex}
                onChange={(e) => onUpdate({ argIndex: parseInt(e.target.value) || 0 })}
                className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Match</label>
              <select
                value={rule.matchType}
                onChange={(e) => onUpdate({ matchType: e.target.value as any })}
                className="w-full bg-gray-700/50 border border-gray-600 rounded px-1 py-1 text-xs text-white focus:outline-none focus:border-green-500"
              >
                <option value="equals">Equals</option>
                <option value="contains">Contains</option>
                <option value="regex">Regex</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Valore</label>
              <input
                value={rule.matchValue}
                onChange={(e) => onUpdate({ matchValue: e.target.value })}
                className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Output</label>
            <textarea
              value={rule.outputLines.join('\n')}
              onChange={(e) => onUpdate({ outputLines: e.target.value.split('\n') })}
              rows={3}
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-[10px] text-gray-300 font-mono placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
              placeholder="Output quando questa condizione matcha..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// EFFECTS TAB
// ============================================

const EffectsTab = ({
  command, onUpdate, generateId, availableFlags, availableBootStages,
}: {
  command: DraftCommand;
  onUpdate: (data: Partial<DraftCommand>) => void;
  generateId: (prefix: string) => string;
  availableFlags: DraftFlagPart[];
  availableBootStages: DraftBootStage[];
}) => {
  const [newStateKey, setNewStateKey] = useState('');
  const [newStateVal, setNewStateVal] = useState('');

  const handleAddState = () => {
    if (!newStateKey.trim()) return;
    onUpdate({ stateChanges: { ...command.stateChanges, [newStateKey]: newStateVal } });
    setNewStateKey('');
    setNewStateVal('');
  };

  return (
    <div className="space-y-3">
      {/* Flag unlocks */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-gray-500 uppercase">Flag Unlock ({command.flagUnlocks.length})</label>
          <button
            onClick={() => onUpdate({
              flagUnlocks: [...command.flagUnlocks, {
                id: generateId('fu'),
                flagId: '',
                conditional: false,
                argIndex: 0,
                matchType: 'equals',
                matchValue: '',
              }],
            })}
            className="text-gray-400 hover:text-green-400 p-0.5"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {command.flagUnlocks.length === 0 && (
          <p className="text-xs text-gray-500 italic">Nessun flag unlock.</p>
        )}

        {command.flagUnlocks.map((fu, i) => (
          <FlagUnlockEditor
            key={fu.id}
            unlock={fu}
            availableFlags={availableFlags}
            onUpdate={(data) => {
              const unlocks = [...command.flagUnlocks];
              unlocks[i] = { ...unlocks[i], ...data };
              onUpdate({ flagUnlocks: unlocks });
            }}
            onDelete={() => onUpdate({ flagUnlocks: command.flagUnlocks.filter((_, j) => j !== i) })}
          />
        ))}
      </div>

      {/* State changes */}
      <div className="pt-2 border-t border-gray-700">
        <label className="text-[10px] text-gray-500 uppercase block mb-1">State Changes ({Object.keys(command.stateChanges).length})</label>
        <div className="space-y-0.5">
          {Object.entries(command.stateChanges).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-cyan-400 flex-shrink-0">{key}</span>
              <span className="text-[10px] text-gray-500">=</span>
              <input
                value={val}
                onChange={(e) => onUpdate({ stateChanges: { ...command.stateChanges, [key]: e.target.value } })}
                className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1 py-0.5 text-[10px] text-gray-300 font-mono focus:outline-none focus:border-green-500 min-w-0"
              />
              <button onClick={() => {
                const s = { ...command.stateChanges };
                delete s[key];
                onUpdate({ stateChanges: s });
              }} className="text-gray-400 hover:text-red-400 p-0.5 flex-shrink-0">
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <input
            value={newStateKey}
            onChange={(e) => setNewStateKey(e.target.value)}
            placeholder="key"
            className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1 py-0.5 text-[10px] text-gray-300 font-mono focus:outline-none focus:border-green-500 min-w-0"
          />
          <span className="text-[10px] text-gray-500">=</span>
          <input
            value={newStateVal}
            onChange={(e) => setNewStateVal(e.target.value)}
            placeholder="value"
            className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1 py-0.5 text-[10px] text-gray-300 font-mono focus:outline-none focus:border-green-500 min-w-0"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddState(); }}
          />
          <button onClick={handleAddState} className="text-gray-400 hover:text-green-400 p-0.5 flex-shrink-0">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

const FlagUnlockEditor = ({
  unlock, availableFlags, onUpdate, onDelete,
}: {
  unlock: DraftFlagUnlock;
  availableFlags: DraftFlagPart[];
  onUpdate: (data: Partial<DraftFlagUnlock>) => void;
  onDelete: () => void;
}) => (
  <div className="rounded border border-gray-700 bg-gray-750/50 p-2 mb-1.5 space-y-1.5">
    <div className="flex items-center gap-1">
      <Flag className="h-3 w-3 text-amber-400 flex-shrink-0" />
      <select
        value={unlock.flagId}
        onChange={(e) => onUpdate({ flagId: e.target.value })}
        className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-green-500"
      >
        <option value="">-- Seleziona flag --</option>
        {availableFlags.map(f => (
          <option key={f.id} value={f.id}>{f.id} ({f.part})</option>
        ))}
      </select>
      <button onClick={onDelete} className="text-gray-400 hover:text-red-400 p-0.5 flex-shrink-0">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>

    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={unlock.conditional}
        onChange={(e) => onUpdate({ conditional: e.target.checked })}
        className="accent-green-500 h-3 w-3"
      />
      <span className="text-[10px] text-gray-400">Condizionale</span>
    </label>

    {unlock.conditional && (
      <div className="grid grid-cols-3 gap-1">
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Arg</label>
          <input
            type="number"
            value={unlock.argIndex}
            onChange={(e) => onUpdate({ argIndex: parseInt(e.target.value) || 0 })}
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-1 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Match</label>
          <select
            value={unlock.matchType}
            onChange={(e) => onUpdate({ matchType: e.target.value as any })}
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-green-500"
          >
            <option value="equals">Equals</option>
            <option value="contains">Contains</option>
            <option value="regex">Regex</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Valore</label>
          <input
            value={unlock.matchValue}
            onChange={(e) => onUpdate({ matchValue: e.target.value })}
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-1 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-green-500"
          />
        </div>
      </div>
    )}
  </div>
);

// ============================================
// CONSTRAINTS TAB
// ============================================

const ConstraintsTab = ({
  command, onUpdate, availableBootStages,
}: {
  command: DraftCommand;
  onUpdate: (data: Partial<DraftCommand>) => void;
  availableBootStages: DraftBootStage[];
}) => (
  <div className="space-y-3">
    {/* Boot stages */}
    <div>
      <label className="text-[10px] text-gray-500 block mb-1">Boot stages consentiti</label>
      {availableBootStages.length === 0 ? (
        <p className="text-xs text-gray-500 italic">Nessun boot stage definito.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {availableBootStages.map(stage => {
            const isActive = command.bootStages.includes(stage.id);
            return (
              <button
                key={stage.id}
                onClick={() => onUpdate({
                  bootStages: isActive
                    ? command.bootStages.filter(s => s !== stage.id)
                    : [...command.bootStages, stage.id],
                })}
                className={cn(
                  'px-2 py-1 rounded text-[10px] font-mono transition-colors',
                  isActive ? 'bg-blue-600/50 text-white' : 'bg-gray-700/40 text-gray-500 hover:text-gray-300'
                )}
              >
                {stage.name || stage.id}
              </button>
            );
          })}
        </div>
      )}
      {command.bootStages.length === 0 && availableBootStages.length > 0 && (
        <p className="text-[10px] text-gray-500 mt-1 italic">Nessun vincolo = disponibile in tutti gli stage</p>
      )}
    </div>

    {/* Arguments */}
    <div className="pt-2 border-t border-gray-700">
      <label className="text-[10px] text-gray-500 uppercase block mb-1">Argomenti</label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Min args</label>
          <input
            type="number"
            value={command.minArgs}
            onChange={(e) => onUpdate({ minArgs: parseInt(e.target.value) || 0 })}
            min={0}
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-0.5">Max args (-1 = illimitati)</label>
          <input
            type="number"
            value={command.maxArgs}
            onChange={(e) => onUpdate({ maxArgs: parseInt(e.target.value) ?? -1 })}
            min={-1}
            className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-green-500"
          />
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// SHARED: Editor Field
// ============================================

const EditorField = ({
  label, value, onChange, mono, placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  placeholder?: string;
}) => (
  <div>
    <label className="text-[10px] text-gray-500 block mb-0.5">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500',
        mono && 'font-mono'
      )}
    />
  </div>
);

export default CommandEditorPopup;
