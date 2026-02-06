// src/components/features/settings/SettingsSidebar.tsx
'use client';

import { useState } from 'react';
import { useSettingsStore, type SettingsTool, type DraftComponent, type DraftPin } from '@/store/settingsStore';
import { cn } from '@/lib/utils';
import { BoxSelect, MapPin, Pencil, Trash2, Download, Copy, Check, Upload } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

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

const SettingsSidebar = () => {
  const {
    activeTool, setActiveTool,
    components, pins,
    editComponent, deleteComponent,
    editPin, deletePin,
    exportAsJson, exportAsTypeScript, applyConfig,
  } = useSettingsStore();

  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

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

  const tools: { id: SettingsTool; label: string; icon: typeof BoxSelect }[] = [
    { id: 'component', label: 'Componente', icon: BoxSelect },
    { id: 'pin', label: 'Pin', icon: MapPin },
  ];

  return (
    <aside className="flex flex-col gap-y-4 rounded-lg bg-gray-800 p-4 w-64 text-white">
      {/* Tool selector */}
      <div>
        <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Strumento</h3>
        <div className="flex gap-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors flex-1',
                activeTool === tool.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
              )}
            >
              <tool.icon className="h-4 w-4" />
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved items list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Components */}
        <div className="mb-4">
          <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">
            Componenti ({components.length})
          </h3>
          {components.length === 0 && (
            <p className="text-xs text-gray-500 italic">Nessun componente. Trascina sull&apos;immagine per crearne uno.</p>
          )}
          <div className="space-y-1">
            {components.map(comp => (
              <ComponentItem key={comp.id} component={comp} onEdit={editComponent} onDelete={deleteComponent} />
            ))}
          </div>
        </div>

        {/* Pins */}
        <div>
          <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">
            Pin ({pins.length})
          </h3>
          {pins.length === 0 && (
            <p className="text-xs text-gray-500 italic">Nessun pin. Clicca sull&apos;immagine per posizionarne uno.</p>
          )}
          <div className="space-y-1">
            {pins.map(pin => (
              <PinItem key={pin.id} pin={pin} onEdit={editPin} onDelete={deletePin} />
            ))}
          </div>
        </div>
      </div>

      {/* Apply & Export buttons */}
      <div className="pt-3 border-t border-gray-700 space-y-2">
        <Button
          onClick={() => {
            applyConfig();
            setApplied(true);
            setTimeout(() => setApplied(false), 2000);
          }}
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          disabled={components.length === 0 && pins.length === 0}
        >
          {applied ? <Check className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          {applied ? 'Configurazione applicata!' : 'Applica al simulatore'}
        </Button>
        <Button
          onClick={handleDownloadJson}
          variant="outline"
          size="sm"
          className="w-full border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
          disabled={components.length === 0 && pins.length === 0}
        >
          <Download className="h-4 w-4 mr-2" /> Download JSON
        </Button>
        <Button
          onClick={handleCopyTypeScript}
          variant="outline"
          size="sm"
          className="w-full border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
          disabled={components.length === 0 && pins.length === 0}
        >
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? 'Copiato!' : 'Copia TypeScript'}
        </Button>
      </div>
    </aside>
  );
};

// --- Sub-components ---

const ComponentItem = ({
  component,
  onEdit,
  onDelete,
}: {
  component: DraftComponent;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) => (
  <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 group">
    <div className="w-4 h-3 rounded-sm bg-blue-500/30 border border-blue-400/60 flex-shrink-0" />
    <span className="text-sm truncate flex-1">{component.name || 'Senza nome'}</span>
    <button onClick={() => onEdit(component.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white p-0.5">
      <Pencil className="h-3.5 w-3.5" />
    </button>
    <DeleteButton name={component.name || 'questo componente'} onConfirm={() => onDelete(component.id)} />
  </div>
);

const PinItem = ({
  pin,
  onEdit,
  onDelete,
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

const DeleteButton = ({ name, onConfirm }: { name: string; onConfirm: () => void }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 p-0.5">
        <Trash2 className="h-3.5 w-3.5" />
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
