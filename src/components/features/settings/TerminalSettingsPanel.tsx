// src/components/features/settings/TerminalSettingsPanel.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTerminalSettingsStore, type TerminalSection, type DraftCommand, type DraftFlagPart, type DraftBootStage, type DraftFilesystemEntry, type DraftTab } from '@/store/terminalSettingsStore';
import { cn } from '@/lib/utils';
import terminalConfig from '@/config/terminal.config';
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, Check,
  ArrowUp, ArrowDown, Copy, Terminal, Flag, Cpu, FolderTree, Layers,
  FileText, Folder, Code, Zap, Play, Square,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import CommandEditorPopup from './CommandEditorPopup';

// ============================================
// SECTION CONFIG
// ============================================

const SECTIONS: { id: TerminalSection; label: string; icon: typeof Terminal }[] = [
  { id: 'commands', label: 'Comandi', icon: Terminal },
  { id: 'boot', label: 'Boot', icon: Cpu },
  { id: 'filesystem', label: 'Filesystem', icon: FolderTree },
  { id: 'tabs', label: 'Tab', icon: Layers },
  { id: 'flags', label: 'Flag', icon: Flag },
];

// ============================================
// MAIN PANEL
// ============================================

const TerminalSettingsPanel = () => {
  const store = useTerminalSettingsStore();

  // Initialize from static config if store has never been hydrated with data
  // (persist middleware auto-rehydrates draft state from localStorage on mount)
  useEffect(() => {
    if (!store.initialized) {
      store.loadFromTerminalConfig(terminalConfig);
    }
    // Migrate persisted builtin commands → custom (localStorage rehydration)
    store.normalizeBuiltinCommands();
  }, [store.initialized]);

  return (
    <div className="space-y-3">
      {/* Section navigation */}
      <div className="flex items-center gap-1">
        <div className="flex flex-wrap gap-1 flex-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => store.setActiveSection(id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                store.activeSection === id
                  ? 'bg-green-600/60 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:text-gray-300'
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => store.setPreviewOpen(!store.previewOpen)}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors flex-shrink-0',
            store.previewOpen
              ? 'bg-green-700/60 text-green-300 ring-1 ring-green-600/50'
              : 'bg-gray-700/50 text-gray-400 hover:text-gray-300'
          )}
          title={store.previewOpen ? 'Chiudi preview terminale' : 'Apri preview terminale'}
        >
          {store.previewOpen ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          Preview
        </button>
      </div>

      {/* Section content */}
      {store.activeSection === 'commands' && <CommandsSection />}
      {store.activeSection === 'boot' && <BootSection />}
      {store.activeSection === 'filesystem' && <FilesystemSection />}
      {store.activeSection === 'tabs' && <TabsSection />}
      {store.activeSection === 'flags' && <FlagsSection />}
    </div>
  );
};

// ============================================
// TAB SELECTOR (shared by commands, boot, filesystem)
// ============================================

const TabSelector = ({ activeTabId, onSelect }: { activeTabId: string; onSelect: (id: string) => void }) => {
  const tabs = useTerminalSettingsStore(s => s.tabs);
  if (tabs.length <= 1) return null;

  return (
    <div className="flex gap-1 mb-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={cn(
            'px-2 py-1 rounded text-xs transition-colors',
            activeTabId === tab.id
              ? 'bg-green-600/40 text-white'
              : 'bg-gray-700/40 text-gray-400 hover:text-gray-300'
          )}
        >
          {tab.name}
        </button>
      ))}
    </div>
  );
};

// ============================================
// COMMANDS SECTION
// ============================================

const CommandsSection = () => {
  const { commands, activeTabId, setActiveTabId, addCommand, deleteCommand, duplicateCommand, editingCommandId, setEditingCommandId, updateCommand, tabs, bootStages } = useTerminalSettingsStore();
  const tabCommands = commands.filter(c => c.tabId === activeTabId);
  const editingCommand = editingCommandId ? commands.find(c => c.id === editingCommandId) : null;

  return (
    <div>
      <TabSelector activeTabId={activeTabId} onSelect={setActiveTabId} />

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs text-gray-400 uppercase tracking-wider">
          Comandi ({tabCommands.length})
        </h3>
        <button
          onClick={() => addCommand(activeTabId)}
          className="text-gray-400 hover:text-white transition-colors p-0.5"
          title="Aggiungi comando"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {tabCommands.length === 0 && (
        <p className="text-xs text-gray-500 italic">Nessun comando per questo tab.</p>
      )}

      <div className="space-y-1">
        {tabCommands.map(cmd => (
          <CommandItem
            key={cmd.id}
            command={cmd}
            onEdit={() => setEditingCommandId(cmd.id)}
            onDelete={() => deleteCommand(cmd.id)}
            onDuplicate={() => duplicateCommand(cmd.id)}
          />
        ))}
      </div>

      {/* Command editor popup */}
      {editingCommand && (
        <CommandEditorPopup
          command={editingCommand}
          onUpdate={(data) => updateCommand(editingCommand.id, data)}
          onClose={() => setEditingCommandId(null)}
          availableBootStages={bootStages.filter(b => b.tabId === activeTabId)}
          availableFlags={useTerminalSettingsStore.getState().flagParts}
        />
      )}
    </div>
  );
};

