// src/components/features/settings/PresetSelector.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { usePresetStore } from '@/store/presetStore';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { ChevronDown, Save, RefreshCw, Settings2 } from 'lucide-react';
import PresetSaveDialog from './PresetSaveDialog';
import PresetManageDialog from './PresetManageDialog';

const PresetSelector = () => {
  const presets = usePresetStore(s => s.presets);
  const activePresetId = usePresetStore(s => s.activePresetId);
  const isDirty = usePresetStore(s => s.isDirty);
  const isLoading = usePresetStore(s => s.isLoading);
  const loadPreset = usePresetStore(s => s.loadPreset);
  const updatePreset = usePresetStore(s => s.updatePreset);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [unsavedWarning, setUnsavedWarning] = useState<string | null>(null); // target preset id
  const [updateFeedback, setUpdateFeedback] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const activePreset = presets.find(p => p.id === activePresetId);

  const handleSelectPreset = (id: string) => {
    setDropdownOpen(false);
    if (id === activePresetId) return;

    if (isDirty && activePresetId) {
      setUnsavedWarning(id);
    } else {
      loadPreset(id);
    }
  };

  const handleLoadFromManage = (id: string) => {
    if (isDirty && activePresetId) {
      setUnsavedWarning(id);
    } else {
      loadPreset(id);
    }
  };

  const handleConfirmSwitch = async (saveFirst: boolean) => {
    const targetId = unsavedWarning;
    setUnsavedWarning(null);

    if (saveFirst && activePresetId) {
      await updatePreset(activePresetId);
    }

    if (targetId) {
      await loadPreset(targetId);
    }
  };

  const handleUpdate = async () => {
    if (!activePresetId) return;
    const result = await updatePreset(activePresetId);
    if (result.success) {
      setUpdateFeedback(true);
      setTimeout(() => setUpdateFeedback(false), 2000);
    }
  };

  return (
    <>
      <div className="space-y-2">
        {/* Label */}
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Preset</span>

        {/* Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white hover:border-gray-500 transition-colors"
          >
            <span className="truncate text-left flex-1">
              {activePreset ? (
                <>
                  {activePreset.name}
                  {isDirty && <span className="text-yellow-400 ml-1">*</span>}
                </>
              ) : (
                <span className="text-gray-500">Nessun preset</span>
              )}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 ml-1 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-50 py-1 max-h-[200px] overflow-y-auto">
              {presets.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-500 italic">Nessun preset salvato</p>
              ) : (
                presets.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p.id)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 ${
                      p.id === activePresetId
                        ? 'bg-blue-600/30 text-blue-300'
                        : 'hover:bg-gray-600 text-white'
                    }`}
                  >
                    <span className="truncate flex-1">{p.name}</span>
                    {p.id === activePresetId && (
                      <span className="text-[10px] text-blue-400 flex-shrink-0">attivo</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5">
          <Button
            onClick={() => setSaveDialogOpen(true)}
            size="sm"
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 text-xs px-2"
          >
            <Save className="h-3 w-3 mr-1" />
            Salva come...
          </Button>
          {activePresetId && (
            <Button
              onClick={handleUpdate}
              size="sm"
              disabled={!isDirty || isLoading}
              className={`text-xs px-2 transition-colors ${
                isDirty
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600'
              }`}
              title={isDirty ? 'Salva le modifiche nel preset attivo' : 'Nessuna modifica da salvare'}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {updateFeedback ? 'OK!' : 'Aggiorna'}
            </Button>
          )}
          <Button
            onClick={() => setManageDialogOpen(true)}
            size="sm"
            variant="outline"
            className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 text-xs px-2"
          >
            <Settings2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Save dialog */}
      <PresetSaveDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} />

      {/* Manage dialog */}
      <PresetManageDialog
        open={manageDialogOpen}
        onOpenChange={setManageDialogOpen}
        onLoadPreset={handleLoadFromManage}
      />

      {/* Unsaved changes warning */}
      <AlertDialog open={!!unsavedWarning} onOpenChange={(open) => { if (!open) setUnsavedWarning(null); }}>
        <AlertDialogContent className="bg-gray-800 border-gray-600 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Modifiche non salvate</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Hai modifiche non salvate nel preset corrente. Cosa vuoi fare?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirmSwitch(false)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Continua senza salvare
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleConfirmSwitch(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Salva e carica
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PresetSelector;
