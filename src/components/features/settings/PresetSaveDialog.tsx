// src/components/features/settings/PresetSaveDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePresetStore } from '@/store/presetStore';
import { Check, Loader2 } from 'lucide-react';

interface PresetSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PresetSaveDialog = ({ open, onOpenChange }: PresetSaveDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const saveAsNewPreset = usePresetStore(s => s.saveAsNewPreset);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Il nome è obbligatorio');
      return;
    }

    setSaving(true);
    setError('');

    const result = await saveAsNewPreset(name.trim(), description.trim());

    setSaving(false);

    if (result.success) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setName('');
        setDescription('');
        onOpenChange(false);
      }, 1000);
    } else {
      setError(result.error || 'Errore durante il salvataggio');
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setError('');
      setSaved(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-600 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salva come preset</DialogTitle>
          <DialogDescription className="text-gray-400">
            Salva la configurazione corrente come preset riutilizzabile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Nome *</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Es. Challenge UART Base"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleSave(); }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Descrizione</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrizione opzionale..."
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
          >
            Annulla
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || saved || !name.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : saved ? <Check className="h-4 w-4 mr-1" /> : null}
            {saved ? 'Salvato!' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PresetSaveDialog;