const CommandItem = ({
  command, onEdit, onDelete, onDuplicate,
}: {
  command: DraftCommand;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) => (
  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-gray-700/50 group">
    <span className="text-xs font-mono truncate flex-1 text-green-300">{command.name || '<vuoto>'}</span>
    {command.flagUnlocks.length > 0 && (
      <Flag className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
    )}
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
      <button onClick={onEdit} className="text-gray-400 hover:text-white p-0.5" title="Modifica">
        <Pencil className="h-3 w-3" />
      </button>
      <button onClick={onDuplicate} className="text-gray-400 hover:text-blue-400 p-0.5" title="Duplica">
        <Copy className="h-3 w-3" />
      </button>
      <button onClick={onDelete} className="text-gray-400 hover:text-red-400 p-0.5" title="Elimina">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  </div>
);

// ============================================
// FLAGS SECTION
// ============================================

export const FlagsSection = () => {
  const { flagParts, completeFlag, addFlagPart, updateFlagPart, deleteFlagPart, updateCompleteFlag } = useTerminalSettingsStore();

  return (
    <div className="space-y-3">
      {/* Complete flag */}
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Flag completa</label>
        <input
          type="text"
          value={completeFlag}
          onChange={(e) => updateCompleteFlag(e.target.value)}
          placeholder="flag{...}"
          className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1.5 text-xs text-amber-300 font-mono placeholder-gray-500 focus:outline-none focus:border-green-500"
        />
      </div>

      {/* Flag parts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs text-gray-400 uppercase tracking-wider">
            Parti ({flagParts.length})
          </h3>
          <button
            onClick={addFlagPart}
            className="text-gray-400 hover:text-white transition-colors p-0.5"
            title="Aggiungi parte flag"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {flagParts.length === 0 && (
          <p className="text-xs text-gray-500 italic">Nessuna parte flag.</p>
        )}

        <div className="space-y-2">
          {flagParts.map((fp, i) => (
            <FlagPartItem
              key={fp.id}
              flagPart={fp}
              index={i}
              onUpdate={(data) => updateFlagPart(fp.id, data)}
              onDelete={() => deleteFlagPart(fp.id)}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      {flagParts.length > 0 && (
        <div className="pt-2 border-t border-gray-700">
          <span className="text-[10px] text-gray-500 uppercase">Preview parti</span>
          <div className="text-xs font-mono text-amber-300/70 mt-1">
            {flagParts.map(f => f.part).join(' + ')}
          </div>
        </div>
      )}
    </div>
  );
};

export const FlagPartItem = ({
  flagPart, index, onUpdate, onDelete,
}: {
  flagPart: DraftFlagPart;
  index: number;
  onUpdate: (data: Partial<DraftFlagPart>) => void;
  onDelete: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded border border-gray-700 bg-gray-800/50">
      <div className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer group" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
        <span className="text-[10px] text-gray-500 font-mono">{index + 1}.</span>
        <span className="text-xs font-mono text-amber-300 truncate flex-1">{flagPart.id || '<id>'}</span>
        <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{flagPart.part}</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 p-0.5">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {expanded && (
        <div className="px-2 pb-2 space-y-1.5">
          <FieldInput label="ID" value={flagPart.id} onChange={(v) => onUpdate({ id: v })} mono />
          <FieldInput label="Part" value={flagPart.part} onChange={(v) => onUpdate({ part: v })} mono />
          <FieldInput label="Descrizione" value={flagPart.description} onChange={(v) => onUpdate({ description: v })} />
          <FieldInput label="Hint" value={flagPart.hint} onChange={(v) => onUpdate({ hint: v })} />
        </div>
      )}
    </div>
  );
};

// ============================================
// BOOT SECTION
// ============================================

const BootSection = () => {
  const { bootStages, activeTabId, setActiveTabId, addBootStage, updateBootStage, deleteBootStage, reorderBootStage } = useTerminalSettingsStore();
  const tabStages = bootStages.filter(b => b.tabId === activeTabId);

  return (
    <div>
      <TabSelector activeTabId={activeTabId} onSelect={setActiveTabId} />

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs text-gray-400 uppercase tracking-wider">
          Boot Stages ({tabStages.length})
        </h3>
        <button
          onClick={() => addBootStage(activeTabId)}
          className="text-gray-400 hover:text-white transition-colors p-0.5"
          title="Aggiungi boot stage"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {tabStages.length === 0 && (
        <p className="text-xs text-gray-500 italic">Nessun boot stage per questo tab.</p>
      )}

      <div className="space-y-2">
        {tabStages.map((stage, i) => (
          <BootStageItem
            key={stage.id}
            stage={stage}
            index={i}
            isFirst={i === 0}
            isLast={i === tabStages.length - 1}
            allStages={tabStages}
            onUpdate={(data) => updateBootStage(stage.id, data)}
            onDelete={() => deleteBootStage(stage.id)}
            onReorder={(dir) => reorderBootStage(stage.id, dir)}
          />
        ))}
      </div>
    </div>
  );
};

const BootStageItem = ({
  stage, index, isFirst, isLast, allStages, onUpdate, onDelete, onReorder,
}: {
  stage: DraftBootStage;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  allStages: DraftBootStage[];
  onUpdate: (data: Partial<DraftBootStage>) => void;
  onDelete: () => void;
  onReorder: (dir: 'up' | 'down') => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded border border-gray-700 bg-gray-800/50">
      <div className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer group" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
        <Cpu className="h-3 w-3 text-blue-400 flex-shrink-0" />
        <span className="text-xs truncate flex-1">{stage.name || stage.id}</span>
        {stage.nextStage && (
          <span className="text-[10px] text-gray-500 font-mono">&rarr; {stage.nextStage}</span>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
          {!isFirst && <button onClick={() => onReorder('up')} className="text-gray-400 hover:text-white p-0.5"><ArrowUp className="h-3 w-3" /></button>}
          {!isLast && <button onClick={() => onReorder('down')} className="text-gray-400 hover:text-white p-0.5"><ArrowDown className="h-3 w-3" /></button>}
          <button onClick={onDelete} className="text-gray-400 hover:text-red-400 p-0.5"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
      {expanded && (
        <div className="px-2 pb-2 space-y-1.5">
          <FieldInput label="ID" value={stage.id} onChange={(v) => onUpdate({ id: v })} mono />
          <FieldInput label="Nome" value={stage.name} onChange={(v) => onUpdate({ name: v })} />
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Next Stage</label>
            <select
              value={stage.nextStage}
              onChange={(e) => onUpdate({ nextStage: e.target.value })}
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-green-500"
            >
              <option value="">-- Nessuno (ultimo stage) --</option>
              {allStages.filter(s => s.id !== stage.id).map(s => (
                <option key={s.id} value={s.id}>{s.name || s.id}</option>
              ))}
            </select>
          </div>
          <FieldInput label="Durata (ms)" value={String(stage.duration)} onChange={(v) => onUpdate({ duration: parseInt(v) || 0 })} mono />
          <FieldInput label="Prompt" value={stage.prompt} onChange={(v) => onUpdate({ prompt: v })} mono placeholder="es: U-Boot>" />
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Lines ({stage.lines.length})</label>
            <textarea
              value={stage.lines.join('\n')}
              onChange={(e) => onUpdate({ lines: e.target.value.split('\n') })}
              rows={4}
              className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-[10px] text-gray-300 font-mono placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
              placeholder="Una riga per linea..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// FILESYSTEM SECTION (tree view)
// ============================================

type FsTreeNode = {
  entry: DraftFilesystemEntry;
  name: string;
  children: FsTreeNode[];
};

function buildFsTree(entries: DraftFilesystemEntry[]): FsTreeNode | null {
  const root = entries.find(e => e.path === '/');
  if (!root) return null;

  const buildChildren = (parentPath: string): FsTreeNode[] =>
    entries
      .filter(e => {
        if (e.path === '/') return false;
        const lastSlash = e.path.lastIndexOf('/');
        const parent = lastSlash === 0 ? '/' : e.path.substring(0, lastSlash);
        return parent === parentPath;
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.path.localeCompare(b.path);
      })
      .map(e => ({
        entry: e,
        name: e.path.substring(e.path.lastIndexOf('/') + 1),
        children: e.type === 'directory' ? buildChildren(e.path) : [],
      }));

  return { entry: root, name: '/', children: buildChildren('/') };
}

const FilesystemSection = () => {
  const { filesystemEntries, activeTabId, setActiveTabId, addFilesystemEntry } = useTerminalSettingsStore();
  const tabEntries = filesystemEntries.filter(f => f.tabId === activeTabId);
  const tree = useMemo(() => buildFsTree(tabEntries), [tabEntries]);

  return (
    <div>
      <TabSelector activeTabId={activeTabId} onSelect={setActiveTabId} />
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs text-gray-400 uppercase tracking-wider">
          Filesystem ({tabEntries.length})
        </h3>
        {!tree && (
          <button
            onClick={() => addFilesystemEntry(activeTabId, 'directory', '/')}
            className="text-gray-400 hover:text-white transition-colors text-xs flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Crea root
          </button>
        )}
      </div>

      {tabEntries.length === 0 ? (
        <p className="text-xs text-gray-500 italic">Filesystem vuoto. Crea prima la directory root.</p>
      ) : tree ? (
        <div className="border border-gray-700 rounded overflow-hidden">
          <FsTreeRow node={tree} depth={0} />
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">Nessuna directory root "/". Aggiungila con il pulsante.</p>
      )}
    </div>
  );
};

const FsTreeRow = ({ node, depth }: { node: FsTreeNode; depth: number }) => {
  const {
    activeTabId, activeFilesystemEntryId,
    addFilesystemEntry, updateFilesystemEntry, deleteFilesystemEntry,
  } = useTerminalSettingsStore();

  const isRoot = node.entry.path === '/';
  const isDir = node.entry.type === 'directory';

  const [expanded, setExpanded] = useState(depth === 0);
  const [editing, setEditing] = useState(() => activeFilesystemEntryId === node.entry.id);

  const indent = 8 + depth * 14;

  const addChild = (type: 'file' | 'directory') => {
    const base = node.entry.path === '/' ? '' : node.entry.path;
    addFilesystemEntry(activeTabId, type, `${base}/${type === 'directory' ? 'new-dir' : 'new-file.txt'}`);
    setExpanded(true);
  };

  return (
    <div>
      {/* Row */}
      <div
        className={cn(
          'flex items-center gap-1 py-1 pr-1 hover:bg-gray-700/40 group',
          editing && 'bg-gray-700/30',
        )}
        style={{ paddingLeft: `${indent}px` }}
      >
        {/* Expand toggle */}
        {isDir ? (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-gray-400 hover:text-gray-200 flex-shrink-0"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}

        {/* Icon */}
        {isDir
          ? <Folder className="h-3 w-3 text-blue-400 flex-shrink-0" />
          : <FileText className="h-3 w-3 text-green-400 flex-shrink-0" />
        }

        {/* Name */}
        <span
          className={cn(
            'text-xs font-mono truncate flex-1 cursor-pointer select-none',
            isDir ? 'text-blue-300' : 'text-green-300',
          )}
          onClick={() => setEditing(v => !v)}
        >
          {node.name}{isDir && !isRoot && '/'}
        </span>

        {/* Badge */}
        <span className="text-[10px] text-gray-500 flex-shrink-0 mr-0.5">
          {isDir ? `${node.children.length}` : `${node.entry.content.length}c`}
        </span>

        {/* Add child — two inline buttons, no dropdown */}
        {isDir && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); addChild('directory'); }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-400 p-0.5 transition-opacity flex-shrink-0"
              title="Nuova cartella"
            >
              <Folder className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); addChild('file'); }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-green-400 p-0.5 transition-opacity flex-shrink-0"
              title="Nuovo file"
            >
              <FileText className="h-3 w-3" />
            </button>
          </>
        )}

        {/* Delete (not root) */}
        {!isRoot && (
          <button
            onClick={(e) => { e.stopPropagation(); deleteFilesystemEntry(node.entry.id); }}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 p-0.5 flex-shrink-0 transition-opacity"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Inline editor */}
      {editing && (
        <div
          className="bg-gray-800/60 border-t border-b border-gray-700/50 py-2 space-y-1.5 pr-2"
          style={{ paddingLeft: `${indent + 20}px` }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Modifica</span>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-green-700/40 hover:bg-green-700/70 text-green-300 transition-colors"
            >
              <Check className="h-3 w-3" />
              Fatto
            </button>
          </div>
          <FieldInput
            label="Path"
            value={node.entry.path}
            onChange={(v) => updateFilesystemEntry(node.entry.id, { path: v })}
            mono
          />
          {!isDir && (
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Contenuto</label>
              <textarea
                value={node.entry.content}
                onChange={(e) => updateFilesystemEntry(node.entry.id, { content: e.target.value })}
                rows={5}
                className="w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-[10px] text-gray-300 font-mono placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
                placeholder="Contenuto del file..."
              />
            </div>
          )}
        </div>
      )}

      {/* Children */}
      {isDir && expanded && node.children.map(child => (
        <FsTreeRow key={child.entry.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
};

// ============================================
// TABS SECTION
// ============================================

const TabsSection = () => {
  const { tabs, addTab, updateTab, deleteTab } = useTerminalSettingsStore();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs text-gray-400 uppercase tracking-wider">
          Tab terminale ({tabs.length})
        </h3>
        <button
          onClick={addTab}
          className="text-gray-400 hover:text-white transition-colors p-0.5"
          title="Aggiungi tab"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {tabs.length === 0 && (
        <p className="text-xs text-gray-500 italic">Nessun tab.</p>
      )}

      <div className="space-y-2">
        {tabs.map((tab, i) => (
          <TabItem
            key={tab.id}
            tab={tab}
            index={i}
            onUpdate={(data) => updateTab(tab.id, data)}
            onDelete={() => deleteTab(tab.id)}
          />
        ))}
      </div>
    </div>
  );
};

const TabItem = ({
  tab, index, onUpdate, onDelete,
}: {
  tab: DraftTab;
  index: number;
  onUpdate: (data: Partial<DraftTab>) => void;
  onDelete: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');

  const envEntries = Object.entries(tab.environment);

  const handleAddEnv = () => {
    if (!newEnvKey.trim()) return;
    onUpdate({ environment: { ...tab.environment, [newEnvKey]: newEnvVal } });
    setNewEnvKey('');
    setNewEnvVal('');
  };

  const handleRemoveEnv = (key: string) => {
    const env = { ...tab.environment };
    delete env[key];
    onUpdate({ environment: env });
  };

  return (
    <div className="rounded border border-gray-700 bg-gray-800/50">
      <div className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer group" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
        <Layers className="h-3 w-3 text-purple-400 flex-shrink-0" />
        <span className="text-xs truncate flex-1">{tab.name}</span>
        <span className="text-[10px] text-gray-500 font-mono">{tab.id}</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 p-0.5">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {expanded && (
        <div className="px-2 pb-2 space-y-1.5">
          <FieldInput label="ID" value={tab.id} onChange={(v) => onUpdate({ id: v })} mono />
          <FieldInput label="Nome" value={tab.name} onChange={(v) => onUpdate({ name: v })} />
          <FieldInput label="Path iniziale" value={tab.initialPath} onChange={(v) => onUpdate({ initialPath: v })} mono />

          {/* Environment variables */}
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Environment ({envEntries.length})</label>
            <div className="space-y-0.5">
              {envEntries.map(([key, val]) => (
                <div key={key} className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-cyan-400 flex-shrink-0 min-w-[50px]">{key}</span>
                  <span className="text-[10px] text-gray-500">=</span>
                  <input
                    value={val}
                    onChange={(e) => onUpdate({ environment: { ...tab.environment, [key]: e.target.value } })}
                    className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1 py-0.5 text-[10px] text-gray-300 font-mono focus:outline-none focus:border-green-500 min-w-0"
                  />
                  <button onClick={() => handleRemoveEnv(key)} className="text-gray-400 hover:text-red-400 p-0.5 flex-shrink-0">
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <input
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                placeholder="KEY"
                className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1 py-0.5 text-[10px] text-gray-300 font-mono focus:outline-none focus:border-green-500 min-w-0"
              />
              <span className="text-[10px] text-gray-500">=</span>
              <input
                value={newEnvVal}
                onChange={(e) => setNewEnvVal(e.target.value)}
                placeholder="value"
                className="flex-1 bg-gray-700/50 border border-gray-600 rounded px-1 py-0.5 text-[10px] text-gray-300 font-mono focus:outline-none focus:border-green-500 min-w-0"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddEnv(); }}
              />
              <button onClick={handleAddEnv} className="text-gray-400 hover:text-green-400 p-0.5 flex-shrink-0">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// SHARED: Field Input
// ============================================

export const FieldInput = ({
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
        'w-full bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500',
        mono && 'font-mono'
      )}
    />
  </div>
);

export default TerminalSettingsPanel;
